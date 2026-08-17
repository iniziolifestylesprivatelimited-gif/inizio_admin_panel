import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../../../api/axios';
import {
  FiCheck, FiLoader, FiAlertCircle,
  FiSearch, FiUser, FiFileText, FiRefreshCcw, FiTrash2, FiUserMinus, FiLogOut, FiX,
  FiShield, FiChevronDown, FiCopy, FiCalendar, FiUserCheck, FiClock, FiPhone, FiMapPin
} from 'react-icons/fi';
import { DiAndroid, DiApple } from "react-icons/di";
import { MdPhoneAndroid, MdPhoneIphone } from 'react-icons/md';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import { useConfirm } from '../../../Context/ConfirmationContext';
import CopyButton from '../../../Components/CopyButton';
import CustomDropdown from '../../../Components/CustomDropdown';
import UsersVerification from './UsersVerification';

const hasValidAppVersion = (appVersion) => {
  if (!appVersion) return false;
  const str = String(appVersion).trim().toLowerCase();
  if (!str) return false;
  if (
    str === 'null' ||
    str === 'undefined' ||
    str === 'n/a' ||
    str === 'none' ||
    str === 'unknown' ||
    str === 'legacy' ||
    str.includes('unknown') ||
    str.includes('legacy') ||
    str.startsWith('vunknown') ||
    str.startsWith('vlegacy') ||
    str === '0.0.0' ||
    str === '0.0'
  ) {
    return false;
  }
  return true;
};

const hasRegisteredDevices = (u) => {
  if (!u) return false;
  const devs = u.devices || u.registeredDevices;
  return Array.isArray(devs) && devs.length > 0;
};

const hasAppOrDevice = (u) => {
  if (!u) return false;
  return hasValidAppVersion(u.appVersion) || hasRegisteredDevices(u);
};

const formatRelativeTime = (dateString, u = null) => {
  if (u && !hasAppOrDevice(u)) return 'Not Active';
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
  return formatDateDDMMYYYY(date);
};

