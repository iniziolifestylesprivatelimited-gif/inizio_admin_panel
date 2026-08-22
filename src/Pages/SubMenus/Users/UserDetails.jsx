import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PageHeader from '../../../Components/PageHeader';
import { TableRowSkeleton } from '../../../Components/Skeleton';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import { api, BASE_URL } from '../../../api/axios';
import {
  FiArrowLeft, FiCheck, FiX, FiLoader, FiAlertCircle,
  FiUser, FiFileText, FiTrash2, FiUserMinus, FiEye, FiLayers,
  FiSmartphone, FiTablet, FiBell, FiBellOff, FiClock, FiActivity, FiTag, FiSearch,
  FiRefreshCcw, FiCopy
} from 'react-icons/fi';
import { useConfirm } from '../../../Context/ConfirmationContext';
import ProductDetailsModal from '../../../Components/ProductDetailsModal';

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

import CopyButton from '../../../Components/CopyButton';

const isLastActiveValid = (lastActive, u = null) => {
  if (u && !hasAppOrDevice(u)) return false;
  if (!lastActive) return false;
  const str = String(lastActive).trim().toLowerCase();
  if (str === 'null' || str === 'undefined' || str === '' || str === 'not active') return false;
  const date = new Date(lastActive);
  return !isNaN(date.getTime()) && date.getTime() !== 0;
};

