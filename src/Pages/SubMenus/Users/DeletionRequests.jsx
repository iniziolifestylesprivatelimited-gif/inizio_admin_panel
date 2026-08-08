import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../../api/axios';
import { 
  FiRefreshCw, FiLoader, FiAlertCircle, 
  FiSearch, FiUserMinus, FiX
} from 'react-icons/fi';

import { useConfirm } from '../../../Context/ConfirmationContext';

const DeletionRequests = ({ hideHeader = false, searchQuery: externalSearchQuery, refreshParentCounts }) => {
  const { confirm, showAlert } = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : searchQuery;
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { setUsersDeletionUnreadCount } = useOutletContext() || {};

  const fetchDeletionRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.get('/admin/deletion-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let fetchedUsers = [];
      if (Array.isArray(response.data)) {
        fetchedUsers = response.data;
        console.log(fetchedUsers)
      } else if (response.data && typeof response.data === 'object') {
        fetchedUsers = response.data.users || response.data.data || [];
      }
      setUsers(fetchedUsers);

      if (setUsersDeletionUnreadCount) {
        setUsersDeletionUnreadCount(0);
      }
    } catch (err) {
      console.error('Fetch deletion requests error:', err);
      setError(err.response?.data?.message || 'Failed to load deletion requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletionRequests();
  }, []);

  const handleReactivate = async (userId) => {
    const isConfirmed = await confirm('Are you sure you want to reactivate this user account? All their data will be restored.');
    if (!isConfirmed) return;
    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.put(`/admin/reactivate/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter out reactivated user from UI list
      setUsers((prevUsers) => prevUsers.filter((u) => (u._id !== userId && u.id !== userId)));
      showAlert(response.data.message || 'Account reactivated successfully. All data is restored.', 'success');
      if (refreshParentCounts) refreshParentCounts();
    } catch (err) {
      console.error('Reactivate user error:', err);
      showAlert(err.response?.data?.message || 'Failed to reactivate user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!activeSearchQuery) return true;
    const query = activeSearchQuery.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(query) || false;
    const emailMatch = user.email?.toLowerCase().includes(query) || false;
    const phoneMatch = user.phone?.includes(query) || false;
    const idMatch = (user._id || user.id)?.toLowerCase().includes(query) || false;
    return nameMatch || emailMatch || phoneMatch || idMatch;
  });

  return (
    <div className="space-y-4 relative">


      {/* Header Section */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <FiUserMinus className="text-red-400" />
              Deletion Requests
            </h1>
            <p className="text-slate-400 font-medium mt-1">Manage accounts scheduled for deletion and restore them if requested.</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input 
              type="text" 
              placeholder="Search by ID, name, email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-white placeholder-slate-500 text-sm font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-2xl">
          <FiLoader className="animate-spin text-3xl text-red-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading deletion requests...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg shrink-0" /> {error}
        </div>
      ) : (
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-5 font-bold">S.No</th>
                  <th className="p-5 font-bold">User ID</th>
                  <th className="p-5 font-bold">Name</th>
                  <th className="p-5 font-bold">Email</th>
                  <th className="p-5 font-bold">Phone</th>
                  <th className="p-5 font-bold">Status</th>
                  <th className="p-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const userId = user._id || user.id;
                    return (
                      <tr key={userId} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 text-sm text-slate-400 font-medium">{index + 1}</td>
                        <td className="p-5 text-sm text-blue-300 font-mono font-medium">{userId}</td>
                        <td className="p-5 text-sm text-white font-medium capitalize">{user.name || 'N/A'}</td>
                        <td className="p-5 text-sm text-slate-300">{user.email || 'N/A'}</td>
                        <td className="p-5 text-sm text-slate-300">{user.phone || 'N/A'}</td>
                        <td className="p-5 text-sm">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
                            Pending Deletion
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => handleReactivate(userId)} 
                            disabled={isActionLoading} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl border border-emerald-500/20 hover:border-emerald-500 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reactivate Account"
                          >
                            <FiRefreshCw className={`shrink-0 ${isActionLoading ? 'animate-spin' : ''}`} size={12} /> 
                            Reactivate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No matching deletion requests found.' : 'No pending deletion requests found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletionRequests;
