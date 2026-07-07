import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiCheck, FiEye, FiLoader, FiAlertCircle, 
  FiSearch, FiUser, FiFileText, FiRefreshCcw, FiTrash2, FiUserMinus
} from 'react-icons/fi';
import { useOutletContext, useNavigate } from 'react-router-dom';

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Not Active';
  const str = String(dateString).trim().toLowerCase();
  if (str === 'null' || str === 'undefined' || str === '' || str === 'not active') return 'Not Active';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime()) || date.getTime() === 0) return 'Not Active';
  
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'Just now';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const checkAppStatus = (u) => {
  if (!u.installedAt && !u.uninstalledAt) {
    if (u.isAppInstalled) return 'installed';
    return 'pending';
  }
  const instTime = u.installedAt ? new Date(u.installedAt).getTime() : 0;
  const uninstTime = u.uninstalledAt ? new Date(u.uninstalledAt).getTime() : 0;
  if (instTime > uninstTime) return 'installed';
  if (uninstTime > instTime) return 'uninstalled';
  return 'pending';
};

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loggedInEmails, setLoggedInEmails] = useState(new Set());

  const navigate = useNavigate();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');

  const triggerDelete = (id) => {
    setDeletingUserId(id);
    setDeletionReason('Uploaded GST certificate PDF is expired. Please upload the latest active certificate.');
  };

  const hasLoggedIn = (user) => {
    return (user.email && loggedInEmails.has(user.email.toLowerCase())) ||
           (user.userId && loggedInEmails.has(user.userId.toLowerCase()));
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const { setUsersUnreadCount } = useOutletContext() || {};

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchUsers = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      
      // Fetch all processed users, pending users, active login reports, and activity stats concurrently
      const [customersResponse, pendingResponse, loginReportResponse, activityStatsResponse] = await Promise.all([
        api.get('/admin/customers', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/admin/pending', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        api.get('/admin/login-report', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        api.get('/activity/stats', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { users: [] } }))
      ]);
      
      // Safely handle cases where the backend might wrap the array in an object
      let allUsers = [];
      if (Array.isArray(customersResponse.data)) {
        allUsers = customersResponse.data;
      } else if (customersResponse.data && typeof customersResponse.data === 'object') {
        allUsers = customersResponse.data.data || customersResponse.data.users || customersResponse.data.customers || [];
      }

      // Merge dynamic lastActive from activity stats users list
      let actUsers = [];
      if (activityStatsResponse.data && Array.isArray(activityStatsResponse.data.users)) {
        actUsers = activityStatsResponse.data.users;
      } else if (Array.isArray(activityStatsResponse.data)) {
        actUsers = activityStatsResponse.data;
      }
      
      allUsers = allUsers.map(u => {
        const match = actUsers.find(au => au.userId === u._id || (au.email && u.email && au.email.toLowerCase() === u.email.toLowerCase()));
        return {
          ...u,
          lastActive: match ? match.lastActive : u.lastActive
        };
      });

      // Handle active login reports
      let loginReportList = [];
      if (Array.isArray(loginReportResponse.data)) {
        loginReportList = loginReportResponse.data;
      } else if (loginReportResponse.data && typeof loginReportResponse.data === 'object') {
        loginReportList = loginReportResponse.data.data || loginReportResponse.data.users || loginReportResponse.data.reports || [];
      }

      const loggedInSet = new Set();
      loginReportList.forEach(r => {
        if (r.email) loggedInSet.add(r.email.toLowerCase());
        if (r.userId) loggedInSet.add(r.userId.toLowerCase());
      });
      setLoggedInEmails(loggedInSet);

      // Extract pending users to filter them out from the rejected list
      let pendingUsers = [];
      if (Array.isArray(pendingResponse.data)) {
        pendingUsers = pendingResponse.data;
      } else if (pendingResponse.data && typeof pendingResponse.data === 'object') {
        pendingUsers = pendingResponse.data.data || pendingResponse.data.users || pendingResponse.data.pending || [];
      }
      const pendingIds = new Set(pendingUsers.map(user => user._id));
      
      setUsers(allUsers.filter(user => user.isApproved === true || !!user.userId));

      // Clear the notification badge once data is viewed
      if (setUsersUnreadCount) {
        setUsersUnreadCount(0);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      if (!isPoll) {
        setError(err.response?.data?.message || 'Failed to load users data.');
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(false);

    // Setup polling every 5 seconds to keep activity status in sync
    const intervalId = setInterval(() => {
      fetchUsers(true);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);



  // // Undo Rejection
  // const handleUndoReject = async (id) => {
  //   if (!window.confirm('Are you sure you want to restore this user to the pending KYC list?')) return;
  //   setIsActionLoading(true);
  //   try {
  //     // Note: Adjust the endpoint below to match your backend route for undoing rejections
  //     await api.put(`/admin/undo-reject/${id}`);
  //     setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
  //     if (selectedUser && selectedUser._id === id) closeModal();
  //     alert('User restored successfully! They have been moved to the Pending KYC list.');
  //   } catch (err) {
  //     console.error('Undo reject error:', err);
  //     alert(err.response?.data?.message || 'Failed to restore user.');
  //   } finally {
  //     setIsActionLoading(false);
  //   }
  // };

  // Delete User
  const handleDelete = async (id, reasonText) => {
    if (!reasonText || !reasonText.trim()) {
      alert('A deletion reason is required.');
      return;
    }

    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      // Note: Adjust the endpoint below to match your backend route for deleting users
      await api.delete(`/admin/reject/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: reasonText }
      });
      
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      setDeletingUserId(null);
      setDeletionReason('');
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

  const filteredUsers = users.filter(user => {
    const nameMatch = user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = user.phone?.includes(searchQuery);
    const userIdMatch = user.userId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const onlineText = user.isOnline ? 'online' : 'offline';
    const onlineMatch = onlineText.includes(searchQuery.toLowerCase());
    
    const appVersionMatch = user.appVersion?.toLowerCase().includes(searchQuery.toLowerCase());
    const loginMethodMatch = user.lastLoginMethod?.toLowerCase().includes(searchQuery.toLowerCase());

    return nameMatch || emailMatch || phoneMatch || userIdMatch || onlineMatch || appVersionMatch || loginMethodMatch;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  console.log(users)
  
  return (
    <div className="relative space-y-4 min-h-full z-0 isolate w-full">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiUser className="text-blue-400" />
            Users List
          </h1>
          <p className="text-slate-400 font-medium mt-1">View your registered and approved users.</p>
        </div>

        <div className="relative w-full md:w-72">
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
          <p className="text-slate-400 font-medium">Loading customers...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      ) : (
        <div className="relative z-10 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full isolate will-change-transform">
          <div className="overflow-auto custom-scrollbar max-h-[70vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                <tr className="border-b border-white/10 text-xs text-center uppercase tracking-wider text-slate-400">
                  <th className="p-2 font-bold">S.No</th>
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold">Business Type</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">Activity & Logins</th>
                  <th className="p-4 font-bold">User ID</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user, index) => (
                    <tr key={user._id} className="hover:bg-transparent transition-colors">
                      <td className="p-2 text-sm text-slate-400 text-center font-medium">{indexOfFirstUser + index + 1}</td>
                      <td className="p-4 text-sm text-white font-medium">
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {checkAppStatus(user) === 'uninstalled' ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-extrabold border border-rose-500/20 shrink-0">
                                Uninstalled
                              </span>
                            ) : checkAppStatus(user) === 'installed' ? (
                              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[9px] font-extrabold border border-teal-500/20 shrink-0">
                                Installed
                              </span>
                            ) : null}
                          </div>
                          {user.appVersion && (
                            <span className="block text-[10px] text-slate-500 font-bold mt-0.5">
                              App v{user.appVersion}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{user.email}</td>
                      <td className="p-4 text-sm text-slate-300">{user.phone || 'N/A'}</td>
                      <td className="p-4 text-sm text-center">
                        <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                          {user.businessType || 'L1'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          <FiCheck className="text-[10px]" /> Approved
                        </span>
                      </td>
                      <td className="p-4 text-sm text-center">
                        <div className="flex flex-col items-center gap-1">
                          {user.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 border border-white/5 text-slate-400 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Offline
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium" title={`Raw lastActive: ${user.lastActive}`}>
                            Active: {formatRelativeTime(user.lastActive)}
                          </span>
                          {console.log(`[DEBUG UsersList] User: ${user.name}, lastActive: ${user.lastActive}, type: ${typeof user.lastActive}`)}
                          {user.loginCount > 0 && (
                            <span className="text-[9px] text-blue-400 font-bold bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10 block mt-0.5">
                              {user.loginCount} logins
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-emerald-400 font-mono font-semibold">{user.userId || 'N/A'}</td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        <button onClick={() => navigate(`/users/list/${user._id}`)} className="p-2.5 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer transform-gpu" title="View Full Details">
                          <FiEye />
                        </button>
                        <button 
                          onClick={() => triggerDelete(user._id)} 
                          disabled={isActionLoading} 
                          className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer transform-gpu" 
                          title="Permanently Delete User"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No matching users found.' : `No approved customers found.`}
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
        <div className="relative z-10 flex flex-col md:flex-row justify-end items-center gap-4 bg-transparent backdrop-blur-2xl shadow-lg shadow-black/20 p-4 rounded-2xl border border-white/10 isolate will-change-transform">
          {/* <p className="text-slate-400 text-sm">
            Showing <span className="text-white font-bold">{indexOfFirstUser + 1}</span> to <span className="text-white font-bold">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of <span className="text-white font-bold">{filteredUsers.length}</span> entries
          </p> */}
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-transparent border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transform-gpu"
            >
              Previous
            </button>
            <div className="flex gap-1 mx-1 sm:mx-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 items-center">
              {(() => {
                const pageNumbers = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
                } else {
                  if (currentPage <= 4) {
                    for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                    pageNumbers.push('...');
                    pageNumbers.push(totalPages);
                  } else if (currentPage >= totalPages - 3) {
                    pageNumbers.push(1);
                    pageNumbers.push('...');
                    for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
                  } else {
                    pageNumbers.push(1);
                    pageNumbers.push('...');
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                    pageNumbers.push('...');
                    pageNumbers.push(totalPages);
                  }
                }
                return pageNumbers.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (page !== '...') setCurrentPage(page);
                    }}
                    disabled={page === '...'}
                  className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors shrink-0 transform-gpu ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : page === '...'
                        ? 'bg-transparent text-slate-500 border-transparent cursor-default'
                        : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    {page}
                  </button>
                ));
              })()}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 bg-transparent border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transform-gpu"
            >
              Next
            </button>
          </div>
        </div>
      )}



      {/* Delete User Reason Popup Modal */}
      {deletingUserId && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => { setDeletingUserId(null); setDeletionReason(''); }}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiUserMinus className="text-red-400" /> Delete User Account
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-medium font-sans">Please provide a reason to notify the customer about their account deletion.</p>
            
            <textarea
              required
              rows="4"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Provide a detailed reason..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-white text-sm"
            ></textarea>
            
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => { setDeletingUserId(null); setDeletionReason(''); }}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingUserId, deletionReason)}
                disabled={isActionLoading || !deletionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionLoading ? <FiLoader className="animate-spin text-xs" /> : <FiTrash2 size={14} />} Confirm Delete
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default UsersList;