const formatRelativeTime = (dateString, u = null) => {
  if (!isLastActiveValid(dateString, u)) return 'Not Active';
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

const UserDetails = () => {
  const { confirm, showAlert: showGlobalAlert } = useConfirm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [authStatus, setAuthStatus] = useState(null);
  const [loadingAuthStatus, setLoadingAuthStatus] = useState(false);
  const [viewModalProductId, setViewModalProductId] = useState(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Custom Confirmation & Alert States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // Browsing Activities State
  const [userActivities, setUserActivities] = useState({ products: [], brands: [], categories: [], searches: [] });
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('products');
  const [activeSectionTab, setActiveSectionTab] = useState('sessions');

  // Fetch browsing activities for the user
  useEffect(() => {
    if (!user) return;

    const fetchActivitiesData = async (isPoll = false) => {
      if (!isPoll) setLoadingActivities(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        const [prodRes, brandRes, catRes, actRes, analyticsRes, ordersRes] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/activity/stats', { headers }).catch(() => ({ data: { recentActivities: [] } })),
          api.get('/admin/analytics', { headers }).catch(() => ({ data: { activityStream: [] } })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] }))
        ]);

        const productsList = prodRes.data || [];
        const brandsList = brandRes.data || [];
        const categoriesList = catRes.data || [];
        const activities = actRes.data?.recentActivities || [];
        const stream = analyticsRes.data?.activityStream || [];
        const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || [];

        // Flexible User Matching Helper
        const isTargetUser = (uObj) => {
          if (!uObj) return false;
          const uId = typeof uObj === 'string' ? uObj : (uObj._id || uObj.userId || uObj.id);
          const uEmail = typeof uObj === 'object' ? (uObj.email || '') : '';
          const uPhone = typeof uObj === 'object' ? (uObj.phone || '') : '';

          const targetId = user?._id || user?.userId || id;
          const targetEmail = user?.email || '';
          const targetPhone = user?.phone || '';

          if (uId && targetId && String(uId) === String(targetId)) return true;
          if (uEmail && targetEmail && uEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim()) return true;
          if (uPhone && targetPhone) {
            const clean1 = String(uPhone).replace(/\D/g, '');
            const clean2 = String(targetPhone).replace(/\D/g, '');
            if (clean1 && clean2 && (clean1 === clean2 || clean1.endsWith(clean2) || clean2.endsWith(clean1))) return true;
          }
          return false;
        };

        // Filter user logs from recent activities and live analytics activity stream
        const userLogs = [
          ...activities.filter(act => isTargetUser(act.user || act)),
          ...stream.filter(act => isTargetUser(act.user || act))
        ];

        // Filter user orders
        const userOrders = allOrders.filter(o => isTargetUser(o.user || o.customer || o));

        // Helper to match user in pre-aggregated viewers arrays
        const findUserViewer = (viewers) => {
          if (!Array.isArray(viewers)) return null;
          return viewers.find(v => isTargetUser(v.user || v));
        };

        // 1. Process Product Views & Interactions
        const productViewsMap = {};

        // A. From activity logs (views, cart adds, updates, removals)
        userLogs.forEach(log => {
          const action = (log.action || log.eventType || '').toUpperCase();
          const isProdAction = action.includes('PRODUCT') || action.includes('CART') || action.includes('VIEW');
          if (!isProdAction) return;

          const productId = log.details?.productId || log.productId || (typeof log.product === 'object' ? log.product?._id : log.product);
          if (!productId) return;

          const prod = productsList.find(p => String(p._id) === String(productId));
          const prodBrandId = typeof prod?.brand === 'object' ? prod.brand?._id : prod?.brand;
          const brandObj = brandsList.find(b => String(b._id) === String(prodBrandId));

          const eventTime = log.timestamp || log.createdAt || log.updatedAt;

          if (!productViewsMap[productId]) {
            productViewsMap[productId] = {
              id: productId,
              name: log.details?.productName || prod?.name || 'Product',
              image: prod?.images?.[0] || '',
              brand: prod?.brand?.name || brandObj?.name || 'N/A',
              count: 0,
              latestView: eventTime
            };
          }
          productViewsMap[productId].count += 1;
          if (eventTime && (!productViewsMap[productId].latestView || new Date(eventTime) > new Date(productViewsMap[productId].latestView))) {
            productViewsMap[productId].latestView = eventTime;
          }
        });

        // B. From pre-aggregated mostViewedProducts
        const mostViewedProducts = actRes.data?.mostViewedProducts || [];
        mostViewedProducts.forEach(item => {
          const prodId = item.product?._id || item.productId || item._id;
          if (!prodId) return;
          const viewer = findUserViewer(item.viewers);
          if (viewer) {
            const prod = productsList.find(p => String(p._id) === String(prodId));
            const prodBrandId = typeof prod?.brand === 'object' ? prod.brand?._id : prod?.brand;
            const brandObj = brandsList.find(b => String(b._id) === String(prodBrandId));
            const viewerTime = viewer.lastViewedAt || viewer.lastViewed || viewer.updatedAt || viewer.createdAt;

            if (!productViewsMap[prodId]) {
              productViewsMap[prodId] = {
                id: prodId,
                name: item.product?.name || prod?.name || 'Product',
                image: item.product?.images?.[0] || prod?.images?.[0] || '',
                brand: prod?.brand?.name || brandObj?.name || 'N/A',
                count: viewer.count || 1,
                latestView: viewerTime || user?.lastActive || null
              };
            } else {
              productViewsMap[prodId].count = Math.max(productViewsMap[prodId].count, viewer.count || 1);
              if (viewerTime && (!productViewsMap[prodId].latestView || new Date(viewerTime) > new Date(productViewsMap[prodId].latestView))) {
                productViewsMap[prodId].latestView = viewerTime;
              }
            }
          }
        });

        // C. From orders placed by this customer
        userOrders.forEach(o => {
          const items = o.items || o.orderItems || o.products || [];
          const oTime = o.createdAt || o.orderDate;
          items.forEach(it => {
            const prodId = it.product?._id || it.product || it.productId;
            if (!prodId) return;
            const prod = productsList.find(p => String(p._id) === String(prodId));
            const prodBrandId = typeof prod?.brand === 'object' ? prod.brand?._id : prod?.brand;
            const brandObj = brandsList.find(b => String(b._id) === String(prodBrandId));

            if (!productViewsMap[prodId]) {
              productViewsMap[prodId] = {
                id: prodId,
                name: it.product?.name || it.name || prod?.name || 'Product',
                image: it.image || it.variant?.images?.[0] || prod?.images?.[0] || '',
                brand: prod?.brand?.name || brandObj?.name || 'N/A',
                count: 1,
                latestView: oTime
              };
            } else {
              if (oTime && (!productViewsMap[prodId].latestView || new Date(oTime) > new Date(productViewsMap[prodId].latestView))) {
                productViewsMap[prodId].latestView = oTime;
              }
            }
          });
        });

        // 2. Process Brand Views
        const brandViewsMap = {};

        // A. From activity logs
        userLogs.forEach(log => {
          const action = (log.action || log.eventType || '').toUpperCase();
          const isBrandAction = action.includes('BRAND');
          let brandId = log.details?.brandId || log.details?.id || log.brandId;
          
          if (!brandId && log.details?.productId) {
            const prod = productsList.find(p => String(p._id) === String(log.details.productId));
            brandId = typeof prod?.brand === 'object' ? prod.brand?._id : prod?.brand;
          }

          if (!brandId) return;
          const brand = brandsList.find(b => String(b._id) === String(brandId));
          const eventTime = log.timestamp || log.createdAt || log.updatedAt;

          if (!brandViewsMap[brandId]) {
            brandViewsMap[brandId] = {
              id: brandId,
              name: brand?.name || 'Brand',
              logo: brand?.logo || '',
              count: 0,
              latestView: eventTime
            };
          }
          brandViewsMap[brandId].count += 1;
          if (eventTime && (!brandViewsMap[brandId].latestView || new Date(eventTime) > new Date(brandViewsMap[brandId].latestView))) {
            brandViewsMap[brandId].latestView = eventTime;
          }
        });

        // B. From pre-aggregated mostSearchedBrands
        const mostSearchedBrands = actRes.data?.mostSearchedBrands || [];
        mostSearchedBrands.forEach(item => {
          const brandId = item.brand?._id || item.brandId || item._id;
          if (!brandId) return;
          const viewer = findUserViewer(item.viewers);
          if (viewer) {
            const brand = brandsList.find(b => String(b._id) === String(brandId));
            const viewerTime = viewer.lastViewedAt || viewer.lastViewed || viewer.updatedAt || viewer.createdAt;

            if (!brandViewsMap[brandId]) {
              brandViewsMap[brandId] = {
                id: brandId,
                name: item.brand?.name || brand?.name || 'Brand',
                logo: item.brand?.logo || brand?.logo || '',
                count: viewer.count || 1,
                latestView: viewerTime || user?.lastActive || null
              };
            } else {
              brandViewsMap[brandId].count = Math.max(brandViewsMap[brandId].count, viewer.count || 1);
              if (viewerTime && (!brandViewsMap[brandId].latestView || new Date(viewerTime) > new Date(brandViewsMap[brandId].latestView))) {
                brandViewsMap[brandId].latestView = viewerTime;
              }
            }
          }
        });

        // 3. Process Category Views
        const categoryViewsMap = {};

        // A. From activity logs
        userLogs.forEach(log => {
          const action = (log.action || log.eventType || '').toUpperCase();
          let categoryId = log.details?.categoryId || log.details?.id || log.categoryId;
          
          if (!categoryId && log.details?.productId) {
            const prod = productsList.find(p => String(p._id) === String(log.details.productId));
            categoryId = typeof prod?.category === 'object' ? prod.category?._id : prod?.category;
          }

          if (!categoryId) return;
          const cat = categoriesList.find(c => String(c._id) === String(categoryId));
          const eventTime = log.timestamp || log.createdAt || log.updatedAt;

          if (!categoryViewsMap[categoryId]) {
            categoryViewsMap[categoryId] = {
              id: categoryId,
              name: cat?.name || 'Category',
              count: 0,
              latestView: eventTime
            };
          }
          categoryViewsMap[categoryId].count += 1;
          if (eventTime && (!categoryViewsMap[categoryId].latestView || new Date(eventTime) > new Date(categoryViewsMap[categoryId].latestView))) {
            categoryViewsMap[categoryId].latestView = eventTime;
          }
        });

        // B. From pre-aggregated mostSearchedCategories
        const mostSearchedCategories = actRes.data?.mostSearchedCategories || [];
        mostSearchedCategories.forEach(item => {
          const categoryId = item.category?._id || item.categoryId || item._id;
          if (!categoryId) return;
          const viewer = findUserViewer(item.viewers);
          if (viewer) {
            const cat = categoriesList.find(c => String(c._id) === String(categoryId));
            const viewerTime = viewer.lastViewedAt || viewer.lastViewed || viewer.updatedAt || viewer.createdAt;

            if (!categoryViewsMap[categoryId]) {
              categoryViewsMap[categoryId] = {
                id: categoryId,
                name: item.category?.name || cat?.name || 'Category',
                count: viewer.count || 1,
                latestView: viewerTime || user?.lastActive || null
              };
            } else {
              categoryViewsMap[categoryId].count = Math.max(categoryViewsMap[categoryId].count, viewer.count || 1);
              if (viewerTime && (!categoryViewsMap[categoryId].latestView || new Date(viewerTime) > new Date(categoryViewsMap[categoryId].latestView))) {
                categoryViewsMap[categoryId].latestView = viewerTime;
              }
            }
          }
        });

        // 4. Process Searches
        const searchesMap = {};

        // A. From activity logs
        userLogs.forEach(log => {
          const action = (log.action || log.eventType || '').toUpperCase();
          if (action === 'SEARCH' || action === 'SEARCH_QUERY') {
            const query = log.details?.query || log.details?.searchQuery || log.query;
            if (!query) return;
            const cleanQuery = String(query).trim();
            const eventTime = log.timestamp || log.createdAt || log.updatedAt;

            if (!searchesMap[cleanQuery]) {
              searchesMap[cleanQuery] = {
                query: cleanQuery,
                count: 0,
                latestSearch: eventTime
              };
            }
            searchesMap[cleanQuery].count += 1;
            if (eventTime && (!searchesMap[cleanQuery].latestSearch || new Date(eventTime) > new Date(searchesMap[cleanQuery].latestSearch))) {
              searchesMap[cleanQuery].latestSearch = eventTime;
            }
          }
        });

        // B. From pre-aggregated mostSearched
        const mostSearched = actRes.data?.mostSearched || [];
        mostSearched.forEach(item => {
          const viewer = findUserViewer(item.viewers);
          if (viewer) {
            const query = item.query;
            if (!query) return;
            const cleanQuery = String(query).trim();
            const viewerTime = viewer.lastViewedAt || viewer.lastViewed || viewer.updatedAt || viewer.createdAt;

            if (!searchesMap[cleanQuery]) {
              searchesMap[cleanQuery] = {
                query: cleanQuery,
                count: viewer.count || 1,
                latestSearch: viewerTime || user?.lastActive || null
              };
            } else {
              searchesMap[cleanQuery].count = Math.max(searchesMap[cleanQuery].count, viewer.count || 1);
              if (viewerTime && (!searchesMap[cleanQuery].latestSearch || new Date(viewerTime) > new Date(searchesMap[cleanQuery].latestSearch))) {
                searchesMap[cleanQuery].latestSearch = viewerTime;
              }
            }
          }
        });

        setUserActivities({
          products: Object.values(productViewsMap).sort((a, b) => {
            const dateA = a.latestView ? new Date(a.latestView).getTime() : 0;
            const dateB = b.latestView ? new Date(b.latestView).getTime() : 0;
            return dateB - dateA;
          }),
          brands: Object.values(brandViewsMap).sort((a, b) => {
            const dateA = a.latestView ? new Date(a.latestView).getTime() : 0;
            const dateB = b.latestView ? new Date(b.latestView).getTime() : 0;
            return dateB - dateA;
          }),
          categories: Object.values(categoryViewsMap).sort((a, b) => {
            const dateA = a.latestView ? new Date(a.latestView).getTime() : 0;
            const dateB = b.latestView ? new Date(b.latestView).getTime() : 0;
            return dateB - dateA;
          }),
          searches: Object.values(searchesMap).sort((a, b) => {
            const dateA = a.latestSearch ? new Date(a.latestSearch).getTime() : 0;
            const dateB = b.latestSearch ? new Date(b.latestSearch).getTime() : 0;
            return dateB - dateA;
          })
        });

        const actUsers = actRes.data?.users || [];
        const match = actUsers.find(au => au.userId === user._id || (au.email && user.email && au.email.toLowerCase() === user.email.toLowerCase()));

        const loginCount = userLogs.filter(act => (act.action || '').toUpperCase() === 'LOGIN').length;

        setUser(prev => prev ? {
          ...prev,
          activityStats: match?.activityStats || prev.activityStats || null,
          lastLoginAt: prev.lastLoginAt || match?.lastLoginAt,
          notificationsEnabled: prev.notificationsEnabled !== undefined ? prev.notificationsEnabled : match?.notificationsEnabled,
          isAppInstalled: prev.isAppInstalled !== undefined ? prev.isAppInstalled : match?.isAppInstalled,
          loginCount: loginCount || match?.activityStats?.logins || prev.loginCount || 0
        } : null);
      } catch (err) {
        console.error('Failed to process user activities:', err);
      } finally {
        if (!isPoll) setLoadingActivities(false);
      }
    };

    fetchActivitiesData(false);
    const intervalId = setInterval(() => {
      fetchActivitiesData(true);
    }, 30000);

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
      const recentActivities = actResponse.data?.recentActivities || [];

      let foundUser = allUsers.find(u => u._id === id);
      if (foundUser) {
        const match = actUsers.find(au => au.userId === foundUser._id || (au.email && foundUser.email && au.email.toLowerCase() === foundUser.email.toLowerCase()));

        const rawAppVersion = foundUser.appVersion || match?.appVersion;
        const matchedAppVersion = hasValidAppVersion(rawAppVersion) ? rawAppVersion : null;
        const matchedDevices = (foundUser.devices && foundUser.devices.length > 0) ? foundUser.devices : (foundUser.registeredDevices && foundUser.registeredDevices.length > 0) ? foundUser.registeredDevices : (match?.devices || []);

        const userHasAppOrDevice = Boolean(matchedAppVersion || (Array.isArray(matchedDevices) && matchedDevices.length > 0));

        const rawLastActive = foundUser.lastActive || match?.lastActive;
        const lastActive = userHasAppOrDevice ? rawLastActive : null;
        const isOnline = userHasAppOrDevice ? (foundUser.isOnline !== undefined ? foundUser.isOnline : (lastActive ? (new Date() - new Date(lastActive) < 5 * 60 * 1000) : false)) : false;

        const loginCount = recentActivities.filter(act => {
          const actUserId = act.user?._id || (typeof act.user === 'string' ? act.user : null);
          const actUserEmail = act.user?.email;
          const isUserMatch = (actUserId && actUserId === foundUser._id) || (actUserEmail && foundUser.email && actUserEmail.toLowerCase() === foundUser.email.toLowerCase());
          return isUserMatch && (act.action || '').toUpperCase() === 'LOGIN';
        }).length;

        foundUser = {
          ...foundUser,
          activityStats: match?.activityStats || foundUser.activityStats || null,
          lastActive,
          isOnline,
          hasAppOrDevice: userHasAppOrDevice,
          lastLoginAt: foundUser.lastLoginAt || match?.lastLoginAt,
          appVersion: matchedAppVersion,
          devices: matchedDevices,
          notificationsEnabled: foundUser.notificationsEnabled !== undefined ? foundUser.notificationsEnabled : match?.notificationsEnabled,
          isAppInstalled: foundUser.isAppInstalled !== undefined ? foundUser.isAppInstalled : match?.isAppInstalled,
          loginCount
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
    }, 30000);

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

  const handleDelete = async () => {
    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.put(`/admin/soft-delete/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showAlert('User deleted successfully.');
      setTimeout(() => navigate('/users/list'), 1500);
    } catch (err) {
      console.error('Delete error:', err);
      showAlert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await api.put(`/admin/reactivate/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser((prev) => prev ? { ...prev, deleteRequested: false } : null);
      showAlert(response.data?.message || 'Account reactivated successfully.');
    } catch (err) {
      console.error('Reactivate error:', err);
      showAlert(err.response?.data?.message || 'Failed to reactivate user.');
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

  //user logout
  const handleForceLogout = async () => {
    const isConfirmed = await confirm(`Are you sure you want to force logout ${user?.name}? This will invalidate all active sessions for this user.`);
    if (!isConfirmed) return;

    setIsActionLoading(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      await api.post(`/admin/users/${id}/logout`, {}, {
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
    <div className="relative space-y-6 min-h-full z-0 isolate w-full pb-8">


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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Database User ID</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-white font-mono text-xs font-semibold select-all">{user._id}</span>
                  <CopyButton text={user._id} className="text-slate-400 hover:text-white" size={10} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Created At</p>
                <p className="text-white font-medium text-base">{user.createdAt ? formatDateTimeDDMMYYYY(user.createdAt) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Updated At</p>
                <p className="text-white font-medium text-base">{user.updatedAt ? formatDateTimeDDMMYYYY(user.updatedAt) : 'N/A'}</p>
              </div>
            </div>

            {/* Business & KYC Details */}
            <div className="mt-6 pt-4 border-t border-white/10">
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
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex border-b border-white/10 gap-6 mb-6 overflow-x-auto scrollbar-none">
            {[
              { id: 'sessions', name: 'App Usage & Sessions', icon: <FiActivity /> },
              { id: 'devices', name: 'Registered Devices', icon: <FiSmartphone /> },
              { id: 'activity', name: 'Customer Browsing Activity', icon: <FiEye /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSectionTab(tab.id)}
                className={`pb-3 font-bold text-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeSectionTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>

          {activeSectionTab === 'sessions' && (
            <div className="space-y-6">
              {/* 1. App Status & Security Overview */}
              <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <FiSmartphone className="text-blue-400" /> App Status & Security Overview
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {/* Online Status */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connection</span>
                    <div className="mt-2">
                      {user.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 text-xs font-semibold border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* App Version */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">App Version</span>
                    <p className="text-xs font-black font-mono text-white mt-2">
                      {hasValidAppVersion(user.appVersion) ? `v${user.appVersion}` : 'N/A'}
                    </p>
                  </div>

                  {/* App Installation */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Installation</span>
                    <div className="mt-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${checkAppStatus(user) === 'uninstalled'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : checkAppStatus(user) === 'installed'
                            ? 'bg-teal-500/15 text-teal-400 border-teal-500/30'
                            : 'bg-slate-800 text-slate-400 border-white/5'
                        }`}>
                        {checkAppStatus(user) === 'uninstalled' ? 'Uninstalled' : checkAppStatus(user) === 'installed' ? 'Installed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* App Lock */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">App Lock</span>
                    <p className={`text-xs font-extrabold mt-2 ${user.isAppLockEnabled ? 'text-teal-400' : 'text-slate-400'}`}>
                      {user.isAppLockEnabled ? 'Secured' : 'Inactive'}
                    </p>
                  </div>

                  {/* Push Alerts */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Push Alerts</span>
                    <p className={`text-xs font-extrabold mt-2 ${user.notificationsEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {user.notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>

                  {/* Password Setup */}
                  <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Password</span>
                    <p className="text-xs font-extrabold text-white mt-2 capitalize">
                      {user.passwordSetupStatus?.replace('_', ' ') || 'Not Sent'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Connection & Timestamps Card */}
              <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <FiClock className="text-indigo-400" /> Connection & Session Timeline
                </h4>

                <div className="flex flex-wrap justify-evenly gap-4">
                  {/* Last Active Connection */}
                  <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Last Active Connection</span>
                      <p className="text-xs font-mono font-bold text-white select-all">
                        {isLastActiveValid(user.lastActive, user)
                          ? formatDateTimeDDMMYYYY(user.lastActive)
                          : 'Not Active'}
                      </p>
                    </div>
                    {isLastActiveValid(user.lastActive, user) ? (
                      <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg font-mono font-bold shrink-0">
                        {formatRelativeTime(user.lastActive, user)}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-500 border border-white/5 px-2.5 py-1 rounded-lg font-bold shrink-0">
                        Not Active
                      </span>
                    )}
                  </div>

                  {/* Last Login Authorization */}
                  <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Last Session Login</span>
                      <p className="text-xs font-mono font-bold text-white select-all">
                        {user.lastLoginAt ? formatDateTimeDDMMYYYY(user.lastLoginAt) : 'No recorded login'}
                      </p>
                    </div>
                    {user.lastLoginMethod ? (
                      <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider shrink-0">
                        via {user.lastLoginMethod}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-500 border border-white/5 px-2.5 py-1 rounded-lg font-bold shrink-0">
                        {user.lastLoginAt ? 'Standard Login' : 'N/A'}
                      </span>
                    )}
                  </div>

                  {/* Installed At */}
                  {hasAppOrDevice(user) && user.isAppInstalled && user.installedAt && (
                    <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">App Installed Date</span>
                        <p className="text-xs font-mono font-bold text-white select-all">{formatDateTimeDDMMYYYY(user.installedAt)}</p>
                      </div>
                      <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg font-mono font-bold shrink-0">
                        {formatRelativeTime(user.installedAt, user)}
                      </span>
                    </div>
                  )}

                  {/* Uninstalled At */}
                  {user.uninstalledAt && (
                    <div className="p-4 bg-slate-950/30 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">App Uninstalled Date</span>
                        <p className="text-xs font-mono font-bold text-white select-all">{formatDateTimeDDMMYYYY(user.uninstalledAt)}</p>
                      </div>
                      <span className="text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg font-mono font-bold shrink-0">
                        {formatRelativeTime(user.uninstalledAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Usage & Engagement Metrics */}
              <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <FiActivity className="text-emerald-400" /> Usage & Engagement Metrics
                </h4>

                {(() => {
                  const productViewsCount = user.activityStats?.productViews ?? userActivities.products.reduce((sum, item) => sum + (item.count || 0), 0);
                  const brandViewsCount = user.activityStats?.brandViews ?? userActivities.brands.reduce((sum, item) => sum + (item.count || 0), 0);
                  const categoryViewsCount = user.activityStats?.categoryViews ?? userActivities.categories.reduce((sum, item) => sum + (item.count || 0), 0);
                  const searchQueriesCount = user.activityStats?.searches ?? userActivities.searches.reduce((sum, item) => sum + (item.count || 0), 0);
                  const totalLoginsCount = user.loginCount || user.activityStats?.logins || 0;
                  const totalActionsCount = user.activityStats?.totalEngagement || user.activityStats?.totalActions || (totalLoginsCount + productViewsCount + brandViewsCount + categoryViewsCount + searchQueriesCount);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {/* Login Count */}
                      <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Logins</span>
                        <p className="text-lg font-extrabold text-white mt-1 font-mono">{totalLoginsCount}</p>
                      </div>

                      {/* Product Views */}
                      <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Product Views</span>
                        <p className="text-lg font-extrabold text-blue-400 mt-1 font-mono">{productViewsCount}</p>
                      </div>

                      {/* Brand Views */}
                      <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Brand Views</span>
                        <p className="text-lg font-extrabold text-indigo-400 mt-1 font-mono">{brandViewsCount}</p>
                      </div>

                      {/* Category Views */}
                      <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Category Views</span>
                        <p className="text-lg font-extrabold text-purple-400 mt-1 font-mono">{categoryViewsCount}</p>
                      </div>

                      {/* Search Queries */}
                      <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Search Queries</span>
                        <p className="text-lg font-extrabold text-teal-400 mt-1 font-mono">{searchQueriesCount}</p>
                      </div>

                      {/* Total Engagement */}
                      <div className="p-3.5 bg-black/20 border border-white/5 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Actions</span>
                        <p className="text-lg font-extrabold text-emerald-400 mt-1 font-mono">{totalActionsCount}</p>
                      </div>
                    </div>
                  );
                })()}
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
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${device.notificationsEnabled
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
                          <p className="text-slate-300 font-medium">{device.lastActive ? formatDateTimeDDMMYYYY(device.lastActive) : 'N/A'}</p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSectionTab === 'activity' && (
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-4 sm:p-6 relative overflow-hidden space-y-6">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FiActivity className="text-blue-400" /> Customer Browsing Activity
                </h4>
              </div>

              {/* Tabs with smooth horizontal scroll on mobile & no redundant icon dots */}
              <div className="flex border-b border-white/10 gap-4 sm:gap-6 overflow-x-auto scrollbar-none pb-px">
                {[
                  { id: 'products', name: 'Viewed Products' },
                  { id: 'brands', name: 'Viewed Brands' },
                  { id: 'categories', name: 'Viewed Categories' },
                  { id: 'searches', name: 'Search Queries' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveActivityTab(tab.id)}
                    className={`pb-3 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeActivityTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
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
                                    <div 
                                      onClick={() => {
                                        if (item.id) {
                                          setViewModalProductId(item.id);
                                        }
                                      }}
                                      className={`w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5 ${item.id ? 'cursor-pointer hover:scale-110 hover:border-blue-500/50 transition-all shadow-sm' : ''}`}
                                      title={item.id ? "View Product Details" : undefined}
                                    >
                                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div 
                                      onClick={() => {
                                        if (item.id) {
                                          setViewModalProductId(item.id);
                                        }
                                      }}
                                      className={`w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0 ${item.id ? 'cursor-pointer hover:scale-110 hover:border-blue-500/50 transition-all shadow-sm' : ''}`}
                                      title={item.id ? "View Product Details" : undefined}
                                    >
                                      <FiFileText />
                                    </div>
                                  )}
                                  <span className="font-semibold text-sm text-white line-clamp-1 max-w-[200px]" title={item.name}>{item.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-sm text-slate-300 font-medium">{item.brand}</td>
                              <td className="p-3 text-center font-bold text-sm text-blue-400">{item.count}</td>
                              <td className="p-3 text-right text-xs text-slate-400 font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                              <td className="p-3 text-right text-xs text-slate-400 font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                              <td className="p-3 text-right text-xs text-slate-400 font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                              <td className="p-3 text-right text-xs text-slate-400 font-medium">{formatDateTimeDDMMYYYY(item.latestSearch)}</td>
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
          <div className="bg-red-500/5 border border-red-500/25 shadow-2xl rounded-3xl p-4 sm:p-6 relative overflow-hidden">
            <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Danger Zone</h4>
            <p className="text-slate-400 text-xs mb-4">Manage security and account status for this user.</p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Force Logout Button */}
              <button
                onClick={handleForceLogout}
                disabled={isActionLoading}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 text-white font-bold rounded-xl transition-all cursor-pointer text-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-md hover:shadow-amber-500/20 active:scale-[0.99]"
              >
                <FiRefreshCcw className="mr-2 text-base shrink-0" /> Force Logout User
              </button>

              {/* Delete / Reactivate Account Button */}
              {user?.deleteRequested ? (
                <button
                  onClick={handleReactivate}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 text-white font-bold rounded-xl transition-all cursor-pointer text-sm bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-emerald-500/20 active:scale-[0.99]"
                >
                  <FiRefreshCcw className="mr-2 text-base shrink-0" /> Reactivate User Account
                </button>
              ) : (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 text-white font-bold rounded-xl transition-all cursor-pointer text-sm bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md hover:shadow-rose-500/20 active:scale-[0.99]"
                >
                  <FiTrash2 className="mr-2 text-base shrink-0" /> Delete User Account
                </button>
              )}
            </div>
          </div>

        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && user && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setTypedConfirmName(''); }}></div>
          <div className="relative bg-slate-900 border border-red-500/20 rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              This action cannot be undone. To permanently delete the user account for <strong className="text-white">"{user.name}"</strong>, please type their name below to proceed:
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
                onClick={() => { setDeleteConfirmOpen(false); setTypedConfirmName(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={typedConfirmName !== user.name}
                onClick={() => {
                  handleDelete();
                  setDeleteConfirmOpen(false);
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

      {/* In-Page Product Details Modal */}
      <ProductDetailsModal
        isOpen={!!viewModalProductId}
        productId={viewModalProductId}
        onClose={() => setViewModalProductId(null)}
        showEditButton={false}
      />

    </div>
  );
};

export default UserDetails;
