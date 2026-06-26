import { useState, useEffect } from 'react';
import { api } from '../../../api/axios';
import { 
  FiSearch, FiLoader, FiAlertCircle, FiRefreshCcw, 
  FiActivity, FiKey, FiUsers, FiClock, FiMail, FiCheck, FiX
} from 'react-icons/fi';

const ActiveUsers = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const fetchReportData = async (tab, showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const endpoint = tab === 'login' ? '/admin/login-report' : '/admin/password-setup-report';
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let fetchedData = [];
      if (Array.isArray(response.data)) {
        fetchedData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        fetchedData = response.data.data || response.data.users || response.data.reports || [];
      }
      
      setReportData(fetchedData);
    } catch (err) {
      console.error(`Fetch error for tab ${tab}:`, err);
      setError(err.response?.data?.message || 'Failed to load report data.');
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchReportData(activeTab, true);
    setCurrentPage(1);

    const intervalId = setInterval(() => {
      fetchReportData(activeTab, false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Derived Stats
  // Login Tab Stats
  const totalActiveUsers = reportData.length;
  const totalLogins = reportData.reduce((sum, user) => sum + (Number(user.loginCount) || 0), 0);
  const mostActiveUser = reportData.length > 0 && activeTab === 'login'
    ? [...reportData].sort((a, b) => (Number(b.loginCount) || 0) - (Number(a.loginCount) || 0))[0]
    : null;

  // Password Setup Tab Stats
  const totalChecked = reportData.length;
  const notSentCount = reportData.filter(u => u.passwordSetupStatus === 'not_sent').length;
  const sentOrCompletedCount = reportData.length - notSentCount;

  // Filtering Logic
  const filteredData = reportData.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const basicMatch = (
      item.name?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.phone?.includes(query) ||
      item.userId?.toLowerCase().includes(query) ||
      item.businessType?.toLowerCase().includes(query)
    );
    
    if (activeTab === 'login') {
      return basicMatch || item.lastLoginMethod?.toLowerCase().includes(query);
    } else {
      return basicMatch || item.passwordSetupStatus?.toLowerCase().includes(query);
    }
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * usersPerPage;
  const indexOfFirstItem = indexOfLastItem - usersPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / usersPerPage);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">
      {/* Glassmorphism Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiActivity className="text-blue-400" />
            Users Activity Reports
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Track user login activities, session frequencies, and security setup reports.
          </p>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
            />
          </div>
          <button 
            onClick={() => fetchReportData(activeTab)}
            disabled={loading}
            className="p-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Refresh Report Data"
          >
            <FiRefreshCcw className={`${loading ? 'animate-spin' : ''} text-lg`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6">
        <button
          onClick={() => setActiveTab('login')}
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'login' 
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Login Report
        </button>
        <button
          onClick={() => setActiveTab('password-setup')}
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'password-setup' 
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Password Setup Report
        </button>
      </div>

      {/* Stats Cards Section */}
      {activeTab === 'login' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Active Users Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Users</p>
              <p className="text-3xl font-bold text-white tracking-tight">{totalActiveUsers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shadow-inner">
              <FiUsers />
            </div>
          </div>

          {/* Total Logins Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Login Activity</p>
              <p className="text-3xl font-bold text-white tracking-tight">{totalLogins}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <FiKey />
            </div>
          </div>

          {/* Most Engaged User Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Active User</p>
              <p className="text-lg font-bold text-white truncate max-w-50">
                {mostActiveUser ? mostActiveUser.name : 'N/A'}
              </p>
              {mostActiveUser && (
                <p className="text-xs font-medium text-slate-400">
                  Logins: <span className="text-blue-400 font-bold">{mostActiveUser.loginCount}</span>
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner">
              <FiClock />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Checked Users Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Accounts Checked</p>
              <p className="text-3xl font-bold text-white tracking-tight">{totalChecked}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shadow-inner">
              <FiUsers />
            </div>
          </div>

          {/* Total Pending Setup Links Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Setup Not Sent</p>
              <p className="text-3xl font-bold text-red-400 tracking-tight">{notSentCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl shadow-inner">
              <FiMail />
            </div>
          </div>

          {/* Setup Links Sent Card */}
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed / Link Sent</p>
              <p className="text-3xl font-bold text-emerald-400 tracking-tight">
                {reportData.filter(u => u.passwordSetupStatus !== 'not_sent' && u.passwordSetupStatus !== 'sent').length} / {sentOrCompletedCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shadow-inner">
              <FiCheck />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-2xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading report records...</p>
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
                {activeTab === 'login' ? (
                  <tr className="border-b border-white/10 text-xs text-center uppercase tracking-wider text-slate-400">
                    <th className="p-4 font-bold text-center">S.No</th>
                    <th className="p-4 font-bold">User ID</th>
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Phone</th>
                    <th className="p-4 font-bold">Business</th>
                    <th className="p-4 font-bold">Last Login At</th>
                    <th className="p-4 font-bold">Method</th>
                    <th className="p-4 font-bold text-center">Logins</th>
                  </tr>
                ) : (
                  <tr className="border-b border-white/10 text-xs text-center uppercase tracking-wider text-slate-400">
                    <th className="p-4 font-bold text-center">S.No</th>
                    <th className="p-4 font-bold">User ID</th>
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Phone</th>
                    <th className="p-4 font-bold">Business</th>
                    <th className="p-4 font-bold text-center">Setup Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-white/5 transition-colors text-center">
                      <td className="p-4 text-sm text-slate-400 font-medium">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="p-4 text-sm text-emerald-400 font-mono font-semibold">
                        {item.userId || 'N/A'}
                      </td>
                      <td className="p-4 text-sm text-white font-medium text-left">
                        {item.name}
                      </td>
                      <td className="p-4 text-sm text-slate-300 text-left">
                        {item.email}
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        {item.phone || 'N/A'}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="bg-slate-700/50 border border-slate-600/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                          {item.businessType || 'L1'}
                        </span>
                      </td>
                      
                      {activeTab === 'login' ? (
                        <>
                          <td className="p-4 text-sm text-slate-300">
                            {formatDateTime(item.lastLoginAt)}
                          </td>
                          <td className="p-4 text-sm">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 capitalize">
                              {item.lastLoginMethod || 'password'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold border border-white/5">
                              {item.loginCount || 0}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td className="p-4 text-sm text-center">
                          {item.passwordSetupStatus === 'not_sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                              <FiX className="text-[10px]" /> Not Sent
                            </span>
                          ) : item.passwordSetupStatus === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                              <FiMail className="text-[10px]" /> Link Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                              <FiCheck className="text-[10px]" /> {item.passwordSetupStatus || 'Completed'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'login' ? 9 : 7} className="p-12 text-center text-slate-400 italic">
                      {searchQuery ? 'No matching reports found.' : 'No reports found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="relative z-10 flex flex-col md:flex-row justify-end items-center gap-4 bg-transparent backdrop-blur-2xl shadow-lg shadow-black/20 p-4 rounded-2xl border border-white/10 isolate">
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-transparent border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold cursor-pointer"
            >
              Previous
            </button>
            <div className="flex gap-1 mx-1 sm:mx-2 items-center">
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
                    className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
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
              className="px-4 py-2 bg-transparent border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsers;
