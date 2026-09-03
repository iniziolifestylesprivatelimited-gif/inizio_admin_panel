import { useState, useEffect, useMemo } from 'react';
import { api } from '../../../api/axios';
import {
  FiSearch, FiRefreshCcw, FiUsers, FiClock, FiActivity, FiKey, FiX, FiLoader, FiMail, FiCheck, FiAlertCircle
} from 'react-icons/fi';
import Card from '../../../Components/Card';
import CustomDropdown from '../../../Components/CustomDropdown';
import GmailLink from '../../../Components/GmailLink';
import { formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';

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

const ActiveUsers = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Table header filters & sort states
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedSetupStatus, setSelectedSetupStatus] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

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

  const handleClearHeaderFilters = () => {
    setSelectedBusinessType('');
    setSelectedMethod('');
    setSelectedSetupStatus('');
    setSortKey('');
    setSortOrder('asc');
  };

  const handleSortChange = (key) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey('');
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    fetchReportData(activeTab, true);
    setCurrentPage(1);
    handleClearHeaderFilters();

    const intervalId = setInterval(() => {
      fetchReportData(activeTab, false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBusinessType, selectedMethod, selectedSetupStatus, sortKey, sortOrder]);

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

  // Distinct Filter Options
  const businessTypeOptions = useMemo(() => {
    const types = Array.from(new Set(reportData.map(u => u.businessType).filter(Boolean))).sort();
    return [
      { value: '', label: 'Business' },
      ...types.map(t => ({ value: t, label: t }))
    ];
  }, [reportData]);

  const methodOptions = useMemo(() => {
    const methods = Array.from(new Set(reportData.map(u => u.lastLoginMethod).filter(Boolean))).sort();
    return [
      { value: '', label: 'Method' },
      ...methods.map(m => ({ value: m, label: m.toUpperCase() }))
    ];
  }, [reportData]);

  const setupStatusOptions = [
    { value: '', label: 'Setup Status' },
    { value: 'not_sent', label: 'Not Sent' },
    { value: 'sent', label: 'Link Sent' },
    { value: 'completed', label: 'Completed' }
  ];

  const hasActiveFilters = Boolean(
    selectedBusinessType || selectedMethod || selectedSetupStatus || sortKey || searchQuery
  );

  // Filtering Logic
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const basicMatch = (
          item.name?.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.phone?.includes(query) ||
          item.userId?.toLowerCase().includes(query) ||
          item.businessType?.toLowerCase().includes(query)
        );

        if (activeTab === 'login') {
          if (!basicMatch && !item.lastLoginMethod?.toLowerCase().includes(query)) return false;
        } else {
          if (!basicMatch && !item.passwordSetupStatus?.toLowerCase().includes(query)) return false;
        }
      }

      // Business Type header filter
      if (selectedBusinessType && item.businessType !== selectedBusinessType) {
        return false;
      }

      // Tab-specific filters
      if (activeTab === 'login') {
        if (selectedMethod && (item.lastLoginMethod || 'password').toLowerCase() !== selectedMethod.toLowerCase()) {
          return false;
        }
      } else {
        if (selectedSetupStatus) {
          const itemStatus = (item.passwordSetupStatus || 'completed').toLowerCase();
          if (selectedSetupStatus === 'completed') {
            if (itemStatus === 'not_sent' || itemStatus === 'sent') return false;
          } else {
            if (itemStatus !== selectedSetupStatus) return false;
          }
        }
      }

      return true;
    });
  }, [reportData, searchQuery, selectedBusinessType, selectedMethod, selectedSetupStatus, activeTab]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const list = [...filteredData];
    list.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === 'lastLoginAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortKey === 'loginCount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredData, sortKey, sortOrder]);

  // Pagination Logic
  const indexOfLastItem = currentPage * usersPerPage;
  const indexOfFirstItem = indexOfLastItem - usersPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / usersPerPage);

  const formatDateTime = (dateStr) => formatDateTimeDDMMYYYY(dateStr);

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">


      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiActivity className="text-blue-400" />
            Login & Setup Reports
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Track user login activities, session frequencies, and security setup reports.
          </p>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
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
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${activeTab === 'login'
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          Login Report
        </button>
        <button
          onClick={() => setActiveTab('password-setup')}
          className={`pb-3 font-bold text-sm transition-all cursor-pointer ${activeTab === 'password-setup'
              ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          Password Setup Report
        </button>
      </div>

      {/* Stats Cards Section */}
      {activeTab === 'login' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 xl:gap-5">
          {[
            {
              title: "Total Active Users",
              value: totalActiveUsers,
              icon: FiUsers,
              color: "text-blue-400",
              bg: "bg-blue-500/20",
              fromColor: "from-blue-500/25",
              hoverBorder: "hover:border-blue-500/30"
            },
            {
              title: "Total Login Activity",
              value: totalLogins,
              icon: FiKey,
              color: "text-emerald-400",
              bg: "bg-emerald-500/20",
              fromColor: "from-emerald-500/25",
              hoverBorder: "hover:border-emerald-500/30"
            },
            {
              title: "Most Active User",
              value: mostActiveUser ? mostActiveUser.name : 'N/A',
              subText: mostActiveUser ? `Logins: ${mostActiveUser.loginCount}` : null,
              icon: FiClock,
              color: "text-amber-400",
              bg: "bg-amber-500/20",
              fromColor: "from-amber-500/25",
              hoverBorder: "hover:!border-amber-500/30"
            }
          ].map((metric, index) => (
            <Card
              key={index}
              hoverable
              className={`p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${metric.hoverBorder}`}
            >
              <div className={`absolute inset-0 bg-linear-to-b ${metric.fromColor} to-transparent pointer-events-none`}></div>
              <div className="relative flex items-center justify-between gap-3 z-10">
                <div className="min-w-0 flex-1">
                  <h3 className={`${metric.color} text-xs sm:text-sm font-bold tracking-wide truncate`}>
                    {metric.title}
                  </h3>
                  <p
                    className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-white mt-1 tracking-tight truncate"
                    title={metric.value ? metric.value.toString() : ''}
                  >
                    {metric.value}
                  </p>
                  {metric.subText && (
                    <p className="text-xs font-semibold text-slate-400 mt-1 truncate">
                      {metric.subText}
                    </p>
                  )}
                </div>
                <div className={`p-3 sm:p-3.5 rounded-xl ${metric.bg} shrink-0`}>
                  <metric.icon className={`text-lg sm:text-xl ${metric.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 xl:gap-5">
          {[
            {
              title: "Total Accounts Checked",
              value: totalChecked,
              icon: FiUsers,
              color: "text-blue-400",
              bg: "bg-blue-500/20",
              fromColor: "from-blue-500/25",
              hoverBorder: "hover:border-blue-500/30"
            },
            {
              title: "Setup Not Sent",
              value: notSentCount,
              icon: FiMail,
              color: "text-rose-400",
              bg: "bg-rose-500/20",
              fromColor: "from-rose-500/25",
              hoverBorder: "hover:border-rose-500/30"
            },
            {
              title: "Completed / Link Sent",
              value: `${reportData.filter(u => u.passwordSetupStatus !== 'not_sent' && u.passwordSetupStatus !== 'sent').length} / ${sentOrCompletedCount}`,
              icon: FiCheck,
              color: "text-emerald-400",
              bg: "bg-emerald-500/20",
              fromColor: "from-emerald-500/25",
              hoverBorder: "hover:border-emerald-500/30"
            }
          ].map((metric, index) => (
            <Card
              key={index}
              hoverable
              className={`p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${metric.hoverBorder}`}
            >
              <div className={`absolute inset-0 bg-linear-to-b ${metric.fromColor} to-transparent pointer-events-none`}></div>
              <div className="relative flex items-center justify-between gap-3 z-10">
                <div className="min-w-0 flex-1">
                  <h3 className={`${metric.color} text-xs sm:text-sm font-bold tracking-wide truncate`}>
                    {metric.title}
                  </h3>
                  <p
                    className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-white mt-1 tracking-tight truncate"
                    title={metric.value ? metric.value.toString() : ''}
                  >
                    {metric.value}
                  </p>
                </div>
                <div className={`p-3 sm:p-3.5 rounded-xl ${metric.bg} shrink-0`}>
                  <metric.icon className={`text-lg sm:text-xl ${metric.color}`} />
                </div>
              </div>
            </Card>
          ))}
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
        <div className="relative z-10 border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full isolate will-change-transform">
          <div className="overflow-auto custom-scrollbar max-h-[70vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-white/[0.03] backdrop-blur-md shadow-md border-b border-white/10">
                {activeTab === 'login' ? (
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="p-2 font-bold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>S.No</span>
                        {hasActiveFilters && (
                          <button
                            onClick={handleClearHeaderFilters}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-white/10 transition-all cursor-pointer hover:text-white"
                            title="Reset Table Filters"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('userId')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'userId' ? 'text-blue-400 font-extrabold' : ''}>User ID</span>
                        {sortKey === 'userId' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('name')}
                      className="p-4 font-bold text-left cursor-pointer select-none hover:text-white transition-colors min-w-[140px]"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortKey === 'name' ? 'text-blue-400 font-extrabold' : ''}>Name</span>
                        {sortKey === 'name' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('email')}
                      className="p-4 font-bold text-left cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortKey === 'email' ? 'text-blue-400 font-extrabold' : ''}>Email</span>
                        {sortKey === 'email' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 font-bold text-center">Phone</th>
                    <th className="p-4 font-bold text-left min-w-[140px]">
                      <CustomDropdown
                        value={selectedBusinessType}
                        onChange={(val) => setSelectedBusinessType(val)}
                        options={businessTypeOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedBusinessType ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
                    <th
                      onClick={() => handleSortChange('lastLoginAt')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'lastLoginAt' ? 'text-blue-400 font-extrabold' : ''}>Last Login At</span>
                        {sortKey === 'lastLoginAt' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 font-bold text-center min-w-[130px]">
                      <CustomDropdown
                        value={selectedMethod}
                        onChange={(val) => setSelectedMethod(val)}
                        options={methodOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedMethod ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
                    <th
                      onClick={() => handleSortChange('loginCount')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'loginCount' ? 'text-blue-400 font-extrabold' : ''}>Logins</span>
                        {sortKey === 'loginCount' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                  </tr>
                ) : (
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="p-2 font-bold text-center bg-slate-900/95">
                      <div className="flex items-center justify-center gap-1">
                        <span>S.No</span>
                        {hasActiveFilters && (
                          <button
                            onClick={handleClearHeaderFilters}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-white/10 transition-all cursor-pointer hover:text-white"
                            title="Reset Table Filters"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('userId')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'userId' ? 'text-blue-400 font-extrabold' : ''}>User ID</span>
                        {sortKey === 'userId' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('name')}
                      className="p-4 font-bold text-left cursor-pointer select-none hover:text-white transition-colors min-w-[140px]"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortKey === 'name' ? 'text-blue-400 font-extrabold' : ''}>Name</span>
                        {sortKey === 'name' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortChange('email')}
                      className="p-4 font-bold text-left cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortKey === 'email' ? 'text-blue-400 font-extrabold' : ''}>Email</span>
                        {sortKey === 'email' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 font-bold text-center">Phone</th>
                    <th className="p-4 font-bold text-left min-w-[140px]">
                      <CustomDropdown
                        value={selectedBusinessType}
                        onChange={(val) => setSelectedBusinessType(val)}
                        options={businessTypeOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedBusinessType ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
                    <th className="p-4 font-bold text-center min-w-[150px]">
                      <CustomDropdown
                        value={selectedSetupStatus}
                        onChange={(val) => setSelectedSetupStatus(val)}
                        options={setupStatusOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedSetupStatus ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
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
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {checkAppStatus(item) === 'uninstalled' ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-extrabold border border-rose-500/20 shrink-0">
                              Uninstalled
                            </span>
                          ) : checkAppStatus(item) === 'installed' ? (
                            <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[9px] font-extrabold border border-teal-500/20 shrink-0">
                              Installed
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300 text-left">
                        <GmailLink email={item.email} />
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
                    <td colSpan={activeTab === 'login' ? 9 : 6} className="p-12 text-center text-slate-400 italic">
                      {hasActiveFilters ? 'No matching reports found for the selected filters.' : 'No reports found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && !error && sortedData.length > 0 && (
            <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
              <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, sortedData.length)}</span> of <span className="font-bold text-white">{sortedData.length}</span> records
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                >
                  &larr;
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
                        className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border transition-colors shrink-0 transform-gpu ${page === currentPage
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : page === '...'
                              ? 'bg-transparent text-slate-500 border-transparent cursor-default'
                              : 'bg-slate-950/20 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white cursor-pointer'
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
                  className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                >
                  &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveUsers;
