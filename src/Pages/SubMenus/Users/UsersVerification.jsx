import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiCheck, FiX, FiEye, FiLoader, FiAlertCircle, 
  FiSearch, FiUser, FiFileText 
} from 'react-icons/fi';

const UsersVerification = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await api.get('/admin/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Safely handle cases where the backend might wrap the array in an object (e.g., response.data.data)
      let fetchedUsers = [];
      if (Array.isArray(response.data)) {
        fetchedUsers = response.data;
      } else if (response.data && typeof response.data === 'object') {
        fetchedUsers = response.data.data || response.data.users || response.data.pending || [];
      }
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Approve KYC
  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this user KYC and generate their User ID?')) return;
    setIsActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // 1. Approve the user's KYC
      await api.put(`/admin/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 2. Automatically generate their User ID
      await api.put(`/admin/generate-userid/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      if (selectedUser && selectedUser._id === id) closeModal();
      alert('User approved and ID generated successfully! They have been moved to the Approved Customers list.');
    } catch (err) {
      console.error('Approve error:', err);
      alert(err.response?.data?.message || 'Failed to approve user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject KYC
  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this KYC? This action cannot be undone.')) return;
    setIsActionLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await api.delete(`/admin/reject/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      if (selectedUser && selectedUser._id === id) closeModal();
      alert('User KYC rejected. They have been moved to the Rejected KYC list.');
    } catch (err) {
      console.error('Reject error:', err);
      alert(err.response?.data?.message || 'Failed to reject user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const getDocumentUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true; // If no search, return all users regardless of missing fields
    return user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.phone?.includes(searchQuery);
  });

  return (
    <div className="space-y-6 relative">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiUser className="text-amber-400" />
            KYC Verification
          </h1>
          <p className="text-slate-400 font-medium mt-1">Approve or reject pending KYC applications.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white placeholder-slate-500 text-sm font-medium"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-2xl">
          <FiLoader className="animate-spin text-3xl text-amber-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading pending applications...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      ) : (
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar touch-pan-x">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-5 font-bold">S.No</th>
                  <th className="p-5 font-bold">Name</th>
                  <th className="p-5 font-bold">Email</th>
                  <th className="p-5 font-bold">Phone</th>
                  <th className="p-5 font-bold">Business Type</th>
                  <th className="p-5 font-bold">Status</th>
                  <th className="p-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                      <td className="p-5 text-sm text-slate-400 font-medium">{index + 1}</td>
                      <td className="p-5 text-sm text-white font-medium">{user.name}</td>
                      <td className="p-5 text-sm text-slate-300">{user.email}</td>
                      <td className="p-5 text-sm text-slate-300">{user.phone || 'N/A'}</td>
                      <td className="p-5 text-sm">
                        <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                          {user.businessType || 'L1'}
                        </span>
                      </td>
                      <td className="p-5 text-sm">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                          <FiLoader className="animate-spin text-[10px]" /> Pending
                        </span>
                      </td>
                      <td className="p-5 flex items-center justify-center gap-2">
                        <button onClick={() => openModal(user)} className="p-2.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all" title="View Full Details">
                          <FiEye />
                        </button>
                        <button onClick={() => handleApprove(user._id)} disabled={isActionLoading} className="p-2.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all disabled:opacity-50" title="Approve & Generate ID">
                          <FiCheck strokeWidth={3} />
                        </button>
                        <button onClick={() => handleReject(user._id)} disabled={isActionLoading} className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50" title="Reject KYC">
                          <FiX strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No matching pending users found.' : 'No pending approvals at the moment.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {isModalOpen && selectedUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FiUser className="text-amber-400" /> Pending KYC Details
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-5 space-y-4">
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

               <p className="text-amber-400 font-medium italic bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2 text-sm">
                 <FiLoader className="animate-spin" /> User is awaiting KYC verification by an administrator.
               </p>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 pb-4 px-5 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-slate-800/30 shrink-0">
              <button onClick={() => handleReject(selectedUser._id)} disabled={isActionLoading} className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50">
                Reject KYC
              </button>
              <button onClick={() => handleApprove(selectedUser._id)} disabled={isActionLoading} className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
                {isActionLoading ? <FiLoader className="mr-2 animate-spin" /> : <FiCheck className="mr-2 text-lg" />}
                {isActionLoading ? 'Processing...' : 'Approve & Generate ID'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default UsersVerification;