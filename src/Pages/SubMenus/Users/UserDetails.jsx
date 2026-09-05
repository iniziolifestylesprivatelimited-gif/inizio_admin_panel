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
  FiRefreshCcw, FiCopy, FiShield, FiLock, FiUnlock, FiLogOut, FiCheckCircle, FiCalendar,
  FiPhone, FiExternalLink, FiHash, FiShoppingBag, FiBox
} from 'react-icons/fi';
import { DiAndroid, DiApple } from 'react-icons/di';
import { useConfirm } from '../../../Context/ConfirmationContext';
import ProductDetailsModal from '../../../Components/ProductDetailsModal';
import GmailLink from '../../../Components/GmailLink';

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

const getOrderStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'shipped': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
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
  const [customerOrders, setCustomerOrders] = useState([]);
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
        const isTargetUser = (uObj, o = null) => {
          if (!uObj && !o) return false;
          const uId = typeof uObj === 'string' ? uObj : (uObj?._id || uObj?.userId || uObj?.id);
          const uEmail = typeof uObj === 'object' ? (uObj?.email || '') : '';
          const uPhone = typeof uObj === 'object' ? (uObj?.phone || '') : '';

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

          if (o) {
            const oUserId = o.userId || o.user?._id || (typeof o.user === 'string' ? o.user : null);
            if (oUserId && targetId && String(oUserId) === String(targetId)) return true;

            const oEmail = o.email || o.shippingAddress?.email || o.address?.email || o.user?.email || '';
            if (oEmail && targetEmail && oEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim()) return true;

            const oPhone = o.phone || o.shippingAddress?.phone || o.address?.phone || o.user?.phone || '';
            if (oPhone && targetPhone) {
              const cleanO = String(oPhone).replace(/\D/g, '');
              const cleanT = String(targetPhone).replace(/\D/g, '');
              if (cleanO && cleanT && (cleanO === cleanT || cleanO.endsWith(cleanT) || cleanT.endsWith(cleanO))) return true;
            }
          }

          return false;
        };

        // Filter user logs from recent activities and live analytics activity stream
        const userLogs = [
          ...activities.filter(act => isTargetUser(act.user || act)),
          ...stream.filter(act => isTargetUser(act.user || act))
        ];

        // Filter user orders
        const matchedOrders = allOrders
          .filter(o => isTargetUser(o.user || o.customer, o))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setCustomerOrders(matchedOrders);
        const userOrders = matchedOrders;

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
  }, [user?._id, user?.email, user?.phone]);

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
    <div className="relative space-y-2 min-h-full z-0 isolate w-full pb-10">

      {/* Header & Back Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <button
            onClick={() => navigate('/users/list')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer mb-2.5 active:scale-95"
          >
            <FiArrowLeft size={14} /> Back to Users List
          </button>
          {/* <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <FiUser className="text-blue-400" />
              <span>User Profile</span>
            </h1>
            {user && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                user.deleteRequested
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : (user.isApproved || user.userId)
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {user.deleteRequested ? 'Deleted' : (user.isApproved || user.userId) ? 'Active & Approved' : 'Pending KYC'}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">Detailed customer information, app telemetry, devices, and browsing activity.</p> */}
        </div>

        {/* {user && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={handleForceLogout}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Force logout from all active sessions"
            >
              <FiLogOut size={14} /> Force Logout
            </button>
            {user.deleteRequested ? (
              <button
                onClick={handleReactivate}
                disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <FiRefreshCcw size={14} /> Reactivate Account
              </button>
            ) : (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <FiTrash2 size={14} /> Delete Account
              </button>
            )}
          </div>
        )} */}
      </div>

      {/* Loading & Error States */}
      {loading && !user ? (
        <div className="h-72 flex flex-col justify-center items-center bg-slate-950/20 border border-white/10 rounded-3xl shadow-xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-3" />
          <p className="text-slate-400 font-semibold text-sm">Loading user details...</p>
        </div>
      ) : error ? (
        <div className="text-rose-400 bg-rose-500/10 p-6 rounded-3xl border border-rose-500/25 flex items-center gap-4 shadow-xl">
          <FiAlertCircle className="text-2xl shrink-0 text-rose-400" />
          <div>
            <p className="font-bold text-base text-rose-300">Error Loading Profile</p>
            <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      ) : user ? (
        <div className="space-y-6 w-full">

          {/* Core User Information Hero Card */}
          <div className="relative bg-slate-950/50 border border-white/20 rounded-3xl p-6 shadow-2xl overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-92 h-92 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Profile Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/20">
              <div className="flex items-start sm:items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-2xl sm:text-3xl font-black text-blue-400 shadow-inner shrink-0 select-none">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name || 'Anonymous User'}</h2>
                    
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {user.role || 'customer'}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-white/10">
                      Tier: {user.businessType || 'L1'}
                    </span>

                    {user.isOnline ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-white/5 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        Offline
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    {/* Email with GmailLink & CopyButton */}
                    <div className="flex items-center gap-1.5">
                      <GmailLink email={user.email} showIcon={true} iconSize={13} className="text-slate-300 hover:text-blue-400 font-medium" />
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">•</span>
                        <FiPhone size={12} className="text-slate-500" />
                        <span className="text-slate-300 font-mono font-medium">{user.phone}</span>
                        <CopyButton text={user.phone} size={11} className="text-slate-500 hover:text-white" title="Copy Phone" />
                      </div>
                    )}

                    {user.createdAt && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="text-slate-600">•</span>
                        <FiCalendar size={12} className="text-slate-500" />
                        <span>Joined {formatDateDDMMYYYY(user.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ID summary chips */}
              <div className="flex items-center gap-3 self-start lg:self-auto bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
                {(user.isApproved || user.userId) && user.userId ? (
                  <div className="pr-3 border-r border-white/10">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Generated User ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-emerald-400 font-black text-sm select-all">{user.userId}</span>
                      <CopyButton text={user.userId} size={11} className="text-emerald-400 hover:text-emerald-300" title="Copy User ID" />
                    </div>
                  </div>
                ) : null}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Database ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-slate-300 text-xs font-semibold select-all truncate max-w-[130px]" title={user._id}>{user._id}</span>
                    <CopyButton text={user._id} size={11} className="text-slate-400 hover:text-white" title="Copy DB ID" />
                  </div>
                </div>
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Account Information */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiUser className="text-blue-400" /> Account Profile Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Full Name</span>
                    <p className="text-white font-semibold text-sm mt-1">{user.name || 'N/A'}</p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Role</span>
                    <p className="text-white font-semibold text-sm mt-1 capitalize">{user.role || 'customer'}</p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Phone Number</span>
                    <p className="text-white font-semibold text-sm mt-1 font-mono">{user.phone || 'Not Provided'}</p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Email Address</span>
                    <div className="mt-1">
                      <GmailLink email={user.email} className="text-white hover:text-blue-400 text-sm" />
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Account Created</span>
                    <p className="text-slate-300 font-semibold text-xs mt-1 font-mono">{user.createdAt ? formatDateTimeDDMMYYYY(user.createdAt) : 'N/A'}</p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Last Updated</span>
                    <p className="text-slate-300 font-semibold text-xs mt-1 font-mono">{user.updatedAt ? formatDateTimeDDMMYYYY(user.updatedAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Business & Verification */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiShield className="text-emerald-400" /> Business & KYC Verification
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Business Type</span>
                    <div className="mt-1.5">
                      <span className="bg-slate-800/90 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                        {user.businessType || 'L1'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">KYC Status</span>
                    <div className="mt-1.5">
                      {(user.isApproved || user.userId) ? (
                        <span className="text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
                          <FiCheckCircle className="text-emerald-400" /> Verified & Approved
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold inline-flex items-center gap-1.5">
                          <FiLoader className="animate-spin text-amber-400" /> Pending Review
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GST Number</span>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-white font-mono font-bold text-sm tracking-wide select-all">
                        {user.gstNumber || 'Not Provided'}
                      </span>
                      {user.gstNumber && (
                        <CopyButton text={user.gstNumber} size={12} className="text-slate-400 hover:text-white" title="Copy GST Number" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GST Certificate / Document</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {user.gstDocument ? 'Official document uploaded by customer' : 'No document uploaded yet'}
                      </p>
                    </div>
                    {user.gstDocument ? (
                      <a
                        href={getDocumentUrl(user.gstDocument)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 rounded-xl font-bold text-xs transition-all shrink-0 active:scale-95 shadow-sm"
                      >
                        <FiFileText size={14} /> View Document
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 italic bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/10">
                        No Document
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Navigation Section Tabs */}
          <div className="flex items-center gap-2 border-b border-white/20 pb-3 overflow-x-auto scrollbar-none">
            {[
              { id: 'sessions', name: 'App Usage & Sessions', icon: FiActivity, badge: user.isOnline ? 'Online' : null },
              { id: 'devices', name: 'Registered Devices', icon: FiSmartphone, badge: user.devices?.length || 0 },
              { id: 'activity', name: 'Browsing Activity', icon: FiEye, badge: (userActivities.products.length + userActivities.brands.length) || null },
              { id: 'orders', name: 'Orders', icon: FiShoppingBag, badge: customerOrders.length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSectionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSectionTab(tab.id)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.name}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-blue-500/25 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 1. App Usage & Sessions Tab */}
          {activeSectionTab === 'sessions' && (
            <div className="space-y-6">
              {/* App Status & Security Overview */}
              <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/20 pb-3">
                  <FiSmartphone className="text-blue-400" /> App Status & Security Overview
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {/* Online Status */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Connection</span>
                    <div className="mt-2.5">
                      {user.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* App Version */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Version</span>
                    <p className="text-xs font-black font-mono text-white mt-2.5">
                      {hasValidAppVersion(user.appVersion) ? `v${user.appVersion}` : 'N/A'}
                    </p>
                  </div>

                  {/* App Installation */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Installation</span>
                    <div className="mt-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        checkAppStatus(user) === 'uninstalled'
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
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Lock</span>
                    <p className={`text-xs font-extrabold mt-2.5 ${user.isAppLockEnabled ? 'text-teal-400' : 'text-slate-400'}`}>
                      {user.isAppLockEnabled ? 'Secured' : 'Inactive'}
                    </p>
                  </div>

                  {/* Push Alerts */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Push Alerts</span>
                    <p className={`text-xs font-extrabold mt-2.5 ${user.notificationsEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {user.notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>

                  {/* Password Setup */}
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Password</span>
                    <p className="text-xs font-extrabold text-white mt-2.5 capitalize truncate">
                      {user.passwordSetupStatus?.replace('_', ' ') || 'Not Sent'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection & Timestamps Card */}
              <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/20 pb-3">
                  <FiClock className="text-indigo-400" /> Connection & Session Timeline
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Last Active Connection */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Active Connection</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-white select-all">
                        {isLastActiveValid(user.lastActive, user)
                          ? formatDateTimeDDMMYYYY(user.lastActive)
                          : 'Not Active'}
                      </p>
                      {isLastActiveValid(user.lastActive, user) ? (
                        <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
                          {formatRelativeTime(user.lastActive, user)}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-500 border border-white/5 px-2 py-0.5 rounded-lg font-bold shrink-0">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Login Authorization */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last Session Login</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-white select-all">
                        {user.lastLoginAt ? formatDateTimeDDMMYYYY(user.lastLoginAt) : 'No recorded login'}
                      </p>
                      {user.lastLoginMethod ? (
                        <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider shrink-0">
                          via {user.lastLoginMethod}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-500 border border-white/5 px-2 py-0.5 rounded-lg font-bold shrink-0">
                          {user.lastLoginAt ? 'Standard' : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Installed At */}
                  {hasAppOrDevice(user) && user.isAppInstalled && user.installedAt && (
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Installed Date</span>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono font-bold text-white select-all">{formatDateTimeDDMMYYYY(user.installedAt)}</p>
                        <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
                          {formatRelativeTime(user.installedAt, user)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Uninstalled At */}
                  {user.uninstalledAt && (
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col justify-between gap-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">App Uninstalled Date</span>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono font-bold text-white select-all">{formatDateTimeDDMMYYYY(user.uninstalledAt)}</p>
                        <span className="text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
                          {formatRelativeTime(user.uninstalledAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage & Engagement Metrics */}
              <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/20 pb-3">
                  <FiActivity className="text-emerald-400" /> Usage & Engagement Metrics
                </h3>

                {(() => {
                  const productViewsCount = user.activityStats?.productViews ?? userActivities.products.reduce((sum, item) => sum + (item.count || 0), 0);
                  const brandViewsCount = user.activityStats?.brandViews ?? userActivities.brands.reduce((sum, item) => sum + (item.count || 0), 0);
                  const categoryViewsCount = user.activityStats?.categoryViews ?? userActivities.categories.reduce((sum, item) => sum + (item.count || 0), 0);
                  const searchQueriesCount = user.activityStats?.searches ?? userActivities.searches.reduce((sum, item) => sum + (item.count || 0), 0);
                  const totalLoginsCount = user.loginCount || user.activityStats?.logins || 0;
                  const totalActionsCount = user.activityStats?.totalEngagement || user.activityStats?.totalActions || (totalLoginsCount + productViewsCount + brandViewsCount + categoryViewsCount + searchQueriesCount);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Logins</span>
                        <p className="text-xl font-black text-white mt-1.5 font-mono">{totalLoginsCount}</p>
                      </div>

                      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Product Views</span>
                        <p className="text-xl font-black text-blue-400 mt-1.5 font-mono">{productViewsCount}</p>
                      </div>

                      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Brand Views</span>
                        <p className="text-xl font-black text-indigo-400 mt-1.5 font-mono">{brandViewsCount}</p>
                      </div>

                      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Category Views</span>
                        <p className="text-xl font-black text-purple-400 mt-1.5 font-mono">{categoryViewsCount}</p>
                      </div>

                      <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Search Queries</span>
                        <p className="text-xl font-black text-teal-400 mt-1.5 font-mono">{searchQueriesCount}</p>
                      </div>

                      <div className="p-4 bg-emerald-500/[0.08] border border-emerald-500/25 rounded-2xl text-center shadow-inner">
                        <span className="text-[10px] text-emerald-400/90 font-bold uppercase tracking-wider block">Total Actions</span>
                        <p className="text-xl font-black text-emerald-400 mt-1.5 font-mono">{totalActionsCount}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 2. Registered Devices Tab */}
          {activeSectionTab === 'devices' && (
            <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-white/20 pb-3">
                <span className="flex items-center gap-2">
                  <FiSmartphone className="text-blue-400" /> Registered Devices
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Total: {user.devices?.length || 0}</span>
              </h3>

              {!user.devices || user.devices.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                  <FiSmartphone size={32} className="text-slate-600" />
                  <p className="text-xs italic font-medium">No registered devices found for this account.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {user.devices.map((device, idx) => {
                    const platform = device.devicePlatform?.toLowerCase();
                    const isAndroid = platform === 'android';
                    const isApple = platform === 'ios' || platform === 'apple';

                    return (
                      <div key={device._id || idx} className="p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-2xl space-y-3 transition-all shadow-sm">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                              {isAndroid ? (
                                <DiAndroid size={18} className="text-green-400" />
                              ) : isApple ? (
                                <DiApple size={18} className="text-slate-200" />
                              ) : platform === 'tablet' ? (
                                <FiTablet size={16} className="text-purple-400" />
                              ) : (
                                <FiSmartphone size={16} className="text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-bold truncate text-sm">{device.deviceModel || 'Unknown Device'}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{device.devicePlatform || 'N/A'}</p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            device.notificationsEnabled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border border-white/5'
                          }`}>
                            {device.notificationsEnabled ? 'Push ON' : 'Push OFF'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">App Version</span>
                            <span className="text-white font-mono font-bold text-xs">v{device.appVersion || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Last Active</span>
                            <span className="text-slate-300 font-medium text-xs truncate block">
                              {device.lastActive ? formatRelativeTime(device.lastActive, user) : 'N/A'}
                            </span>
                          </div>

                          <div className="col-span-2 pt-1 border-t border-white/10">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Device Token / ID</span>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span className="text-slate-400 font-mono text-[10px] truncate" title={device.deviceId || device.fcmToken}>
                                {device.deviceId || device.fcmToken || 'N/A'}
                              </span>
                              {(device.deviceId || device.fcmToken) && (
                                <CopyButton text={device.deviceId || device.fcmToken} size={11} className="text-slate-500 hover:text-white" title="Copy Device Token" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Customer Browsing Activity Tab */}
          {activeSectionTab === 'activity' && (
            <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-5">
              <div className="border-b border-white/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiEye className="text-blue-400" /> Customer Browsing Activity
                </h3>
              </div>

              {/* Sub tabs for activity categories */}
              <div className="flex border-b border-white/10 gap-2 overflow-x-auto scrollbar-none pb-2">
                {[
                  { id: 'products', name: 'Viewed Products', count: userActivities.products.length },
                  { id: 'brands', name: 'Viewed Brands', count: userActivities.brands.length },
                  { id: 'categories', name: 'Viewed Categories', count: userActivities.categories.length },
                  { id: 'searches', name: 'Search Queries', count: userActivities.searches.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveActivityTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
                      activeActivityTab === tab.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/10'
                    }`}
                  >
                    <span>{tab.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                      activeActivityTab === tab.id ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {loadingActivities ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                  <span className="text-xs font-medium">Processing activity logs...</span>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-auto custom-scrollbar rounded-2xl border border-white/10 bg-white/[0.02]">
                  {activeActivityTab === 'products' && (
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Product</th>
                          <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Brand</th>
                          <th className="p-3.5 text-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Views Count</th>
                          <th className="p-3.5 text-right sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Latest View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {userActivities.products.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-xs text-slate-500 italic">No products viewed by this user.</td>
                          </tr>
                        ) : (
                          userActivities.products.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  {item.image ? (
                                    <div 
                                      onClick={() => item.id && setViewModalProductId(item.id)}
                                      className={`w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5 ${item.id ? 'cursor-pointer hover:scale-105 hover:border-blue-500/50 transition-all shadow-sm' : ''}`}
                                      title={item.id ? "View Product Details" : undefined}
                                    >
                                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div 
                                      onClick={() => item.id && setViewModalProductId(item.id)}
                                      className={`w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0 ${item.id ? 'cursor-pointer hover:scale-105 hover:border-blue-500/50 transition-all shadow-sm' : ''}`}
                                      title={item.id ? "View Product Details" : undefined}
                                    >
                                      <FiFileText />
                                    </div>
                                  )}
                                  <span 
                                    onClick={() => item.id && setViewModalProductId(item.id)}
                                    className={`font-semibold text-sm text-white line-clamp-1 max-w-[240px] ${item.id ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                                    title={item.name}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-sm text-slate-300 font-medium">{item.brand}</td>
                              <td className="p-3.5 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  {item.count}
                                </span>
                              </td>
                              <td className="p-3.5 text-right text-xs text-slate-400 font-mono font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                          <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Brand Name</th>
                          <th className="p-3.5 text-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Views Count</th>
                          <th className="p-3.5 text-right sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Latest View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {userActivities.brands.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-8 text-center text-xs text-slate-500 italic">No brands viewed by this user.</td>
                          </tr>
                        ) : (
                          userActivities.brands.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="p-3.5">
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
                              <td className="p-3.5 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  {item.count}
                                </span>
                              </td>
                              <td className="p-3.5 text-right text-xs text-slate-400 font-mono font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                          <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Category</th>
                          <th className="p-3.5 text-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Views Count</th>
                          <th className="p-3.5 text-right sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Latest View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {userActivities.categories.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-8 text-center text-xs text-slate-500 italic">No categories viewed by this user.</td>
                          </tr>
                        ) : (
                          userActivities.categories.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="p-3.5">
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
                              <td className="p-3.5 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  {item.count}
                                </span>
                              </td>
                              <td className="p-3.5 text-right text-xs text-slate-400 font-mono font-medium">{formatDateTimeDDMMYYYY(item.latestView)}</td>
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
                          <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Search Query</th>
                          <th className="p-3.5 text-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Search Count</th>
                          <th className="p-3.5 text-right sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Latest Search</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {userActivities.searches.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-8 text-center text-xs text-slate-500 italic">No search queries logged by this user.</td>
                          </tr>
                        ) : (
                          userActivities.searches.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                                    <FiSearch size={14} />
                                  </div>
                                  <span className="font-semibold text-sm text-white font-mono">{item.query}</span>
                                </div>
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                  {item.count}
                                </span>
                              </td>
                              <td className="p-3.5 text-right text-xs text-slate-400 font-mono font-medium">{formatDateTimeDDMMYYYY(item.latestSearch)}</td>
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

          {/* 4. Customer Orders Tab */}
          {activeSectionTab === 'orders' && (
            <div className="relative bg-slate-950/50 border border-white/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-5">
              <div className="border-b border-white/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                    <FiShoppingBag size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      Customer Orders
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {customerOrders.length}
                      </span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">Order fulfillment history and transaction records for this customer.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/orders/all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  >
                    <span>All Orders Panel</span>
                    <FiExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Summary stat cards */}
              {customerOrders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Orders</span>
                    <p className="text-lg font-black text-white mt-1 font-mono">{customerOrders.length}</p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Spent</span>
                    <p className="text-lg font-black text-emerald-400 mt-1 font-mono">
                      ₹{customerOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Delivered Orders</span>
                    <p className="text-lg font-black text-teal-400 mt-1 font-mono">
                      {customerOrders.filter(o => (o.orderStatus || '').toLowerCase() === 'delivered').length}
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Latest Order Date</span>
                    <p className="text-xs font-bold text-slate-300 mt-2 font-mono">
                      {customerOrders[0]?.createdAt ? formatDateDDMMYYYY(customerOrders[0].createdAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {loadingActivities ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                  <span className="text-xs font-medium">Loading customer orders...</span>
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                  <FiShoppingBag size={32} className="text-slate-600" />
                  <p className="text-xs italic font-medium">No orders found for this user account.</p>
                </div>
              ) : (
                <div className="max-h-[440px] overflow-auto custom-scrollbar rounded-2xl border border-white/10 bg-white/[0.02]">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">#</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Order ID</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Date</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Items</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Total Amount</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Payment</th>
                        <th className="p-3.5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Status</th>
                        <th className="p-3.5 text-right sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {customerOrders.map((order, index) => {
                        const firstItem = order.items?.[0] || order.orderItems?.[0] || order.products?.[0];
                        const prodId = firstItem?.product?._id || firstItem?.product || firstItem?.productId;
                        const itemImg = firstItem?.image || firstItem?.variant?.images?.[0] || firstItem?.product?.images?.[0];
                        const itemName = firstItem?.product?.name || firstItem?.name || 'Product';
                        const itemsCount = order.items?.length || order.orderItems?.length || 1;

                        return (
                          <tr
                            key={order._id || index}
                            onClick={() => navigate(`/orders/all?viewOrderId=${order._id}`, { state: { viewOrderId: order._id } })}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5 text-xs text-slate-400 font-mono">
                              {index + 1}
                            </td>
                            <td className="p-3.5 font-mono text-xs text-blue-300 font-medium">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[120px]" title={order._id}>{order._id}</span>
                                  <CopyButton text={order._id} className="text-blue-400/60 hover:text-blue-300 shrink-0" size={10} />
                                </div>
                                {order.invoiceUrl && (
                                  <span className="text-[9px] text-emerald-400 font-sans mt-0.5 flex items-center gap-1">
                                    <FiFileText className="shrink-0" size={9} /> Invoiced
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-xs text-slate-300 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono">
                                <FiCalendar className="text-slate-500 shrink-0" size={12} />
                                <span>{formatDateDDMMYYYY(order.createdAt)}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                {itemImg ? (
                                  <div
                                    onClick={(e) => {
                                      if (prodId) {
                                        e.stopPropagation();
                                        setViewModalProductId(prodId);
                                      }
                                    }}
                                    className={`w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5 ${
                                      prodId ? 'hover:scale-105 hover:border-blue-500/50 transition-all shadow-sm' : ''
                                    }`}
                                    title={prodId ? "View Product Details" : undefined}
                                  >
                                    <img src={itemImg} alt={itemName} className="w-full h-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                    <FiBox size={14} />
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 max-w-[180px]">
                                  <span className="text-white text-xs font-semibold truncate" title={itemName}>
                                    {itemName}
                                  </span>
                                  {firstItem?.variant?.name && (
                                    <span className="text-amber-400 text-[10px] truncate" title={firstItem.variant.name}>
                                      {firstItem.variant.name}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {itemsCount > 1 ? `+${itemsCount - 1} more item(s)` : `Qty: ${firstItem?.quantity || 1}`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-xs font-bold text-emerald-400 font-mono">
                              ₹{order.totalAmount?.toLocaleString('en-IN') || 0}
                            </td>
                            <td className="p-3.5 text-xs">
                              <div className="flex flex-col items-start gap-1">
                                <span className="text-slate-300 font-medium text-[11px]">{order.paymentMethod || 'N/A'}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border ${
                                  order.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }`}>
                                  {order.paymentStatus || 'Pending'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getOrderStatusColor(order.orderStatus)}`}>
                                {order.orderStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/orders/all?viewOrderId=${order._id}`, { state: { viewOrderId: order._id } });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                                title="View in Orders"
                              >
                                <span>View</span>
                                <FiExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          <div className="relative bg-slate-950/50 border border-rose-500/20 shadow-2xl rounded-3xl p-6 overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                  <FiAlertCircle /> Account Security & Danger Zone
                </h4>
                <p className="text-slate-400 text-xs mt-1">Manage critical account actions, session revocation, and data removal.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                onClick={handleForceLogout}
                disabled={isActionLoading}
                className="px-4 py-2.5 text-amber-300 font-bold rounded-xl text-xs bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <FiLogOut size={14} /> Force Logout User
              </button>

              {user?.deleteRequested ? (
                <button
                  onClick={handleReactivate}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 text-emerald-300 font-bold rounded-xl text-xs bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <FiRefreshCcw size={14} /> Reactivate Account
                </button>
              ) : (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 text-rose-300 font-bold rounded-xl text-xs bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <FiTrash2 size={14} /> Delete User Account
                </button>
              )}
            </div>
          </div>

        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && user && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg animate-fade-in" onClick={() => { setDeleteConfirmOpen(false); setTypedConfirmName(''); }}></div>
          <div className="relative bg-slate-950/25 border border-red-500/20 rounded-2xl p-6 shadow-2xl shadow-red-500/25 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-red-500 animate-pulse" /> Confirm Account Deletion
            </h3>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              This action cannot be undone. To permanently delete the user account for <strong className="text-white">"{user.name}"</strong>, please type their name below:
            </p>
            <input
              type="text"
              placeholder="Type user's name to confirm"
              value={typedConfirmName}
              onChange={(e) => setTypedConfirmName(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 focus:border-red-500/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm font-medium mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setTypedConfirmName(''); }}
                className="flex-1 py-2 bg-slate-900/75 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/15"
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
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
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
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-lg animate-fade-in" onClick={() => setAlertOpen(false)}></div>
          <div className="relative bg-slate-950/25 border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <FiAlertCircle className="text-blue-400" /> Notification
            </h3>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              {alertMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/25"
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
