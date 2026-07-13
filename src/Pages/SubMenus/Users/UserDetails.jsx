import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiArrowLeft, FiCheck, FiX, FiLoader, FiAlertCircle, 
  FiUser, FiFileText, FiTrash2, FiUserMinus, FiEye, FiLayers,
  FiSmartphone, FiTablet, FiBell, FiBellOff, FiClock, FiActivity, FiTag, FiSearch
} from 'react-icons/fi';

const isLastActiveValid = (lastActive) => {
  if (!lastActive) return false;
  const str = String(lastActive).trim().toLowerCase();
  if (str === 'null' || str === 'undefined' || str === '' || str === 'not active') return false;
  const date = new Date(lastActive);
  return !isNaN(date.getTime()) && date.getTime() !== 0;
};

const formatRelativeTime = (dateString) => {
  if (!isLastActiveValid(dateString)) return 'Not Active';
  const date = new Date(dateString);
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

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [authStatus, setAuthStatus] = useState(null);
  const [loadingAuthStatus, setLoadingAuthStatus] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState('Uploaded GST certificate PDF is expired. Please upload the latest active certificate.');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Browsing Activities State
  const [userActivities, setUserActivities] = useState({ products: [], brands: [], categories: [], searches: [] });
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('products');
  const [activeSectionTab, setActiveSectionTab] = useState('kyc');

  // Fetch browsing activities for the user
  useEffect(() => {
    if (!user) return;
    
    const fetchActivitiesData = async (isPoll = false) => {
      if (!isPoll) setLoadingActivities(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [prodRes, brandRes, catRes, actRes] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/activity/stats', { headers }).catch(() => ({ data: { recentActivities: [] } }))
        ]);
        
        const productsList = prodRes.data || [];
        const brandsList = brandRes.data || [];
        const categoriesList = catRes.data || [];
        const activities = actRes.data?.recentActivities || [];
        
        // Filter activities for this user
        const userLogs = activities.filter(act => {
          const actUserId = act.user?._id || (typeof act.user === 'string' ? act.user : null);
          const actUserEmail = act.user?.email;
          
          return (actUserId && (actUserId === user._id || actUserId === user.userId || actUserId === id)) ||
                 (actUserEmail && user.email && actUserEmail.toLowerCase() === user.email.toLowerCase());
        });
        
        // 1. Process Product Views
        const pvLogs = userLogs.filter(act => {
          const action = (act.action || '').toUpperCase();
          return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
        });
        const productViewsMap = {};
        pvLogs.forEach(log => {
          const productId = log.details?.productId;
          if (!productId) return;
          const prod = productsList.find(p => p._id === productId);
          if (!productViewsMap[productId]) {
            productViewsMap[productId] = {
              id: productId,
              name: prod?.name || productId || 'a product',
              image: prod?.images?.[0] || '',
              brand: prod?.brand?.name || (prod?.brand ? (brandsList.find(b => b._id === prod.brand)?.name) : '') || 'N/A',
              count: 0,
              latestView: log.createdAt
            };
          }
          productViewsMap[productId].count += 1;
          if (new Date(log.createdAt) > new Date(productViewsMap[productId].latestView)) {
            productViewsMap[productId].latestView = log.createdAt;
          }
        });
        
        // 2. Process Brand Views
        const bvLogs = userLogs.filter(act => {
          const action = (act.action || '').toUpperCase();
          return action === 'BRAND_VIEW' || action === 'BRAND';
        });
        const brandViewsMap = {};
        bvLogs.forEach(log => {
          const brandId = log.details?.brandId || log.details?.id;
          if (!brandId) return;
          const brand = brandsList.find(b => b._id === brandId);
          if (!brandViewsMap[brandId]) {
            brandViewsMap[brandId] = {
              id: brandId,
              name: brand?.name || brandId || 'a brand',
              logo: brand?.logo || '',
              count: 0,
              latestView: log.createdAt
            };
          }
          brandViewsMap[brandId].count += 1;
          if (new Date(log.createdAt) > new Date(brandViewsMap[brandId].latestView)) {
            brandViewsMap[brandId].latestView = log.createdAt;
          }
        });
        
        // 3. Process Category Views
        const cvLogs = userLogs.filter(act => {
          const action = (act.action || '').toUpperCase();
          return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
        });
        const categoryViewsMap = {};
        cvLogs.forEach(log => {
          const catId = log.details?.categoryId || log.details?.id;
          if (!catId) return;
          const cat = categoriesList.find(c => c._id === catId);
          if (!categoryViewsMap[catId]) {
            categoryViewsMap[catId] = {
              id: catId,
              name: cat?.name || catId || 'a category',
              image: cat?.image || '',
              count: 0,
              latestView: log.createdAt
            };
          }
          categoryViewsMap[catId].count += 1;
          if (new Date(log.createdAt) > new Date(categoryViewsMap[catId].latestView)) {
            categoryViewsMap[catId].latestView = log.createdAt;
          }
        });
        
        // 4. Process Search Queries
        const sqLogs = userLogs.filter(act => {
          const action = (act.action || '').toUpperCase();
          return action === 'SEARCH';
        });
        const searchQueriesMap = {};
        sqLogs.forEach(log => {
          const query = log.details?.query;
          if (!query) return;
          const queryKey = query.trim().toLowerCase();
          if (!searchQueriesMap[queryKey]) {
            searchQueriesMap[queryKey] = {
              id: queryKey,
              query: query,
              count: 0,
              latestSearch: log.createdAt
            };
          }
          searchQueriesMap[queryKey].count += 1;
          if (new Date(log.createdAt) > new Date(searchQueriesMap[queryKey].latestSearch)) {
            searchQueriesMap[queryKey].latestSearch = log.createdAt;
          }
        });
        
        setUserActivities({
          products: Object.values(productViewsMap).sort((a, b) => b.count - a.count),
          brands: Object.values(brandViewsMap).sort((a, b) => b.count - a.count),
          categories: Object.values(categoryViewsMap).sort((a, b) => b.count - a.count),
          searches: Object.values(searchQueriesMap).sort((a, b) => b.count - a.count)
        });
      } catch (err) {
        console.error('Failed to process user activities:', err);
      } finally {
        if (!isPoll) setLoadingActivities(false);
      }
    };
    
    fetchActivitiesData(false);
    const intervalId = setInterval(() => {
      fetchActivitiesData(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user?._id, user?.email]);

  const fetchUserDetails = async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [customersResponse, actResponse] = await Promise.all([
        api.get('/admin/customers', { headers }),
        api.get('/activity/stats', { headers }).catch(() => ({ data: { users: [] } }))
      ]);

      let allUsers = [];
      if (Array.isArray(customersResponse.data)) {
        allUsers = customersResponse.data;
      } else if (customersResponse.data && typeof customersResponse.data === 'object') {
        allUsers = customersResponse.data.data || customersResponse.data.users || customersResponse.data.customers || [];
      }

      const actUsers = actResponse.data?.users || [];

      let foundUser = allUsers.find(u => u._id === id);
      if (foundUser) {
        const match = actUsers.find(au => au.userId === foundUser._id || (au.email && foundUser.email && au.email.toLowerCase() === foundUser.email.toLowerCase()));
        foundUser = {
          ...foundUser,
          lastActive: foundUser.lastActive || match?.lastActive,
          lastLoginAt: foundUser.lastLoginAt || match?.lastLoginAt,
          appVersion: foundUser.appVersion || match?.appVersion,
          notificationsEnabled: foundUser.notificationsEnabled !== undefined ? foundUser.notificationsEnabled : match?.notificationsEnabled,
          isOnline: foundUser.isOnline !== undefined ? foundUser.isOnline : match?.isOnline,
          isAppInstalled: foundUser.isAppInstalled !== undefined ? foundUser.isAppInstalled : match?.isAppInstalled
        };
        setUser(foundUser);
        setError('');
      } else {
        setError('User not found.');
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      if (!isPoll) {
        setError(err.response?.data?.message || 'Failed to load user details.');
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchUserDetails(false);
    });

    // Poll user data every 1 second to update online status & active logs
    const intervalId = setInterval(() => {
      fetchUserDetails(true);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [id]);

  // Fetch authentication status once user email is available
  useEffect(() => {
    if (!user?.email) return;

    const fetchAuthStatus = async () => {
      setLoadingAuthStatus(true);
      setAuthStatus(null);
      try {
        const token = sessionStorage.getItem('accessToken');
        const response = await api.get(`/auth/status/${user.email}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuthStatus(response.data);
      } catch (err) {
        console.error('Failed to fetch auth status:', err);
      } finally {
        setLoadingAuthStatus(false);
      }
    };

    fetchAuthStatus();
  }, [user?.email]);

  const handleDelete = async (reasonText) => {
    if (!reasonText || !reasonText.trim()) {
      alert('A deletion reason is required.');
      return;
    }

    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.delete(`/admin/reject/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: reasonText }
      });
      alert('User deleted successfully.');
      navigate('/users/list');
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsActionLoading(false);
      setIsDeleting(false);
    }
  };

  const getDocumentUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full pb-8">
      {/* Glassmorphism Background Ambient Glow */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <button 
            onClick={() => navigate('/users/list')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            <FiArrowLeft /> Back to Users List
          </button>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiUser className="text-blue-400" />
            User Profile
          </h1>
          <p className="text-slate-400 font-medium mt-1">Detailed information and device statuses for this user.</p>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !user ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/50 border border-white/10 rounded-3xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400 font-medium">Loading user details...</p>
        </div>
      ) : error ? (
        <div className="text-red-400 bg-red-900/20 p-6 rounded-2xl border border-red-500/30 flex items-center gap-3">
          <FiAlertCircle className="text-2xl shrink-0" /> 
          <div>
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : user ? (
        <div className="space-y-6 max-w-6xl mx-auto w-full">
          
          {/* Core User Information */}
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20 border border-white/5 p-4 rounded-2xl mb-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                {(user.isApproved || user.userId) ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><FiCheck /> KYC Approved</span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><FiLoader className="animate-spin" /> Pending KYC</span>
                )}
              </div>
              {(user.isApproved || user.userId) && user.userId && (
                <div className="sm:text-right text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Generated User ID</p>
                  <p className="text-emerald-400 font-mono text-lg font-bold">{user.userId}</p>
                </div>
              )}
            </div>

            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-white font-medium text-base">{user.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-white font-medium text-base">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-white font-medium text-base">{user.phone || 'Not Provided'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</p>
                <p className="text-white font-medium capitalize text-base">{user.role || 'customer'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Registration Date</p>
                <p className="text-white font-medium text-base">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
              </div>
            </div>

            {/* System auth status check */}
            <div className="mt-6 p-4 rounded-2xl border border-white/5 bg-slate-800/40">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Auth Account Status</p>
              {loadingAuthStatus ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <FiLoader className="animate-spin text-blue-400" /> Checking system registration...
                </div>
              ) : authStatus ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-white font-semibold capitalize text-sm">{authStatus.status || authStatus.message || 'Active'}</span>
                    {authStatus.lastLogin && <p className="text-[10px] text-slate-500">Last login: {new Date(authStatus.lastLogin).toLocaleString()}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${authStatus.exists ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {authStatus.exists ? 'Registered' : 'Unregistered'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium italic">
                  <FiAlertCircle size={14} className="text-red-400" /> Failed to retrieve authentication status.
                </div>
              )}
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-6 mb-6 overflow-x-auto scrollbar-none">
            {[
              { id: 'kyc', name: 'Business & KYC Details', icon: <FiFileText /> },
              { id: 'sessions', name: 'App Usage & Sessions', icon: <FiActivity /> },
              { id: 'devices', name: 'Registered Devices', icon: <FiSmartphone /> },
              { id: 'activity', name: 'Customer Browsing Activity', icon: <FiEye /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSectionTab(tab.id)}
                className={`pb-3 font-bold text-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeSectionTab === tab.id 
                    ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>

          {activeSectionTab === 'kyc' && (
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Business & KYC Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-end">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business Type</p>
                <span className="bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                  {user.businessType || 'L1'}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Number</p>
                <p className="text-white font-medium font-mono text-base tracking-wide">{user.gstNumber || 'Not Provided'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Document</p>
                {user.gstDocument ? (
                  <a 
                    href={getDocumentUrl(user.gstDocument)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 rounded-xl font-medium text-sm transition-all w-full justify-center sm:w-auto"
                  >
                    <FiFileText className="text-lg" /> View Uploaded Document
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-transparent border border-dashed border-white/10 text-slate-500 rounded-xl text-sm italic w-full justify-center sm:w-auto">
                    <FiFileText className="text-lg" /> No document uploaded
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {activeSectionTab === 'sessions' && (
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <h4 className="text-sm font-bold text-white mb-5 uppercase tracking-wider border-b border-white/10 pb-2">App Usage & Sessions</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Online Status */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Online Status</p>
                <p className={`text-xs font-bold mt-1 ${user.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>

              {/* App Version */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Version</p>
                <p className="text-xs font-bold text-white mt-1">v{user.appVersion || 'N/A'}</p>
              </div>

              {/* App Lock Status */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Lock</p>
                <p className={`text-xs font-bold mt-1 ${user.isAppLockEnabled ? 'text-teal-400' : 'text-slate-400'}`}>
                  {user.isAppLockEnabled ? 'Secured' : 'Inactive'}
                </p>
              </div>

              {/* Notifications */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Push Alerts</p>
                <p className={`text-xs font-bold mt-1 ${user.notificationsEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {user.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              {/* App Installation */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Installation</p>
                <p className={`text-xs font-bold mt-1 ${
                  checkAppStatus(user) === 'uninstalled' 
                    ? 'text-rose-400' 
                    : checkAppStatus(user) === 'installed' 
                    ? 'text-teal-400' 
                    : 'text-slate-400'
                }`}>
                  {checkAppStatus(user) === 'uninstalled' ? 'Uninstalled' : checkAppStatus(user) === 'installed' ? 'Installed' : 'Pending'}
                </p>
              </div>

              {/* Password Setup */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Password Setup</p>
                <p className="text-xs font-bold text-white mt-1 capitalize">{user.passwordSetupStatus?.replace('_', ' ') || 'Not Sent'}</p>
              </div>

              {/* Installed At */}
              {user.isAppInstalled && user.installedAt && (
                <div className="sm:col-span-2 bg-slate-950/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Installed At</p>
                    <p className="text-xs font-bold text-white mt-1 select-all">{new Date(user.installedAt).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-md font-extrabold shrink-0">
                    {formatRelativeTime(user.installedAt)}
                  </span>
                </div>
              )}

              {/* Uninstalled At */}
              {user.uninstalledAt && (
                <div className="sm:col-span-2 bg-slate-950/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Uninstalled At</p>
                    <p className="text-xs font-bold text-white mt-1 select-all">{new Date(user.uninstalledAt).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-md font-extrabold shrink-0">
                    {formatRelativeTime(user.uninstalledAt)}
                  </span>
                </div>
              )}

              {/* Login Count */}
              <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Login Count</p>
                <p className="text-xs font-bold text-white mt-1">{user.loginCount || 0} logins</p>
              </div>

              {/* Last Active */}
              <div className="sm:col-span-2 bg-slate-950/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Active Connection</p>
                  <p className="text-xs font-bold text-white mt-1 select-all">
                    {isLastActiveValid(user.lastActive)
                      ? new Date(user.lastActive).toLocaleString()
                      : 'Not Active'}
                  </p>
                </div>
                {isLastActiveValid(user.lastActive) ? (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-md font-extrabold shrink-0">
                    {formatRelativeTime(user.lastActive)}
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-500 border border-white/5 px-2.5 py-0.5 rounded-md font-extrabold shrink-0">
                    Not Active
                  </span>
                )}
              </div>

              {/* Last Login */}
              {user.lastLoginAt && (
                <div className="sm:col-span-2 bg-slate-950/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Session Authorization</p>
                    <p className="text-xs font-bold text-white mt-1 select-all">{new Date(user.lastLoginAt).toLocaleString()}</p>
                  </div>
                  {user.lastLoginMethod && (
                    <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider shrink-0">
                      via {user.lastLoginMethod}
                    </span>
                  )}
                </div>
              )}
            </div>
            </div>
          )}

          {activeSectionTab === 'devices' && (
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">Registered Devices ({user.devices?.length || 0})</h4>
            
            {!user.devices || user.devices.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-2">No registered devices found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.devices.map((device, idx) => (
                  <div key={device._id || idx} className="p-4 bg-slate-950/20 border border-white/5 rounded-2xl space-y-2 text-xs">
                    
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                        {device.devicePlatform?.toLowerCase() === 'tablet' ? <FiTablet size={16} /> : <FiSmartphone size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate text-sm">{device.deviceModel || 'Unknown Device'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{device.devicePlatform || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">App Version</p>
                        <p className="text-white font-mono">v{device.appVersion || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Notifications</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          device.notificationsEnabled 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {device.notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Device Token / ID</p>
                        <p className="text-slate-400 font-mono text-[9px] truncate" title={device.deviceId || device.fcmToken}>{device.deviceId || device.fcmToken || 'N/A'}</p>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-1.5 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Last Active</p>
                        <p className="text-slate-300 font-medium">{device.lastActive ? new Date(device.lastActive).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {activeSectionTab === 'activity' && (
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden space-y-6">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FiActivity className="text-blue-400" /> Customer Browsing Activity
              </h4>
            </div>

            {/* Tabs styled exactly like ActiveUsers.jsx */}
            <div className="flex border-b border-white/10 gap-6">
              {[
                { id: 'products', name: 'Viewed Products', icon: <FiEye /> },
                { id: 'brands', name: 'Viewed Brands', icon: <FiTag /> },
                { id: 'categories', name: 'Viewed Categories', icon: <FiLayers /> },
                { id: 'searches', name: 'Search Queries', icon: <FiSearch /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveActivityTab(tab.id)}
                  className={`pb-3 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeActivityTab === tab.id 
                      ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </div>

            {loadingActivities ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                <span className="text-xs">Processing activity logs...</span>
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto overflow-x-auto custom-scrollbar rounded-2xl border border-white/10 bg-slate-950/20">
                {activeActivityTab === 'products' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3 text-left sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Product Name</th>
                        <th className="p-3 text-left sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Brand</th>
                        <th className="p-3 text-center sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Views Count</th>
                        <th className="p-3 text-right sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Latest View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userActivities.products.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-6 text-center text-xs text-slate-500 italic">No products viewed by this user.</td>
                        </tr>
                      ) : (
                        userActivities.products.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <FiFileText />
                                  </div>
                                )}
                                <span className="font-semibold text-sm text-white line-clamp-1 max-w-[200px]" title={item.name}>{item.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-slate-300 font-medium">{item.brand}</td>
                            <td className="p-3 text-center font-bold text-sm text-blue-400">{item.count}</td>
                            <td className="p-3 text-right text-xs text-slate-400 font-medium">{new Date(item.latestView).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeActivityTab === 'brands' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3 text-left sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Brand Name</th>
                        <th className="p-3 text-center sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Views Count</th>
                        <th className="p-3 text-right sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Latest View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userActivities.brands.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-xs text-slate-500 italic">No brands viewed by this user.</td>
                        </tr>
                      ) : (
                        userActivities.brands.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {item.logo ? (
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5">
                                    <img src={getDocumentUrl(item.logo)} alt={item.name} className="w-full h-full object-contain animate-in fade-in" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <FiTag />
                                  </div>
                                )}
                                <span className="font-semibold text-sm text-white">{item.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-sm text-blue-400">{item.count}</td>
                            <td className="p-3 text-right text-xs text-slate-400 font-medium">{new Date(item.latestView).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeActivityTab === 'categories' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3 text-left sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Category Name</th>
                        <th className="p-3 text-center sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Views Count</th>
                        <th className="p-3 text-right sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Latest View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userActivities.categories.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-xs text-slate-500 italic">No categories viewed by this user.</td>
                        </tr>
                      ) : (
                        userActivities.categories.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5">
                                    <img src={getDocumentUrl(item.image)} alt={item.name} className="w-full h-full object-contain animate-in fade-in" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <FiFileText />
                                  </div>
                                )}
                                <span className="font-semibold text-sm text-white">{item.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-sm text-blue-400">{item.count}</td>
                            <td className="p-3 text-right text-xs text-slate-400 font-medium">{new Date(item.latestView).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeActivityTab === 'searches' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3 text-left sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Search Query</th>
                        <th className="p-3 text-center sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Search Count</th>
                        <th className="p-3 text-right sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10 border-b border-white/10">Latest Search</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {userActivities.searches.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-xs text-slate-500 italic">No search queries logged by this user.</td>
                        </tr>
                      ) : (
                        userActivities.searches.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                  <FiSearch />
                                </div>
                                <span className="font-semibold text-sm text-white">{item.query}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-sm text-blue-400">{item.count}</td>
                            <td className="p-3 text-right text-xs text-slate-400 font-medium">{new Date(item.latestSearch).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          )}

          {/* Profile Deletion Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/25 shadow-2xl rounded-3xl p-6 relative overflow-hidden">
            <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Danger Zone</h4>
            <p className="text-slate-400 text-xs mb-4">Permanently delete this user account. This action cannot be undone and will revoke their system access.</p>
            <button 
              onClick={() => setIsDeleting(true)}
              disabled={isActionLoading}
              className="flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all cursor-pointer text-sm shadow-md shadow-red-600/10 shrink-0"
            >
              <FiTrash2 className="mr-2 text-base" /> Delete User Account
            </button>
          </div>

        </div>
      ) : null}

      {/* Delete User Reason Popup Modal */}
      {isDeleting && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsDeleting(false)}></div>
          
          <div className="relative bg-slate-900 border border-white/10 shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiUserMinus className="text-red-400" /> Delete User Account
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-medium">Please provide a reason to notify the customer about their account deletion.</p>
            
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
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletionReason)}
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

export default UserDetails;
