import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiCheck, FiX, FiEye, FiLoader, FiAlertCircle, 
  FiSearch, FiUser, FiFileText, FiRefreshCcw, FiTrash2
} from 'react-icons/fi';

const UsersList = () => {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'rejected'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      // Fetch all processed users from the same API
      const response = await api.get('/admin/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Safely handle cases where the backend might wrap the array in an object
      let allUsers = [];
      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data && typeof response.data === 'object') {
        allUsers = response.data.data || response.data.users || response.data.customers || [];
      }
      
      // Filter locally based on the approval status OR the presence of a generated userId
      if (activeTab === 'customers') {
        setUsers(allUsers.filter(user => user.isApproved === true || !!user.userId));
      } else if (activeTab === 'rejected') {
        setUsers(allUsers.filter(user => user.isApproved === false && !user.userId));
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || 'Failed to load users data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Undo Rejection
  const handleUndoReject = async (id) => {
    if (!window.confirm('Are you sure you want to restore this user to the pending KYC list?')) return;
    setIsActionLoading(true);
    try {
      // Note: Adjust the endpoint below to match your backend route for undoing rejections
      await api.put(`/admin/undo-reject/${id}`);
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      if (selectedUser && selectedUser._id === id) closeModal();
      alert('User restored successfully! They have been moved to the Pending KYC list.');
    } catch (err) {
      console.error('Undo reject error:', err);
      alert(err.response?.data?.message || 'Failed to restore user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete User
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    setIsActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Note: Adjust the endpoint below to match your backend route for deleting users
      await api.delete(`/admin/reject/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      if (selectedUser && selectedUser._id === id) closeModal();
      alert('User deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getDocumentUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery) ||
    user.userId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // console.log(users)
  
  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiUser className="text-blue-400" />
            Users List
          </h1>
          <p className="text-slate-400 font-medium mt-1">View your registered customers and rejected KYC applications.</p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 backdrop-blur-2xl shadow-lg shadow-black/20 p-4 rounded-2xl border border-white/10">
        <div className="flex space-x-2 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('customers')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            Approved Customers
          </button>
          <button 
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${activeTab === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            Rejected KYC
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-2xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading {activeTab === 'customers' ? 'customers' : 'rejected applications'}...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      ) : (
        <div className="relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar touch-pan-x">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-2 font-bold">S.No</th>
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold">Business Type</th>
                  <th className="p-4 font-bold">Status</th>
                  {activeTab === 'customers' && <th className="p-5 font-bold">User ID</th>}
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user, index) => (
                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-5 text-sm text-slate-400 font-medium">{indexOfFirstUser + index + 1}</td>
                      <td className="p-5 text-sm text-white font-medium">{user.name}</td>
                      <td className="p-5 text-sm text-slate-300">{user.email}</td>
                      <td className="p-5 text-sm text-slate-300">{user.phone || 'N/A'}</td>
                      <td className="p-5 text-sm">
                        <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                          {user.businessType || 'L1'}
                        </span>
                      </td>
                      <td className="p-5 text-sm">
                        {activeTab === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                            <FiX className="text-[10px]" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <FiCheck className="text-[10px]" /> Approved
                          </span>
                        )}
                      </td>
                      {activeTab === 'customers' && (
                        <td className="p-5 text-sm text-emerald-400 font-mono font-semibold">{user.userId || 'N/A'}</td>
                      )}
                      <td className="p-5 flex items-center justify-center gap-2">
                        <button onClick={() => openModal(user)} className="p-2.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer" title="View Full Details">
                          <FiEye />
                        </button>
                        {activeTab === 'rejected' && (
                          <>
                            <button 
                              onClick={() => handleUndoReject(user._id)} 
                              disabled={isActionLoading} 
                              className="p-2.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer" 
                              title="Undo Rejection & Move to Pending"
                            >
                              <FiRefreshCcw />
                            </button>
                            <button 
                              onClick={() => handleDelete(user._id)} 
                              disabled={isActionLoading} 
                              className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer" 
                              title="Permanently Delete User"
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'customers' ? 8 : 7} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No matching users found.' : `No ${activeTab === 'customers' ? 'approved customers' : 'rejected applications'} found.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && filteredUsers.length > 0 && (
        <div className="relative z-10 flex flex-col md:flex-row justify-end items-center gap-4 bg-white/5 backdrop-blur-2xl shadow-lg shadow-black/20 p-4 rounded-2xl border border-white/10">
          {/* <p className="text-slate-400 text-sm">
            Showing <span className="text-white font-bold">{indexOfFirstUser + 1}</span> to <span className="text-white font-bold">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of <span className="text-white font-bold">{filteredUsers.length}</span> entries
          </p> */}
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
            >
              Previous
            </button>
            <div className="flex items-center px-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-bold">
              Page {currentPage} of {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal (Imported similarly from previous code but without Action controls) */}
      {isModalOpen && selectedUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FiUser className="text-blue-400" /> User Details
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar p-5 space-y-4">
              {/* Status Header */}
              <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  {activeTab === 'rejected' ? (
                    <span className="text-red-400 font-bold flex items-center gap-1.5"><FiX /> KYC Rejected</span>
                  ) : (selectedUser.isApproved || selectedUser.userId) ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5"><FiCheck /> KYC Approved</span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5"><FiLoader className="animate-spin" /> Pending KYC</span>
                  )}
                </div>
                {(selectedUser.isApproved || selectedUser.userId) && selectedUser.userId && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Generated User ID</p>
                    <p className="text-emerald-400 font-mono text-lg font-bold">{selectedUser.userId}</p>
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider border-b border-white/10 pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-white font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-white font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="text-white font-medium">{selectedUser.phone || 'Not Provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</p>
                    <p className="text-white font-medium capitalize">{selectedUser.role || 'customer'}</p>
                  </div>
                </div>
              </div>

              {/* Business / KYC Information */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider border-b border-white/10 pb-2">Business & KYC Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Business Type</p>
                    <span className="bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                      {selectedUser.businessType || 'L1'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">GST Number</p>
                    <p className="text-white font-medium font-mono tracking-wide">{selectedUser.gstNumber || 'Not Provided'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Document</p>
                    {selectedUser.gstDocument ? (
                      <a 
                        href={getDocumentUrl(selectedUser.gstDocument)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 rounded-xl font-medium text-sm transition-all"
                      >
                        <FiFileText className="text-lg" /> View Uploaded Document
                      </a>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-3 bg-white/5 border border-dashed border-white/10 text-slate-500 rounded-xl text-sm italic">
                        <FiFileText className="text-lg" /> No document uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            {activeTab === 'rejected' && (
              <div className="pt-3 pb-4 px-5 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-slate-800/30 shrink-0">
                <button 
                  onClick={() => handleDelete(selectedUser._id)}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-transparent border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <FiTrash2 className="mr-2 text-lg" />
                  Delete User
                </button>
                <button 
                  onClick={() => handleUndoReject(selectedUser._id)}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isActionLoading ? <FiLoader className="mr-2 animate-spin" /> : <FiRefreshCcw className="mr-2 text-lg" />}
                  {isActionLoading ? 'Processing...' : 'Undo Rejection'}
                </button>
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default UsersList;