const checkAppStatus = (u) => {
  if (!u) return 'pending';

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
  const { confirm, showAlert: showGlobalAlert } = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSecurityDropdownOpen, setIsSecurityDropdownOpen] = useState(false);

  // URL search params logic similar to ProductList
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const lastPushedSearchRef = useRef(searchParams.get('search') || '');
  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const selectedBusinessType = searchParams.get('businessType') || '';
  const selectedAppStatus = searchParams.get('appStatus') || '';
  const selectedDevice = searchParams.get('device') || '';
  const sortKey = searchParams.get('sortKey') || '';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  const handleFilterChange = (key, value) => {
    setSearchParams(prev => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handleSortChange = (key) => {
    setSearchParams(prev => {
      const currentKey = prev.get('sortKey') || '';
      const currentOrder = prev.get('sortOrder') || 'asc';
      
      if (currentKey === key) {
        if (currentOrder === 'asc') {
          prev.set('sortOrder', 'desc');
        } else {
          prev.delete('sortKey');
          prev.delete('sortOrder');
        }
      } else {
        prev.set('sortKey', key);
        prev.set('sortOrder', 'asc');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(prev => {
      prev.delete('search');
      prev.delete('businessType');
      prev.delete('appStatus');
      prev.delete('device');
      prev.delete('sortKey');
      prev.delete('sortOrder');
      prev.set('page', '1');
      return prev;
    });
  };

  // Sync local input with URL search param changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== lastPushedSearchRef.current) {
      setSearchInput(urlSearch);
      lastPushedSearchRef.current = urlSearch;
    }
  }, [searchParams]);

  // Debounce search updates to searchParams
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchParams(prev => {
        const currentSearch = prev.get('search') || '';
        if (searchInput === currentSearch) return prev;
        
        if (searchInput) {
          prev.set('search', searchInput);
        } else {
          prev.delete('search');
        }
        prev.set('page', '1');
        lastPushedSearchRef.current = searchInput;
        return prev;
      }, { replace: true });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchInput, setSearchParams]);

  // Custom Confirmation & Alert States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // Pagination State
  const [usersPerPage] = useState(10);
  const [userTab, setUserTab] = useState(searchParams.get('tab') || 'approved'); // 'approved' | 'pending' | 'rejected' | 'deleted'
  const [pendingCount, setPendingCount] = useState(0);

  const { setUsersUnreadCount, setUsersVerifyUnreadCount, setUsersDeletionUnreadCount } = useOutletContext() || {};

  const setCurrentPage = (pageVal) => {
    const pageNum = typeof pageVal === 'function' ? pageVal(currentPage) : pageVal;
    setSearchParams(prev => {
      prev.set('page', String(pageNum));
      return prev;
    });
  };

  const handleTabChange = (tabName) => {
    setUserTab(tabName);
    setSearchParams(prev => {
      prev.set('tab', tabName);
      prev.set('page', '1');
      return prev;
    });
  };

  // Sync tab state with URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== userTab) {
      setUserTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (userTab === 'pending' && setUsersVerifyUnreadCount) {
      setUsersVerifyUnreadCount(0);
    } else if (userTab === 'deleted' && setUsersDeletionUnreadCount) {
      setUsersDeletionUnreadCount(0);
    }
  }, [userTab, setUsersVerifyUnreadCount, setUsersDeletionUnreadCount]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setCurrentPage(1);
    });
  }, [userTab]);

  const fetchUsers = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      
      // Fetch all processed users, pending users, active login reports, and activity stats concurrently
      const [customersResponse, pendingResponse, _loginReportResponse, activityStatsResponse] = await Promise.all([
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

      let pendingData = [];
      if (Array.isArray(pendingResponse.data)) {
        pendingData = pendingResponse.data;
      } else if (pendingResponse.data && typeof pendingResponse.data === 'object') {
        pendingData = pendingResponse.data.data || pendingResponse.data.users || pendingResponse.data.pending || [];
      }
      setPendingCount(pendingData.length);

      // Merge dynamic lastActive from activity stats users list
      let actUsers = [];
      if (activityStatsResponse.data && Array.isArray(activityStatsResponse.data.users)) {
        actUsers = activityStatsResponse.data.users;
      } else if (Array.isArray(activityStatsResponse.data)) {
        actUsers = activityStatsResponse.data;
      }
      
      const recentActivities = activityStatsResponse.data?.recentActivities || [];

      allUsers = allUsers.map(u => {
        const match = actUsers.find(au => au.userId === u._id || (au.email && u.email && au.email.toLowerCase() === u.email.toLowerCase()));
        
        const rawAppVersion = u.appVersion || match?.appVersion;
        const matchedAppVersion = hasValidAppVersion(rawAppVersion) ? rawAppVersion : null;
        const matchedDevices = (u.devices && u.devices.length > 0) ? u.devices : (u.registeredDevices && u.registeredDevices.length > 0) ? u.registeredDevices : (match?.devices || []);

        const userHasAppOrDevice = Boolean(matchedAppVersion || (Array.isArray(matchedDevices) && matchedDevices.length > 0));

        const rawLastActive = u.lastActive || match?.lastActive;
        const lastActive = userHasAppOrDevice ? rawLastActive : null;
        const isOnline = userHasAppOrDevice ? (u.isOnline !== undefined ? u.isOnline : (lastActive ? (new Date() - new Date(lastActive) < 5 * 60 * 1000) : false)) : false;
        
        const computedLoginCount = recentActivities.filter(act => {
          const actUserId = act.user?._id || (typeof act.user === 'string' ? act.user : null);
          const actUserEmail = act.user?.email;
          const isUserMatch = (actUserId && actUserId === u._id) || (actUserEmail && u.email && actUserEmail.toLowerCase() === u.email.toLowerCase());
          return isUserMatch && (act.action || '').toUpperCase() === 'LOGIN';
        }).length;

        const activityStats = match?.activityStats || {
          searches: 0,
          productViews: 0,
          brandViews: 0,
          categoryViews: 0,
          logins: computedLoginCount,
          totalEngagement: computedLoginCount
        };

        return {
          ...u,
          lastActive,
          isOnline,
          hasAppOrDevice: userHasAppOrDevice,
          lastLoginAt: u.lastLoginAt || match?.lastLoginAt,
          appVersion: matchedAppVersion,
          devices: matchedDevices,
          notificationsEnabled: u.notificationsEnabled !== undefined ? u.notificationsEnabled : match?.notificationsEnabled,
          isAppInstalled: u.isAppInstalled !== undefined ? u.isAppInstalled : match?.isAppInstalled,
          loginCount: match?.activityStats?.logins !== undefined ? match.activityStats.logins : computedLoginCount,
          activityStats
        };
      });


      setUsers(allUsers);

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
    Promise.resolve().then(() => {
      fetchUsers(false);
    });

    // Setup polling every 30 seconds to keep activity status in sync
    const intervalId = setInterval(() => {
      fetchUsers(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Filter approved, rejected and deleted users
  const deletedUsers = users.filter(u => u.deleteRequested === true);
  const approvedUsers = users.filter(u => u.deleteRequested !== true && (u.isApproved === true || (u.isApproved !== false && !u.isRejected)));
  const rejectedUsers = users.filter(u => u.deleteRequested !== true && (u.isApproved === false || u.isRejected === true));

  const baseUsers = userTab === 'approved' 
    ? approvedUsers 
    : userTab === 'rejected' 
      ? rejectedUsers 
      : deletedUsers;

  // Delete User
  const handleDelete = async (id) => {
    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.put(`/admin/soft-delete/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      showAlert('User deleted successfully.');
    } catch (err) {
      console.error('Delete error:', err);
      showAlert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reactivate User
  const handleReactivate = async (id) => {
    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.put(`/admin/reactivate/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers((prevUsers) => 
        prevUsers.map((u) => u._id === id ? { ...u, deleteRequested: false } : u)
      );
      showAlert(response.data?.message || 'Account reactivated successfully.');
    } catch (err) {
      console.error('Reactivate error:', err);
      showAlert(err.response?.data?.message || 'Failed to reactivate user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredUsers = baseUsers.filter(user => {
    // 1. Business Type Filter
    if (selectedBusinessType && (user.businessType || 'L1') !== selectedBusinessType) {
      return false;
    }

    // 2. App Status Filter
    if (selectedAppStatus) {
      const status = checkAppStatus(user);
      if (status !== selectedAppStatus) return false;
    }

    // 3. Device Filter
    if (selectedDevice) {
      const devs = user.devices || [];
      const hasDevicePlat = devs.some(d => d.devicePlatform?.toLowerCase() === selectedDevice.toLowerCase());
      if (!hasDevicePlat) return false;
    }

    // 4. Search Query Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = user.name?.toLowerCase().includes(term);
      const emailMatch = user.email?.toLowerCase().includes(term);
      const phoneMatch = user.phone?.includes(term);
      const userIdMatch = user.userId?.toLowerCase().includes(term);
      const gstNumberMatch = user.gstNumber?.toLowerCase().includes(term);
      const onlineText = user.isOnline ? 'online' : 'offline';
      const onlineMatch = onlineText.includes(term);
      const appVersionMatch = user.appVersion?.toLowerCase().includes(term);
      const loginMethodMatch = user.lastLoginMethod?.toLowerCase().includes(term);

      const userCreatedAt = user.createdAt || user.created_at || user.registrationDate;
      const createdDateStr = userCreatedAt ? formatDateDDMMYYYY(userCreatedAt).toLowerCase() : '';
      const createdDateMatch = createdDateStr.includes(term);

      if (!(nameMatch || emailMatch || phoneMatch || userIdMatch || gstNumberMatch || onlineMatch || appVersionMatch || loginMethodMatch || createdDateMatch)) {
        return false;
      }
    }

    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortKey) return 0;
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (sortKey === 'createdAt') {
      const dateA = a.createdAt || a.created_at || a.registrationDate;
      const dateB = b.createdAt || b.created_at || b.registrationDate;
      aVal = dateA ? new Date(dateA).getTime() : 0;
      bVal = dateB ? new Date(dateB).getTime() : 0;
    } else if (sortKey === 'loginCount') {
      aVal = a.loginCount || 0;
      bVal = b.loginCount || 0;
    } else if (sortKey === 'lastActive') {
      aVal = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      bVal = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    } else if (sortKey === 'name' || sortKey === 'email' || sortKey === 'businessType') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Dynamic filter dropdown options
  const availableBusinessTypes = Array.from(
    new Set(users.map(u => u.businessType).filter(Boolean))
  );

  const businessTypeOptions = [
    { value: '', label: selectedBusinessType ? `Type: ${selectedBusinessType}` : 'Business Type' },
    ...availableBusinessTypes.map(type => ({ value: type, label: type }))
  ];

  const appStatusOptions = [
    { value: '', label: selectedAppStatus ? `Status: ${selectedAppStatus.toUpperCase()}` : 'App Status' },
    { value: 'installed', label: 'Installed' },
    { value: 'uninstalled', label: 'Uninstalled' },
    { value: 'pending', label: 'Pending' }
  ];

  const deviceOptions = [
    { value: '', label: selectedDevice ? `Device: ${selectedDevice.toUpperCase()}` : 'Device' },
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS' }
  ];

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  console.log(users)
  
    const handleRoleLogout = async (role) => {
      if (!role) return;
      const isConfirmed = await confirm(`Force logout ALL users with role: ${role}?`);
      if (!isConfirmed) return;
      try {
        await api.post('/admin/users/logout-role', { role });
        showGlobalAlert(`All ${role} users have been logged out.`, 'success');
      } catch {
        showGlobalAlert('Failed to logout role.', 'error');
      }
    };

    const handleGlobalLogout = async (platform = 'all') => {
      const confirmMsg = platform === 'all' 
        ? 'WARNING: This will log out EVERYONE globally. Continue?' 
        : `WARNING: This will log out all active ${platform.toUpperCase()} user sessions. Continue?`;
      const isConfirmed = await confirm(confirmMsg);
      if (!isConfirmed) return;
      try {
        const token = sessionStorage.getItem('accessToken');
        await api.post(`/admin/users/logout-all?platform=${platform}`, { platform }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showGlobalAlert(`Logout successful for: ${platform === 'all' ? 'everyone' : platform + ' users'}.`, 'success');
      } catch (err) {
        console.error('Failed to perform global logout:', err);
        showGlobalAlert(err.response?.data?.message || 'Failed to perform global logout.', 'error');
      }
    };

    const handleForceLogout = async (userId) => {
      const isConfirmed = await confirm(`Are you sure you want to force logout? This will invalidate all active sessions for this user.`);
      if (!isConfirmed) return;
      
      setIsActionLoading(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        await api.post(`/admin/users/${userId}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showGlobalAlert('User has been logged out successfully.', 'success');
      } catch (err) {
        console.error('Logout error:', err);
        showGlobalAlert(err.response?.data?.message || 'Failed to logout user.', 'error');
      } finally {
        setIsActionLoading(false);
      }
    };
    
  return (
    <div className="relative space-y-4 min-h-full z-0 isolate w-full">


      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiUser className="text-blue-400" />
            Users List
          </h1>
          <p className="text-slate-400 font-medium mt-1">View your registered, approved, rejected and deleted users.</p>
        </div>

        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input 
            type="text" 
            placeholder="Search by name, email, date..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics & Quick Device Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-400 px-1 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
            Total Users: <strong className="text-white">{baseUsers.length}</strong>
          </span>
          {(searchTerm || selectedBusinessType || selectedAppStatus || selectedDevice || sortKey) && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full">
              Found: <strong>{sortedUsers.length}</strong>
            </span>
          )}
        </div>

        {/* Device Quick Filter */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => handleFilterChange('device', '')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !selectedDevice
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Devices
          </button>
          <button
            onClick={() => handleFilterChange('device', 'android')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedDevice === 'android'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-green-400'
            }`}
          >
            <DiAndroid className="text-sm text-green-400" /> Android
          </button>
          <button
            onClick={() => handleFilterChange('device', 'ios')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedDevice === 'ios'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-indigo-400'
            }`}
          >
            <DiApple className="text-sm text-indigo-400" /> iOS
          </button>
        </div>
      </div>

      {/* Approved vs Rejected User Section Switcher */}
      <div className="relative z-30 flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 bg-black/20 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleTabChange('approved')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              userTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiCheck className="text-sm" />
            Approved Users
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
              userTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {approvedUsers.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('rejected')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              userTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiX className="text-sm" />
            Rejected Users
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
              userTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {rejectedUsers.length}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              userTab === 'pending'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiUserCheck className="text-sm" />
            Pending KYC
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
              userTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('deleted')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              userTab === 'deleted'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiTrash2 className="text-sm" />
            Deleted Users
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
              userTab === 'deleted' ? 'bg-white/20 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {deletedUsers.length}
            </span>
          </button>
        </div>

        {/* Security Actions Dropdown */}
        <div className="relative z-50">
          <button
            onClick={() => setIsSecurityDropdownOpen(!isSecurityDropdownOpen)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all cursor-pointer flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <FiShield className="text-amber-400 text-sm" />
            <span>Security Actions</span>
            <FiChevronDown className={`transition-transform duration-200 ${isSecurityDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSecurityDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setIsSecurityDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-white/10 shadow-2xl rounded-2xl p-1.5 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <button
                  onClick={() => {
                    setIsSecurityDropdownOpen(false);
                    const role = prompt("Enter role to force logout (e.g., billing, warehouse, customer):");
                    if (role) handleRoleLogout(role);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-orange-400 hover:bg-orange-500/15 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FiRefreshCcw size={14} className="shrink-0" />
                  <span>Logout Role</span>
                </button>

                <button
                  onClick={() => {
                    setIsSecurityDropdownOpen(false);
                    handleGlobalLogout('all');
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-red-400 hover:bg-red-500/15 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <FiAlertCircle size={14} className="shrink-0" />
                  <span>Logout All Users</span>
                </button>

                <button
                  onClick={() => {
                    setIsSecurityDropdownOpen(false);
                    handleGlobalLogout('android');
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <MdPhoneAndroid size={14} className="shrink-0" />
                  <span>Logout Android Only</span>
                </button>

                <button
                  onClick={() => {
                    setIsSecurityDropdownOpen(false);
                    handleGlobalLogout('ios');
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-400 hover:bg-indigo-500/15 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <MdPhoneIphone size={14} className="shrink-0" />
                  <span>Logout iOS Only</span>
                </button>
              </div>
            </>
          )}
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
      ) : userTab === 'pending' ? (
        <UsersVerification hideHeader={true} searchQuery={searchTerm} refreshParentCounts={fetchUsers} />
      ) : (
        <>
          <div className="relative z-10 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full isolate will-change-transform">
            <div className="overflow-auto custom-scrollbar max-h-[70vh]">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
                <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="p-2 font-bold text-center">S.No</th>
                    <th 
                      onClick={() => handleSortChange('name')}
                      className="p-4 font-bold text-left cursor-pointer select-none hover:text-white transition-colors"
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
                    <th className="p-4 font-bold text-left">Phone</th>
                    <th className="p-4 font-bold text-left min-w-[140px]">
                      <CustomDropdown
                        value=""
                        onChange={(val) => handleFilterChange('businessType', val)}
                        options={businessTypeOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedBusinessType ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
                    <th className="p-4 font-bold text-left min-w-[140px]">
                      <CustomDropdown
                        value=""
                        onChange={(val) => handleFilterChange('appStatus', val)}
                        options={appStatusOptions}
                        statusColor={`!border-transparent !px-0 !py-1 text-xs select-none hover:text-white ${selectedAppStatus ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'}`}
                      />
                    </th>
                    <th 
                      onClick={() => handleSortChange('createdAt')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'createdAt' ? 'text-blue-400 font-extrabold' : ''}>Created At</span>
                        {sortKey === 'createdAt' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortChange('lastActive')}
                      className="p-4 font-bold text-center cursor-pointer select-none hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortKey === 'lastActive' || sortKey === 'loginCount' ? 'text-blue-400 font-extrabold' : ''}>Activity & Logins</span>
                        {sortKey === 'lastActive' || sortKey === 'loginCount' ? (
                          sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                        ) : (
                          <span className="text-slate-500">⇅</span>
                        )}
                      </div>
                    </th>
                    <th className="p-4 font-bold text-center">GST Number</th>
                    <th className="p-4 font-bold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>Actions</span>
                        {(searchTerm || selectedBusinessType || selectedAppStatus || selectedDevice || sortKey) && (
                          <button
                            onClick={handleClearFilters}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-white/10 transition-all cursor-pointer hover:text-white ml-2"
                            title="Clear All Filters"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user, index) => (
                      <tr 
                        key={user._id} 
                        onClick={() => navigate(`/users/list/${user._id}`)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
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
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-slate-600 font-bold font-mono">{user._id}</span>
                              <CopyButton text={user._id} />
                            </div>
                            {(hasValidAppVersion(user.appVersion) || user.devices?.length > 0) && (
                              <span className="block text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {hasValidAppVersion(user.appVersion) && <span>v{user.appVersion}</span>}
                                {user.devices?.length > 0 && (
                                  <span className="inline-flex items-center">
                                    {Array.from(new Set(user.devices.map(d => d.devicePlatform?.toLowerCase()).filter(Boolean))).map(plat => (
                                      <span key={plat} className={`py-0.25 rounded text-[12px] font-black uppercase font-mono tracking-wider ${
                                        plat === 'android' ? 'text-green-400' : 
                                        plat === 'ios' ? 'text-slate-300' : 
                                        'bg-slate-800 text-slate-400 border border-white/5'
                                      }`}>
                                        {plat==='android' ? <DiAndroid/> : <DiApple/>}
                                      </span>
                                    ))}
                                  </span>
                                )}
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
                          {user.deleteRequested ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                              <FiTrash2 className="text-[10px]" /> Deleted
                            </span>
                          ) : user.isApproved !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                              <FiCheck className="text-[10px]" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                              <FiX className="text-[10px]" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-center font-medium">
                          {(() => {
                            const createdDate = user.createdAt || user.created_at || user.registrationDate;
                            if (!createdDate) return <span className="text-slate-500 font-mono text-xs">-</span>;
                            return (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                                  <FiCalendar className="text-blue-400 text-[11px]" />
                                  {formatDateDDMMYYYY(createdDate)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5" title={new Date(createdDate).toLocaleString()}>
                                  {formatDateTimeDDMMYYYY(createdDate).split(', ')[1] || ''}
                                </span>
                              </div>
                            );
                          })()}
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
                            <span className="text-[10px] text-slate-500 font-medium" title={`Raw lastActive: ${user.lastActive || 'None'}`}>
                              {formatRelativeTime(user.lastActive, user) === 'Not Active' ? 'Not Active' : `Active: ${formatRelativeTime(user.lastActive, user)}`}
                            </span>
                            {user.loginCount > 0 && (
                              <span className="text-[9px] text-blue-400 font-bold bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10 block mt-0.5">
                                {user.loginCount} logins
                              </span>
                            )}
                            {user.activityStats?.totalEngagement > 0 && (
                              <span 
                                className="text-[9px] text-indigo-400 font-bold bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 block mt-0.5 cursor-help"
                                title={`Engagement breakdown:
  - Product Views: ${user.activityStats.productViews || 0}
  - Brand Views: ${user.activityStats.brandViews || 0}
  - Category Views: ${user.activityStats.categoryViews || 0}
  - Searches: ${user.activityStats.searches || 0}
  - Logins: ${user.activityStats.logins || 0}`}
                              >
                                {user.activityStats.totalEngagement} actions
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-yellow-400 font-mono font-semibold">{user.gstNumber || 'N/A'}</td>
                        <td className="p-4 justify-center gap-2">
                          {user.deleteRequested ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReactivate(user._id); }} 
                              disabled={isActionLoading} 
                              className="flex items-center gap-1 p-2.5 text-white bg-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer transform-gpu" 
                              title="Reactivate User"
                            >
                              <FiRefreshCcw />
                              <span className='font-bold'>Reactivate</span>
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setUserToDelete(user); setDeleteConfirmOpen(true); }}
                              disabled={isActionLoading} 
                              className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer transform-gpu" 
                              title="Delete User"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                          {!user.deleteRequested && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleForceLogout(user._id); }} 
                              disabled={isActionLoading} 
                              className="p-2.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50 cursor-pointer transform-gpu" 
                              title="Force Logout User"
                            >
                              <FiLogOut />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400 italic">
                        {searchTerm || selectedBusinessType || selectedAppStatus || selectedDevice
                          ? 'No matching users found.' 
                          : userTab === 'approved' 
                            ? 'No approved customers found.' 
                            : userTab === 'rejected' 
                              ? 'No rejected customers found.' 
                              : 'No deleted customers found.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && !error && filteredUsers.length > 0 && (
            <div className="relative z-10 flex flex-col md:flex-row justify-end items-center gap-4 bg-transparent backdrop-blur-2xl shadow-lg shadow-black/20 p-4 rounded-2xl border border-white/10 isolate will-change-transform">
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
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && userToDelete && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setUserToDelete(null); setTypedConfirmName(''); }}></div>
          <div className="relative bg-slate-900 border border-red-500/20 rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              This action cannot be undone. To permanently delete the user account for <strong className="text-white">"{userToDelete.name}"</strong>, please type their name below to proceed:
            </p>
            <input
              type="text"
              placeholder="Type user's name to confirm"
              value={typedConfirmName}
              onChange={(e) => setTypedConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-medium mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setUserToDelete(null); setTypedConfirmName(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={typedConfirmName !== userToDelete.name}
                onClick={() => {
                  handleDelete(userToDelete._id);
                  setDeleteConfirmOpen(false);
                  setUserToDelete(null);
                  setTypedConfirmName('');
                }}
                className="flex-1 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
              >
                Proceed Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert Modal */}
      {alertOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setAlertOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-blue-400" /> Alert
            </h3>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              {alertMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="w-full px-4 py-2.5 text-white font-bold rounded-xl transition-colors text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default UsersList;