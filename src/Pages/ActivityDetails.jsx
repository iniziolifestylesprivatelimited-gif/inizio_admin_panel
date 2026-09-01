import { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PageHeader from '../Components/PageHeader';
import { TableRowSkeleton } from '../Components/Skeleton';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';
import { api, BASE_URL } from '../api/axios';
import {
  FiArrowLeft, FiSearch, FiActivity, FiUsers, FiBox,
  FiDollarSign, FiLayers, FiTrendingUp, FiEye, FiLogIn,
  FiLogOut, FiClock, FiSettings, FiCheck, FiTrash2, FiX, FiPhone, FiMail, FiSmartphone, FiBell, FiShield, FiCalendar, FiFilter,
  FiMapPin, FiPackage, FiShoppingBag, FiTag, FiSliders, FiExternalLink, FiPercent, FiBarChart2, FiArrowUpRight
} from 'react-icons/fi';
import ProductDetailsModal from '../Components/ProductDetailsModal';
import Card from '../Components/Card';
import { BiRupee } from 'react-icons/bi';
import { DiAndroid, DiApple } from 'react-icons/di';

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

const getTodayString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getPastDateString = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const formatDateTimeSmall = (dateStr) => formatDateTimeDDMMYYYY(dateStr);

const getUserBasedAnalytics = (rawStream, filterType = 'ALL') => {
  const userMap = {};

  const filteredStream = (rawStream || []).filter(item => {
    if (filterType === 'ALL') return true;
    const evt = (item.eventType || '').toUpperCase();
    if (filterType === 'ADD_TO_CART') return evt === 'ADD_TO_CART';
    if (filterType === 'REMOVE_FROM_CART') return evt === 'REMOVE_FROM_CART';
    if (filterType === 'UPDATE_CART') return evt === 'UPDATE_CART_QTY';
    if (filterType === 'INITIATED_PAYMENT') return evt === 'INITIATED_PAYMENT' || evt === 'INITIATE_PAYMENT' || evt.includes('PAY');
    return true;
  });

  filteredStream.forEach(item => {
    const userId = item.user?._id || 'guest';
    const email = item.user?.email || 'Guest / Unauthenticated';
    const name = item.user?.name || 'Guest / Unauthenticated';
    const phone = item.user?.phone || '';
    const ip = item.ip || '';
    const key = userId !== 'guest' ? userId : email;

    if (!userMap[key]) {
      userMap[key] = {
        userId,
        name,
        email,
        phone,
        ip,
        totalActions: 0,
        lastActiveAt: null,
        lastEventType: '',
        lastDetails: null,
        activities: []
      };
    }

    userMap[key].activities.push(item);
    userMap[key].totalActions += 1;
  });

  // Sort each user's activities from NEWEST to OLDEST
  const userList = Object.values(userMap).map(u => {
    u.activities.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA; // Descending (newest first)
    });

    if (u.activities.length > 0) {
      const latest = u.activities[0];
      u.lastActiveAt = latest.timestamp || latest.createdAt;
      u.lastEventType = latest.eventType;
      u.lastDetails = latest.details;
      u.ip = latest.ip || u.ip;
    }

    return u;
  });

  // Sort users so that the most recently active user appears at the top of the table
  userList.sort((a, b) => {
    const timeA = new Date(a.lastActiveAt || 0).getTime();
    const timeB = new Date(b.lastActiveAt || 0).getTime();
    return timeB - timeA;
  });

  return userList;
};

const ActivityDetails = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryBreakdown = searchParams.get('breakdown');
  const queryBreakdownInterval = searchParams.get('breakdownInterval');
  const queryStartDate = searchParams.get('startDate');
  const queryEndDate = searchParams.get('endDate');

  const getActivityStatsUrl = () => {
    const params = [];
    if (queryBreakdown === 'true' && queryBreakdownInterval) {
      params.push(`breakdown=true&breakdownInterval=${queryBreakdownInterval}`);
    }
    if (queryStartDate) params.push(`startDate=${queryStartDate}`);
    if (queryEndDate) params.push(`endDate=${queryEndDate}`);
    if (params.length > 0) {
      return `/activity/stats?${params.join('&')}`;
    }
    return `/activity/stats`;
  };

  const [data, setData] = useState([]);
  const [extraData, setExtraData] = useState({}); // Stores lookup data like brands, categories, products
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowLogins, setSelectedRowLogins] = useState(null);
  const [selectedUserAnalytics, setSelectedUserAnalytics] = useState(null);
  const [selectedViewerBreakdown, setSelectedViewerBreakdown] = useState(null);
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [viewerProductModalId, setViewerProductModalId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 10;
  const [breakdownType, setBreakdownType] = useState('day'); // 'day', 'month', 'custom'
  const [startDate, setStartDate] = useState(() => queryStartDate || getPastDateString(14));
  const [endDate, setEndDate] = useState(() => queryEndDate || getTodayString());
  const [analyticsFilter, setAnalyticsFilter] = useState('ALL'); // 'ALL', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'UPDATE_CART'

  useEffect(() => {
    const fetchData = async (isPoll = false) => {
      if (!isPoll) setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch lookups first or parallelly to map names (products, brands, categories, orders)
        const [prodRes, brandRes, catRes, orderRes] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] }))
        ]);

        const rawOrders = Array.isArray(orderRes.data) ? orderRes.data : orderRes.data?.orders || [];

        const lookup = {
          products: prodRes.data,
          brands: brandRes.data,
          categories: catRes.data,
          orders: rawOrders
        };
        setExtraData(prev => ({ ...prev, ...lookup }));

        if (type === 'revenue') {
          const res = await api.get('/orders/all', { headers });
          const fetchedOrders = Array.isArray(res.data) ? res.data : res.data?.orders || [];
          const paidOrders = fetchedOrders.filter(order => order.paymentStatus?.toLowerCase() === 'paid');
          setData(paidOrders);
        } else if (type === 'brands') {
          setData(brandRes.data);
        } else if (type === 'products' || type === 'variants') {
          if (type === 'variants') {
            const variantList = [];
            prodRes.data.forEach(p => {
              if (Array.isArray(p.variants) && p.variants.length > 1) {
                p.variants.forEach(v => {
                  variantList.push({
                    _id: `${p._id}-${v._id || v.name}`,
                    productId: p._id,
                    productName: p.name,
                    name: v.name || 'Default Variant',
                    price: v.price || p.basePrice || 0,
                    isActive: v.isActive !== false && p.isActive !== false
                  });
                });
              } else {
                variantList.push({
                  _id: `${p._id}-default`,
                  productId: p._id,
                  productName: p.name,
                  name: 'Default Variant',
                  price: p.basePrice || 0,
                  isActive: p.isActive !== false
                });
              }
            });
            setData(variantList);
          } else {
            setData(prodRes.data);
          }
        } else if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
          const [custRes, actRes, reqStatsRes] = await Promise.all([
            api.get('/admin/customers', { headers }),
            api.get(getActivityStatsUrl(), { headers }).catch(() => ({ data: { users: [] } })),
            api.get('/admin/request-stats', { headers }).catch(() => ({ data: { stats: [] } }))
          ]);
          let userList = Array.isArray(custRes.data) ? custRes.data : [];
          const actUsers = actRes.data?.users || [];

          const isLegacyOrUnknownVersion = (version) => {
            if (!version || typeof version !== 'string') return true;
            const v = version.trim().toLowerCase();
            if (!v || v === 'unknown' || v === 'legacy' || v === 'unknown/legacy' || v === 'n/a' || v === 'none' || v === 'undefined' || v === 'null' || v === '0.0.0' || v === 'v0.0.0') return true;
            if (v.includes('unknown') || v.includes('legacy') || v.includes('n/a')) return true;
            const isSemver = /^[vV]?\d+\.\d+/.test(v);
            return !isSemver;
          };

          userList = userList.map(u => {
            const match = actUsers.find(au => au.userId === u._id || (au.email && u.email && au.email.toLowerCase() === u.email.toLowerCase()));
            const rawAppVer = u.appVersion || match?.appVersion;
            const isUnknownOrLegacy = isLegacyOrUnknownVersion(rawAppVer);

            const rawLastActive = u.lastActive || match?.lastActive;
            const lastActive = isUnknownOrLegacy ? null : rawLastActive;
            const isOnline = isUnknownOrLegacy ? false : (u.isOnline !== undefined ? u.isOnline : (lastActive ? (new Date() - new Date(lastActive) < 5 * 60 * 1000) : false));

            const reqStat = (reqStatsRes.data?.stats || []).find(rs => 
              (rs.user?._id && rs.user._id === u._id) || 
              (rs.user?.email && u.email && rs.user.email.toLowerCase() === u.email.toLowerCase())
            );

            const userDevices = u.devices || u.registeredDevices || match?.devices || [];
            const platformMap = {};
            userDevices.forEach(d => {
              const plat = d.devicePlatform?.toLowerCase();
              if (!plat) return;
              
              if (!platformMap[plat] || new Date(d.lastActive || 0) > new Date(platformMap[plat].lastActive || 0)) {
                platformMap[plat] = {
                  platform: plat,
                  appVersion: d.appVersion || u.appVersion || match?.appVersion || 'unknown',
                  lastActive: d.lastActive || u.lastActive || match?.lastActive
                };
              }
            });
            let platformList = Object.values(platformMap);

            if (platformList.length === 0) {
              platformList.push({
                platform: 'unknown',
                appVersion: isUnknownOrLegacy ? 'unknown/legacy' : (rawAppVer || 'unknown'),
                lastActive: lastActive
              });
            }

            return {
              ...u,
              lastActive,
              isOnline,
              lastLoginAt: isUnknownOrLegacy ? null : (u.lastLoginAt || match?.lastLoginAt),
              lastLogoutAt: isUnknownOrLegacy ? null : (u.lastLogoutAt || match?.lastLogoutAt),
              appVersion: isUnknownOrLegacy ? 'unknown/legacy' : rawAppVer,
              platformList,
              notificationsEnabled: u.notificationsEnabled !== undefined ? u.notificationsEnabled : match?.notificationsEnabled,
              isAppInstalled: u.isAppInstalled !== undefined ? u.isAppInstalled : match?.isAppInstalled,
              ipAddress: reqStat?.ip || ''
            };
          });

          if (type === 'installed') {
            userList = userList.filter(u => checkAppStatus(u) === 'installed');
          } else if (type === 'uninstalled') {
            userList = userList.filter(u => checkAppStatus(u) === 'uninstalled');
          }

          userList.sort((a, b) => {
            const aActive = Boolean(a.lastActive && !isLegacyOrUnknownVersion(a.appVersion));
            const bActive = Boolean(b.lastActive && !isLegacyOrUnknownVersion(b.appVersion));

            // 1. Online users at the top
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;

            // 2. Active users next, Not Active users pushed to the bottom
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;

            // 3. Sort active users by most recent lastActive timestamp
            if (aActive && bActive) {
              const timeA = new Date(a.lastActive).getTime();
              const timeB = new Date(b.lastActive).getTime();
              return timeB - timeA;
            }

            return 0;
          });
          setData(userList);
        } else if (type === 'request-stats') {
          const res = await api.get('/admin/request-stats', { headers });
          const fetchedStats = res.data?.stats || [];
          setData(fetchedStats);
        } else if (type === 'product-subscriptions') {
          const res = await api.get('/admin/products/subscriptions/all', { headers });
          const fetchedSubscriptions = res.data?.subscriptions || [];
          setData(fetchedSubscriptions);
        } else if (type === 'analytics') {
          const res = await api.get('/admin/analytics', { headers });
          const analyticsData = res.data || {};
          setData(analyticsData.activityStream || []);
          setExtraData(prev => ({
            ...prev,
            funnel: analyticsData.funnel || {},
            cartMetrics: analyticsData.cartMetrics || {},
            managerPerformance: analyticsData.managerPerformance || {}
          }));
        } else if (
          type === 'most-searched-brands' || type === 'brand-views' ||
          type === 'most-searched-categories' || type === 'category-views' ||
          type === 'most-searched' ||
          type === 'most-viewed-products' || type === 'product-views'
        ) {
          const res = await api.get(getActivityStatsUrl(), { headers });
          if (res.data) {
            setExtraData(prev => ({
              ...prev,
              summary: res.data.summary || prev.summary || {},
              deviceMetrics: res.data.deviceMetrics || prev.deviceMetrics || {}
            }));
          }
          let activities = res.data?.recentActivities || [];

          if (queryBreakdown === 'true') {
            if (queryBreakdownInterval === 'day') {
              let targetDateStr = new Date().toISOString().split('T')[0];
              const allDates = activities.map(act => act.createdAt?.split('T')[0]).filter(Boolean);
              if (allDates.length > 0 && !activities.some(act => act.createdAt?.startsWith(targetDateStr))) {
                allDates.sort((a, b) => b.localeCompare(a));
                targetDateStr = allDates[0];
              }
              activities = activities.filter(act => act.createdAt?.startsWith(targetDateStr));
            } else if (queryBreakdownInterval === 'month') {
              let currentMonthStr = new Date().toISOString().slice(0, 7);
              const allMonths = activities.map(act => act.createdAt?.slice(0, 7)).filter(Boolean);
              if (allMonths.length > 0 && !activities.some(act => act.createdAt?.startsWith(currentMonthStr))) {
                allMonths.sort((a, b) => b.localeCompare(a));
                currentMonthStr = allMonths[0];
              }
              activities = activities.filter(act => act.createdAt?.startsWith(currentMonthStr));
            }
          }

          if (type === 'most-searched-brands' || type === 'brand-views') {
            let rawBrands = ((queryBreakdown === 'true' && queryBreakdownInterval === 'day') ? [] : (res.data?.mostSearchedBrands || []));
            if (rawBrands.length === 0 && activities.length > 0) {
              const brandMap = {};
              activities.forEach(act => {
                const action = (act.action || '').toUpperCase();
                if (action === 'BRAND_VIEW' || action === 'BRAND') {
                  const brandId = act.details?.brandId || act.details?.id || 'unknown';
                  const brand = lookup.brands?.find(b => b._id === brandId);
                  const key = brandId;
                  if (!brandMap[key]) {
                    brandMap[key] = {
                      brand: brand || { _id: brandId, name: act.details?.brandName || 'Unknown Brand' },
                      searches: 0,
                      viewers: []
                    };
                  }
                  brandMap[key].searches += 1;
                  const uId = act.user?._id || act.user?.email || 'unknown';
                  const matchedViewer = brandMap[key].viewers.find(v => (v.user?._id || v.user?.email) === uId);
                  if (matchedViewer) {
                    matchedViewer.count += 1;
                    const newTime = new Date(act.createdAt || act.timestamp).getTime();
                    const oldTime = matchedViewer.lastViewedAt ? new Date(matchedViewer.lastViewedAt).getTime() : 0;
                    if (newTime > oldTime) {
                      matchedViewer.lastViewedAt = act.createdAt || act.timestamp;
                    }
                  } else {
                    brandMap[key].viewers.push({
                      user: act.user || { name: 'Unknown User', email: 'N/A' },
                      count: 1,
                      lastViewedAt: act.createdAt || act.timestamp
                    });
                  }
                }
              });
              rawBrands = Object.values(brandMap);
            } else if (rawBrands.length === 0 && res.data?.users) {
              const brandMap = {};
              res.data.users.forEach(u => {
                if (u.activityStats?.brandViews > 0) {
                  const key = 'all-brands';
                  if (!brandMap[key]) {
                    brandMap[key] = {
                      brand: { _id: 'all-brands', name: 'App Brand Catalog' },
                      searches: 0,
                      viewers: []
                    };
                  }
                  brandMap[key].searches += u.activityStats.brandViews;
                  brandMap[key].viewers.push({
                    user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                    count: u.activityStats.brandViews
                  });
                }
              });
              rawBrands = Object.values(brandMap);
            }
            const processed = rawBrands.map(item => {
              const count = item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, searches: count };
            }).sort((a, b) => b.searches - a.searches);
            setData(processed);
          } else if (type === 'most-searched-categories' || type === 'category-views') {
            let rawCategories = ((queryBreakdown === 'true' && queryBreakdownInterval === 'day') ? [] : (res.data?.mostSearchedCategories || []));
            if (rawCategories.length === 0 && activities.length > 0) {
              const catMap = {};
              activities.forEach(act => {
                const action = (act.action || '').toUpperCase();
                if (action === 'CATEGORY_VIEW' || action === 'CATEGORY') {
                  const catId = act.details?.categoryId || act.details?.id || 'unknown';
                  const cat = lookup.categories?.find(c => c._id === catId);
                  const key = catId;
                  if (!catMap[key]) {
                    catMap[key] = {
                      category: cat || { _id: catId, name: act.details?.categoryName || 'Unknown Category' },
                      searches: 0,
                      viewers: []
                    };
                  }
                  catMap[key].searches += 1;
                  const uId = act.user?._id || act.user?.email || 'unknown';
                  const matchedViewer = catMap[key].viewers.find(v => (v.user?._id || v.user?.email) === uId);
                  if (matchedViewer) {
                    matchedViewer.count += 1;
                    const newTime = new Date(act.createdAt || act.timestamp).getTime();
                    const oldTime = matchedViewer.lastViewedAt ? new Date(matchedViewer.lastViewedAt).getTime() : 0;
                    if (newTime > oldTime) {
                      matchedViewer.lastViewedAt = act.createdAt || act.timestamp;
                    }
                  } else {
                    catMap[key].viewers.push({
                      user: act.user || { name: 'Unknown User', email: 'N/A' },
                      count: 1,
                      lastViewedAt: act.createdAt || act.timestamp
                    });
                  }
                }
              });
              rawCategories = Object.values(catMap);
            } else if (rawCategories.length === 0 && res.data?.users) {
              const catMap = {};
              res.data.users.forEach(u => {
                if (u.activityStats?.categoryViews > 0) {
                  const key = 'all-categories';
                  if (!catMap[key]) {
                    catMap[key] = {
                      category: { _id: 'all-categories', name: 'App Category Catalog' },
                      searches: 0,
                      viewers: []
                    };
                  }
                  catMap[key].searches += u.activityStats.categoryViews;
                  catMap[key].viewers.push({
                    user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                    count: u.activityStats.categoryViews
                  });
                }
              });
              rawCategories = Object.values(catMap);
            }
            const processed = rawCategories.map(item => {
              const count = item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, searches: count };
            }).sort((a, b) => b.searches - a.searches);
            setData(processed);
          } else if (type === 'most-searched') {
            let rawSearches = ((queryBreakdown === 'true' && queryBreakdownInterval === 'day') ? [] : (res.data?.mostSearched || []));
            if (rawSearches.length === 0 && activities.length > 0) {
              const searchMap = {};
              activities.forEach(act => {
                const action = (act.action || '').toUpperCase();
                const queryVal = act.details?.query || act.details?.searchTerm || act.query;
                if (action === 'SEARCH' && queryVal) {
                  const query = String(queryVal).trim();
                  if (query) {
                    searchMap[query] = (searchMap[query] || 0) + 1;
                  }
                }
              });
              rawSearches = Object.entries(searchMap).map(([query, count]) => ({
                query,
                count
              })).sort((a, b) => b.count - a.count);
            }
            setData(rawSearches);
          } else if (type === 'most-viewed-products' || type === 'product-views') {
            let rawProducts = ((queryBreakdown === 'true' && queryBreakdownInterval === 'day') ? [] : (res.data?.mostViewedProducts || []));
            if (rawProducts.length === 0 && activities.length > 0) {
              const pvActivities = activities.filter(act => {
                const action = (act.action || '').toUpperCase();
                return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
              });
              const prodMap = {};
              pvActivities.forEach(act => {
                const productId = act.details?.productId || 'catalog';
                const prod = lookup.products?.find(p => p._id === productId);
                if (!prodMap[productId]) {
                  prodMap[productId] = {
                    product: {
                      _id: productId,
                      name: prod?.name || act.details?.productName || 'App Product Catalog',
                      basePrice: prod?.basePrice || 0,
                      images: prod?.images || []
                    },
                    views: 0,
                    viewersMap: {}
                  };
                }
                prodMap[productId].views += 1;
                const uId = act.user?._id || act.user?.email || 'unknown';
                if (!prodMap[productId].viewersMap[uId]) {
                  prodMap[productId].viewersMap[uId] = {
                    user: act.user || { name: 'Unknown User', email: 'N/A' },
                    count: 0,
                    lastViewedAt: act.createdAt || act.timestamp
                  };
                }
                prodMap[productId].viewersMap[uId].count += 1;
                const newTime = new Date(act.createdAt || act.timestamp).getTime();
                const oldTime = prodMap[productId].viewersMap[uId].lastViewedAt ? new Date(prodMap[productId].viewersMap[uId].lastViewedAt).getTime() : 0;
                if (newTime > oldTime) {
                  prodMap[productId].viewersMap[uId].lastViewedAt = act.createdAt || act.timestamp;
                }
              });
              rawProducts = Object.values(prodMap).map(item => ({
                product: item.product,
                views: item.views,
                viewers: Object.values(item.viewersMap)
              }));
            } else if (rawProducts.length === 0 && res.data?.users) {
              const prodMap = {};
              res.data.users.forEach(u => {
                if (u.activityStats?.productViews > 0) {
                  const key = 'all-products';
                  if (!prodMap[key]) {
                    prodMap[key] = {
                      product: { _id: 'all-products', name: 'App Product Catalog', basePrice: 0 },
                      views: 0,
                      viewers: []
                    };
                  }
                  prodMap[key].views += u.activityStats.productViews;
                  prodMap[key].viewers.push({
                    user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                    count: u.activityStats.productViews
                  });
                }
              });
              rawProducts = Object.values(prodMap);
            }
            const processed = rawProducts.map(item => {
              const count = item.views !== undefined ? item.views : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, views: count };
            }).sort((a, b) => b.views - a.views);
            setData(processed);
          }
        } else {
          const logsUrl = getActivityStatsUrl();
          let res = await api.get(logsUrl, { headers });
          let activities = res.data?.recentActivities || [];

          if (queryBreakdown === 'true') {
            if (queryBreakdownInterval === 'day') {
              let targetDateStr = new Date().toISOString().split('T')[0];
              const allDates = activities.map(act => act.createdAt?.split('T')[0]).filter(Boolean);
              if (allDates.length > 0 && !activities.some(act => act.createdAt?.startsWith(targetDateStr))) {
                allDates.sort((a, b) => b.localeCompare(a));
                targetDateStr = allDates[0];
              }
              activities = activities.filter(act => act.createdAt?.startsWith(targetDateStr));
            } else if (queryBreakdownInterval === 'month') {
              let currentMonthStr = new Date().toISOString().slice(0, 7);
              const allMonths = activities.map(act => act.createdAt?.slice(0, 7)).filter(Boolean);
              if (allMonths.length > 0 && !activities.some(act => act.createdAt?.startsWith(currentMonthStr))) {
                allMonths.sort((a, b) => b.localeCompare(a));
                currentMonthStr = allMonths[0];
              }
              activities = activities.filter(act => act.createdAt?.startsWith(currentMonthStr));
            }
          } else if (startDate && endDate && activities.length > 0) {
            const startMs = new Date(`${startDate}T00:00:00.000Z`).getTime();
            const endMs = new Date(`${endDate}T23:59:59.999Z`).getTime();
            activities = activities.filter(act => {
              const actTime = new Date(act.createdAt || act.timestamp).getTime();
              return !isNaN(actTime) ? (actTime >= startMs && actTime <= endMs) : true;
            });
          }

          if (type !== 'all') {
            const processedProducts = (res.data?.mostViewedProducts || []).map(item => {
              const count = item.views !== undefined ? item.views : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, views: count };
            }).sort((a, b) => b.views - a.views);

            const processedBrands = (res.data?.mostSearchedBrands || []).map(item => {
              const count = item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, searches: count };
            }).sort((a, b) => b.searches - a.searches);

            const processedCategories = (res.data?.mostSearchedCategories || []).map(item => {
              const count = item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((sum, v) => sum + (v.count || 0), 0) : 0);
              return { ...item, searches: count };
            }).sort((a, b) => b.searches - a.searches);

            setExtraData(prev => ({
              ...prev,
              summary: res.data?.summary || prev.summary || {},
              deviceMetrics: res.data?.deviceMetrics || prev.deviceMetrics || {},
              trends: res.data?.trends || {},
              ...(type === 'product-views' && { mostViewedProducts: processedProducts }),
              ...(type === 'brand-views' && { mostSearchedBrands: processedBrands }),
              ...(type === 'category-views' && { mostSearchedCategories: processedCategories }),
              ...(type === 'search-queries' && { mostSearched: res.data?.mostSearched || [] })
            }));
          }

          let filtered = [];

          // Get the target date if breakdown interval is active (today)
          let targetDateStr = null;
          if (queryBreakdown === 'true' && queryBreakdownInterval === 'day') {
            targetDateStr = new Date().toISOString().split('T')[0];
            const allDates = activities.map(act => act.createdAt?.split('T')[0]).filter(Boolean);
            if (allDates.length > 0 && !activities.some(act => act.createdAt?.startsWith(targetDateStr))) {
              allDates.sort((a, b) => b.localeCompare(a));
              targetDateStr = allDates[0];
            }
          }

          if (type === 'logins') {
            filtered = activities.filter(act => (act.action || '').toUpperCase() === 'LOGIN');
            if (filtered.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = u.activityStats?.logins > 0;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastLoginAt || u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: `login-${u.userId}`,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'LOGIN',
                  createdAt: u.lastLoginAt || u.lastActive,
                  details: { method: 'App Session' }
                }));
            }
          } else if (type === 'logouts') {
            filtered = activities.filter(act => (act.action || '').toUpperCase() === 'LOGOUT');
            if (filtered.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = (u.activityStats?.logouts > 0 || u.activityStats?.logins > 0) && !u.isOnline;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastLogoutAt || u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: `logout-${u.userId}`,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'LOGOUT',
                  createdAt: u.lastLogoutAt || u.lastActive
                }));
            }
          } else if (type === 'product-views') {
            const pvActivities = activities.filter(act => {
              const action = (act.action || '').toUpperCase();
              return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
            });
            if (pvActivities.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = u.activityStats?.productViews > 0;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: u.userId,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'PRODUCT_VIEW',
                  count: u.activityStats.productViews,
                  views: [],
                  createdAt: u.lastActive,
                  latestProduct: 'App Product Catalog'
                }));
            } else {
              const groupedPV = [];
              const userMap = {};

              pvActivities.forEach(act => {
                const uId = act.user?._id || act.user?.email || 'unknown';
                if (!userMap[uId]) {
                  const productId = act.details?.productId;
                  const prod = lookup.products?.find(p => p._id === productId);
                  userMap[uId] = {
                    _id: act._id || uId,
                    user: act.user,
                    action: 'PRODUCT_VIEW',
                    count: 0,
                    views: [],
                    createdAt: act.createdAt,
                    latestProduct: prod?.name || productId || 'a product'
                  };
                  groupedPV.push(userMap[uId]);
                }
                userMap[uId].count += 1;

                const productId = act.details?.productId;
                const prod = lookup.products?.find(p => p._id === productId);
                userMap[uId].views.push({
                  _id: act._id,
                  productName: prod?.name || productId || 'a product',
                  createdAt: act.createdAt
                });
              });
              filtered = groupedPV;
            }
          } else if (type === 'brand-views') {
            const bvActivities = activities.filter(act => {
              const action = (act.action || '').toUpperCase();
              return action === 'BRAND_VIEW' || action === 'BRAND';
            });
            if (bvActivities.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = u.activityStats?.brandViews > 0;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: u.userId,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'BRAND_VIEW',
                  count: u.activityStats.brandViews,
                  views: [],
                  createdAt: u.lastActive,
                  latestBrand: 'App Brand Catalog'
                }));
            } else {
              const groupedBV = [];
              const userMap = {};

              bvActivities.forEach(act => {
                const uId = act.user?._id || act.user?.email || 'unknown';
                const brandId = act.details?.brandId || act.details?.id;
                const brand = lookup.brands?.find(b => b._id === brandId);
                if (!userMap[uId]) {
                  userMap[uId] = {
                    _id: act._id || uId,
                    user: act.user,
                    action: 'BRAND_VIEW',
                    count: 0,
                    views: [],
                    createdAt: act.createdAt,
                    latestBrand: brand?.name || brandId || 'a brand'
                  };
                  groupedBV.push(userMap[uId]);
                }
                userMap[uId].count += 1;

                userMap[uId].views.push({
                  _id: act._id,
                  name: brand?.name || brandId || 'a brand',
                  createdAt: act.createdAt
                });
              });
              filtered = groupedBV;
            }
          } else if (type === 'category-views') {
            const cvActivities = activities.filter(act => {
              const action = (act.action || '').toUpperCase();
              return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
            });
            if (cvActivities.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = u.activityStats?.categoryViews > 0;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: u.userId,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'CATEGORY_VIEW',
                  count: u.activityStats.categoryViews,
                  views: [],
                  createdAt: u.lastActive,
                  latestCategory: 'App Category Catalog'
                }));
            } else {
              const groupedCV = [];
              const userMap = {};

              cvActivities.forEach(act => {
                const uId = act.user?._id || act.user?.email || 'unknown';
                const catId = act.details?.categoryId || act.details?.id;
                const cat = lookup.categories?.find(c => c._id === catId);
                if (!userMap[uId]) {
                  userMap[uId] = {
                    _id: act._id || uId,
                    user: act.user,
                    action: 'CATEGORY_VIEW',
                    count: 0,
                    views: [],
                    createdAt: act.createdAt,
                    latestCategory: cat?.name || catId || 'a category'
                  };
                  groupedCV.push(userMap[uId]);
                }
                userMap[uId].count += 1;

                userMap[uId].views.push({
                  _id: act._id,
                  name: cat?.name || catId || 'a category',
                  createdAt: act.createdAt
                });
              });
              filtered = groupedCV;
            }
          } else if (type === 'search-queries') {
            filtered = activities.filter(act => (act.action || '').toUpperCase() === 'SEARCH');
            if (filtered.length === 0 && res.data?.users) {
              filtered = res.data.users
                .filter(u => {
                  const hasAct = u.activityStats?.searches > 0;
                  if (!hasAct) return false;
                  if (targetDateStr) {
                    return (u.lastActive || '').startsWith(targetDateStr);
                  }
                  return true;
                })
                .map(u => ({
                  _id: `search-${u.userId}`,
                  user: { _id: u.userId, name: u.name, email: u.email, phone: u.phone },
                  action: 'SEARCH',
                  count: u.activityStats?.searches,
                  createdAt: u.lastActive,
                  details: { query: 'Search Query' }
                }));
            }
          } else {
            filtered = activities;
          }
          setData(filtered);
        }

        // Run background check for request counts > 10000 to trigger browser desktop Notification
        try {
          const statsRes = await api.get('/admin/request-stats', { headers });
          const statsList = statsRes.data?.stats || [];
          statsList.forEach(stat => {
            const isSuperAdmin = stat.user?.name === 'Super Admin' || stat.user?.email === 'inizio@gmail.com';
            if (stat.count > 10000 && !isSuperAdmin) {
              if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                  const storageKey = `notified-stat-${stat._id}-${stat.count}`;
                  if (!sessionStorage.getItem(storageKey)) {
                    new Notification(`High API Usage Alert!`, {
                      body: `${stat.user?.name || 'Guest / Unauthenticated User'} has made ${stat.count} requests.`,
                    });
                    sessionStorage.setItem(storageKey, 'true');
                  }
                } else if (Notification.permission === 'default') {
                  Notification.requestPermission();
                }
              }
            }
          });
        } catch (e) {
          console.error("Failed to run background request stats alert check:", e);
        }
      } catch (err) {
        console.error('Failed to load detail logs:', err);
        if (!isPoll) setError('Failed to fetch records. Please try again.');
      } finally {
        if (!isPoll) setLoading(false);
      }
    };

    fetchData(false);
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [type, breakdownType, startDate, endDate, queryBreakdown, queryBreakdownInterval, queryStartDate, queryEndDate]);

  // Derived Title & Details Configurations
  const getHeaderConfig = () => {
    switch (type) {
      case 'revenue':
        return { title: 'Sales Transactions', desc: 'Detailed log of client orders, fulfillment status, and total revenue calculations.', icon: BiRupee, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'analytics':
        return { title: 'Admin Analytics Dashboard', desc: 'Comprehensive analytics funnel metrics, active cart listings, manager performance logs, and cart activity streams.', icon: FiActivity, color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
      case 'brands':
        return { title: 'Brands Catalog Directory', desc: 'List of all system-registered retail brands and logos.', icon: FiTrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'products':
        return { title: 'Products Catalog Directory', desc: 'List of all inventory products and active prices.', icon: FiBox, color: 'text-amber-400', bg: 'bg-amber-500/20' };
      case 'variants':
        return { title: 'Variants Inventory', desc: 'Detailed overview of products and variant configurations.', icon: FiLayers, color: 'text-purple-400', bg: 'bg-purple-500/20' };
      case 'users':
      case 'users-status':
        return { title: 'Users Stats', desc: 'Overview of user system permissions, active connections, and notification keys.', icon: FiUsers, color: 'text-teal-400', bg: 'bg-teal-500/20' };
      case 'installed':
        return { title: 'Active Installed Users', desc: 'List of all system-registered customers who currently have the app installed.', icon: FiCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'uninstalled':
        return { title: 'Uninstalled Users Logs', desc: 'Detailed log of system customers who uninstalled the app from their devices.', icon: FiX, color: 'text-rose-400', bg: 'bg-rose-500/20' };
      case 'logins':
        return { title: 'Login Logs', desc: 'Track dates, methods, and session initiations of users.', icon: FiLogIn, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'logouts':
        return { title: 'Logout Logs', desc: 'Track dates and session closures of users.', icon: FiLogOut, color: 'text-rose-400', bg: 'bg-rose-500/20' };
      case 'product-views':
        return { title: 'Product Views', desc: 'Track product detail sheet loads and page views by user.', icon: FiEye, color: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'brand-views':
        return { title: 'Brand Views Logs', desc: 'Track brand searches and catalog navigation by user.', icon: FiTrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
      case 'category-views':
        return { title: 'Category Views Logs', desc: 'Track category filters and segment views by user.', icon: FiLayers, color: 'text-purple-400', bg: 'bg-purple-500/20' };
      case 'search-queries':
        return { title: 'Search Queries Logs', desc: 'Track catalog search keys and queries requested by users.', icon: FiSearch, color: 'text-amber-400', bg: 'bg-amber-500/20' };
      case 'request-stats':
        return { title: 'API Request Analytics', desc: 'Monitor API endpoint request counts and request rates per user/IP.', icon: FiActivity, color: 'text-rose-400', bg: 'bg-rose-500/20' };
      case 'product-subscriptions':
        return { title: 'Product Subscriptions', desc: 'Monitor user subscriptions for back-in-stock notifications.', icon: FiBell, color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
      case 'most-searched-brands':
        return { title: 'Most Viewed Brands', desc: 'Top brands viewed by users across the catalog.', icon: FiTrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
      case 'most-searched-categories':
        return { title: 'Most Viewed Categories', desc: 'Top product categories viewed by users.', icon: FiLayers, color: 'text-purple-400', bg: 'bg-purple-500/20' };
      case 'most-searched':
        return { title: 'Most Searched Queries', desc: 'Top raw search query strings entered by users in the catalog.', icon: FiSearch, color: 'text-amber-400', bg: 'bg-amber-500/20' };
      case 'most-viewed-products':
        return { title: 'Most Viewed Products', desc: 'Products with the highest total view counts from user activity.', icon: FiEye, color: 'text-blue-400', bg: 'bg-blue-500/20' };
      default:
        return { title: 'Activity Logs', desc: 'System log statistics overview.', icon: FiActivity, color: 'text-slate-400', bg: 'bg-slate-500/20' };
    }
  };

  const header = getHeaderConfig();

  // Calculate aggregate daily counts for trends chart
  const dailyCounts = useMemo(() => {
    const map = {};
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        if (item.date) {
          map[item.date] = (map[item.date] || 0) + (item.count || 0);
        }
      });
    };
    add(extraData.trends?.products);
    add(extraData.trends?.brands);
    add(extraData.trends?.categories);
    add(extraData.trends?.searches);

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [extraData.trends]);

  // Extract top trending highlights to display in the side list
  const trendingHighlights = useMemo(() => {
    const list = [];
    if (extraData.trends?.products) {
      extraData.trends.products.forEach(p => {
        list.push({
          name: p.productName || 'Unknown Product',
          type: 'Product',
          date: p.date,
          count: p.count || 0
        });
      });
    }
    if (extraData.trends?.brands) {
      extraData.trends.brands.forEach(b => {
        list.push({
          name: b.brandName || 'Unknown Brand',
          type: 'Brand',
          date: b.date,
          count: b.count || 0
        });
      });
    }
    if (extraData.trends?.categories) {
      extraData.trends.categories.forEach(c => {
        list.push({
          name: c.categoryName || 'Unknown Category',
          type: 'Category',
          date: c.date,
          count: c.count || 0
        });
      });
    }
    if (extraData.trends?.searches) {
      extraData.trends.searches.forEach(s => {
        list.push({
          name: `"${s.query}"`,
          type: 'Search',
          date: s.date,
          count: s.count || 0
        });
      });
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [extraData.trends]);

  // Trends Line/Area Chart Config
  const trendsChartConfig = useMemo(() => {
    return {
      series: [{
        name: 'Total Activities',
        data: dailyCounts.map(d => d.count)
      }],
      options: {
        chart: {
          type: 'area',
          toolbar: { show: false },
          background: 'transparent',
          fontFamily: 'inherit',
          dropShadow: {
            enabled: true,
            top: 6,
            left: 0,
            blur: 8,
            color: '#3b82f6',
            opacity: 0.25
          }
        },
        colors: ['#3b82f6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: {
          categories: dailyCounts.map(d => d.date),
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: '#94a3b8', fontWeight: 600, fontSize: '9px' } }
        },
        yaxis: {
          labels: {
            style: { colors: '#94a3b8', fontWeight: 600 },
            formatter: (value) => value.toLocaleString('en-IN')
          }
        },
        grid: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          strokeDashArray: 3,
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: true } }
        },
        markers: {
          size: 4,
          colors: ['#3b82f6'],
          strokeColors: 'rgba(255, 255, 255, 0.8)',
          strokeWidth: 2,
          hover: { size: 6 }
        },
        theme: { mode: 'dark' },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val) => `${val.toLocaleString('en-IN')} activities` }
        }
      }
    };
  }, [dailyCounts]);

  // Filtering Logic
  const getFilteredData = () => {
    if (type === 'analytics') {
      let aggregated = getUserBasedAnalytics(data, analyticsFilter);

      if (!searchQuery) return aggregated;
      const query = searchQuery.toLowerCase();
      return aggregated.filter(item => {
        const userName = item.name || '';
        const userEmail = item.email || '';
        const userPhone = item.phone || '';
        const eventType = item.lastEventType || '';
        return (
          userName.toLowerCase().includes(query) ||
          userEmail.toLowerCase().includes(query) ||
          userPhone.includes(query) ||
          eventType.toLowerCase().includes(query)
        );
      });
    }

    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();

    return data.filter(item => {
      if (type === 'revenue') {
        return (
          item._id?.toLowerCase().includes(query) ||
          item.customerName?.toLowerCase().includes(query) ||
          item.status?.toLowerCase().includes(query) ||
          item.paymentStatus?.toLowerCase().includes(query)
        );
      } else if (type === 'request-stats') {
        const userName = item.user?.name || 'Guest / Unauthenticated';
        const userEmail = item.user?.email || '';
        const userPhone = item.user?.phone || '';
        const ipStr = item.ip || '';
        return (
          userName.toLowerCase().includes(query) ||
          userEmail.toLowerCase().includes(query) ||
          userPhone.includes(query) ||
          ipStr.toLowerCase().includes(query)
        );
      } else if (type === 'product-subscriptions') {
        const userName = item.user?.name || '';
        const userEmail = item.user?.email || '';
        const userPhone = item.user?.phone || '';
        const prodName = item.product?.name || '';
        const variantName = item.variantName || '';
        return (
          userName.toLowerCase().includes(query) ||
          userEmail.toLowerCase().includes(query) ||
          userPhone.includes(query) ||
          prodName.toLowerCase().includes(query) ||
          variantName.toLowerCase().includes(query)
        );

      } else if (type === 'brands') {
        return item.name?.toLowerCase().includes(query);
      } else if (type === 'products') {
        return item.name?.toLowerCase().includes(query) || item._id?.toLowerCase().includes(query);
      } else if (type === 'variants') {
        return (
          item.productName?.toLowerCase().includes(query) ||
          item.name?.toLowerCase().includes(query) ||
          item.productId?.toLowerCase().includes(query)
        );
      } else if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.phone?.includes(query)
        );
      } else if (type === 'search-queries') {
        const userName = item.user?.name || '';
        const userEmail = item.user?.email || '';
        const userPhone = item.user?.phone || '';
        const queryText = item.details?.query || item.query || item.details?.searchTerm || '';
        const logId = item._id || '';
        return (
          userName.toLowerCase().includes(query) ||
          userEmail.toLowerCase().includes(query) ||
          userPhone.includes(query) ||
          queryText.toLowerCase().includes(query) ||
          logId.toLowerCase().includes(query)
        );
      } else if (type === 'most-searched-brands') {
        return (item.brand?.name || '').toLowerCase().includes(query);
      } else if (type === 'most-searched-categories') {
        return (item.category?.name || '').toLowerCase().includes(query);
      } else if (type === 'most-searched') {
        return (item.query || '').toLowerCase().includes(query);
      } else if (type === 'most-viewed-products') {
        return (item.product?.name || '').toLowerCase().includes(query);
      } else {
        // Activity logs filter
        const actUser = item.user?.name || 'unknown';
        const actEmail = item.user?.email || '';
        const actionStr = item.action || '';

        let detailMatch = false;
        if (item.details) {
          detailMatch = JSON.stringify(item.details).toLowerCase().includes(query);
        }

        let viewsMatch = false;
        if (Array.isArray(item.views)) {
          viewsMatch = item.views.some(v =>
            (v.productName || '').toLowerCase().includes(query) ||
            (v.name || '').toLowerCase().includes(query)
          );
        }
        if (item.latestProduct) {
          viewsMatch = viewsMatch || item.latestProduct.toLowerCase().includes(query);
        }
        if (item.latestBrand) {
          viewsMatch = viewsMatch || item.latestBrand.toLowerCase().includes(query);
        }
        if (item.latestCategory) {
          viewsMatch = viewsMatch || item.latestCategory.toLowerCase().includes(query);
        }

        return (
          actUser.toLowerCase().includes(query) ||
          actEmail.toLowerCase().includes(query) ||
          actionStr.toLowerCase().includes(query) ||
          detailMatch ||
          viewsMatch
        );
      }
    });
  };

  const filtered = getFilteredData();

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDateTime = (dateStr) => formatDateTimeDDMMYYYY(dateStr);

  const getModalHeader = (action) => {
    const actionUpper = (action || '').toUpperCase();
    if (actionUpper === 'PRODUCT_VIEW') {
      return {
        title: 'Product Views History',
        icon: FiEye,
        color: 'text-blue-400',
        label: 'Total Product Views',
        unit: 'views',
        viewHeader: 'Product',
        isViewType: true
      };
    }
    if (actionUpper === 'BRAND_VIEW') {
      return {
        title: 'Brand Views History',
        icon: FiTrendingUp,
        color: 'text-indigo-400',
        label: 'Total Brand Views',
        unit: 'views',
        viewHeader: 'Brand',
        isViewType: true
      };
    }
    if (actionUpper === 'CATEGORY_VIEW') {
      return {
        title: 'Category Views History',
        icon: FiLayers,
        color: 'text-purple-400',
        label: 'Total Category Views',
        unit: 'views',
        viewHeader: 'Category',
        isViewType: true
      };
    }
    if (actionUpper === 'API_REQUESTS') {
      return {
        title: 'API Endpoint Request Stats',
        icon: FiActivity,
        color: 'text-rose-400',
        label: 'Total Requests Count',
        unit: 'requests',
        viewHeader: 'Endpoint Path',
        isViewType: true
      };
    }
    return {
      title: 'Session Login History',
      icon: FiLogIn,
      color: 'text-emerald-400',
      label: 'Total Login Count',
      unit: 'logins',
      viewHeader: 'Method',
      isViewType: false
    };
  };

  // Render proper dynamic columns and row values for tables
  const renderTableContent = () => {
    if (currentItems.length === 0) {
      return (
        <tr>
          <td colSpan="10" className="text-center py-16 text-slate-500 text-sm">
            No matching records found.
          </td>
        </tr>
      );
    }

    if (type === 'revenue') {
      return currentItems.map((item, index) => (
        <tr key={item._id} className="hover:bg-transparent transition-colors">
          {/* {console.log(item)} */}
          <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
          <td className="py-4 px-5 text-xs font-mono text-blue-400 select-all font-semibold">#{item._id}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">{item.address.name || 'Walk-in Customer'}</td>
          <td className="py-4 px-5 text-sm text-slate-300 font-medium">{formatDateTime(item.createdAt)}</td>
          <td className="py-4 px-5 text-sm text-emerald-400 font-extrabold">₹{(item.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td className="py-4 px-5 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              item.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                item.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
              {item.status || 'pending'}
            </span>
          </td>
          <td className="py-4 px-5 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
              {item.paymentStatus || 'unpaid'}
            </span>
          </td>
        </tr>
      ));
    }

    if (type === 'brands') {
      return currentItems.map((item, index) => {
        const cleanPath = (item.logo || '').replace(/\\/g, '/');
        const logoUrl = item.logo ? `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}` : '';
        return (
          <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
            <td className="py-4 px-5">
              {item.logo ? (
                <img src={logoUrl} alt={item.name} className="w-10 h-10 object-contain rounded-xl bg-white border border-white/10 p-1" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold font-mono">
                  {item.name?.substring(0, 2).toUpperCase()}
                </div>
              )}
            </td>
            <td className="py-4 px-5 text-sm font-bold text-white">{item.name}</td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                {item.isActive !== false ? 'active' : 'inactive'}
              </span>
            </td>
          </tr>
        );
      });
    }

    if (type === 'products') {
      return currentItems.map((item, index) => {
        const variantCount = Array.isArray(item.variants) ? item.variants.length : 1;
        const baseP = Number(item.basePrice || 0);
        const offerP = Number(item.offerPrice || 0);
        const hasOffer = offerP > 0 && offerP < baseP;
        const displayP = offerP > 0 ? offerP : baseP;
        return (
          <tr key={item._id} className="hover:bg-transparent transition-colors">
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
            <td className="py-4 px-5 text-sm font-bold text-white truncate max-w-[200px]" title={item.name}>{item.name}</td>
            <td className="py-4 px-5 text-sm font-mono">
              <span className="text-emerald-400 font-extrabold">₹{displayP.toLocaleString('en-IN')}</span>
              {hasOffer && (
                <span className="ml-1.5 text-xs text-slate-500 line-through font-medium">₹{baseP.toLocaleString('en-IN')}</span>
              )}
            </td>
            <td className="py-4 px-5 text-sm text-slate-300 font-bold">{variantCount}</td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                {item.isActive !== false ? 'active' : 'inactive'}
              </span>
            </td>
          </tr>
        );
      });
    }

    if (type === 'variants') {
      return currentItems.map((item, index) => {
        const baseP = Number(item.basePrice || item.price || 0);
        const offerP = Number(item.offerPrice || 0);
        const hasOffer = offerP > 0 && offerP < baseP;
        const displayP = offerP > 0 ? offerP : baseP;
        return (
          <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item.productId}</td>
            <td className="py-4 px-5 text-sm font-bold text-white truncate max-w-[200px]" title={item.productName}>{item.productName}</td>
            <td className="py-4 px-5 text-sm text-blue-400 font-bold">{item.name}</td>
            <td className="py-4 px-5 text-sm font-mono">
              <span className="text-emerald-400 font-extrabold">₹{displayP.toLocaleString('en-IN')}</span>
              {hasOffer && (
                <span className="ml-1.5 text-xs text-slate-500 line-through font-medium">₹{baseP.toLocaleString('en-IN')}</span>
              )}
            </td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                {item.isActive !== false ? 'active' : 'inactive'}
              </span>
            </td>
          </tr>
        );
      });
    }

    if (type === 'users' || type === 'users-status') {
      return currentItems.map((item, index) => {
        const initials = (item.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const userId = item._id || item.userId;
        return (
          <tr
            key={userId || index}
            onClick={() => userId && navigate(`/users/list/${userId}`)}
            className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
          >
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl border border-blue-500/30 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-indigo-300 flex items-center justify-center font-extrabold text-xs tracking-wider shadow-inner">
                    {initials}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} title={item.isOnline ? 'Online' : 'Offline'}></div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    {item.name || 'Unknown User'}
                    {item.deleteRequested && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-extrabold border border-rose-500/20 shrink-0">
                        Deleted
                      </span>
                    )}
                  </div>
                  {item.phone && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                      <FiPhone className="text-slate-500 text-[9px]" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                 {item.ipAddress && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                      <FiMapPin className="text-slate-500 text-[9px]" />
                      <span>{item.ipAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium select-all truncate max-w-[200px]" title={item.email}>
                <FiMail className="text-slate-500 shrink-0" size={12} />
                <span>{item.email || '-'}</span>
              </div>
            </td>
            <td className="py-4 px-5">
              <div className="flex flex-col gap-2 justify-center">
                {item.platformList?.map((p, idx) => (
                  <div key={idx} className="flex items-center h-[26px]">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold font-mono">
                      {p.platform && p.platform !== 'unknown' && (
                        <span className="text-[10px] text-slate-400 font-semibold lowercase">
                          {p.platform==='android'?<DiAndroid className='text-xs text-green-300'/>:<DiApple className='text-xs text-white'/>}
                        </span>
                      )}
                      {p.appVersion || 'unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </td>
            <td className="py-4 px-5">
              <div className="flex flex-col gap-2 justify-center">
                {item.platformList?.map((p, idx) => {
                  const isPlatOnline = item.isOnline && p.appVersion !== 'unknown/legacy' && p.lastActive && (new Date() - new Date(p.lastActive) < 5 * 60 * 1000);
                  return (
                    <div key={idx} className="flex items-center h-[26px]">
                      {isPlatOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Online Now
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <FiClock className="text-slate-500 shrink-0" size={12} />
                          <span>{p.appVersion !== 'unknown/legacy' && p.lastActive ? formatDateTime(p.lastActive) : 'Not Active'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </td>
            <td className="py-4 px-5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.notificationsEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800/80 text-slate-500 border border-white/5'
                }`}>
                <FiBell className={item.notificationsEnabled ? 'text-emerald-400' : 'text-slate-500'} size={11} />
                {item.notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </td>
            <td className="py-4 px-5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.isAppLockEnabled
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                : 'bg-slate-800/80 text-slate-500 border border-white/5'
                }`}>
                <FiShield className={item.isAppLockEnabled ? 'text-teal-400' : 'text-slate-500'} size={11} />
                {item.isAppLockEnabled ? 'Secured' : 'Inactive'}
              </span>
            </td>
          </tr>
        );
      });
    }

    if (type === 'installed' || type === 'uninstalled' || type === 'deleted') {
      return currentItems.map((item, index) => {
        const initials = (item.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const userId = item._id || item.userId;
        return (
          <tr
            key={userId || index}
            onClick={() => userId && navigate(`/users/list/${userId}`)}
            className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
          >
            {/* 1. S.No. */}
            <td className="py-6 px-3 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            
            {/* 2. Name */}
            <td className="py-6 px-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs tracking-wider shadow-inner ${type === 'installed'
                    ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-gradient-to-tr from-rose-500/20 to-orange-500/20 border-rose-500/30 text-rose-300'
                    }`}>
                    {initials}
                  </div>
                  {type === 'installed' && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} title={item.isOnline ? 'Online' : 'Offline'}></div>
                  )}
                  {(type === 'uninstalled' || type === 'deleted') && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-slate-600" title="Offline"></div>
                  )}
                </div>
                <div>
                  <div className={`text-xs font-bold text-white transition-colors flex items-center gap-1 ${type === 'installed' ? 'group-hover:text-emerald-400' : 'group-hover:text-rose-400'
                    }`}>
                    {item.name || 'Unknown User'}
                    {item.deleteRequested && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-extrabold border border-rose-500/20 shrink-0">
                        Deleted
                      </span>
                    )}
                  </div>
                  {item.phone && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <FiPhone className="text-slate-500 text-[8px]" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </td>
            
            {/* 3. Email Address */}
            <td className="py-6 px-3">
              <div className="flex items-center gap-1 text-xs text-slate-300 font-medium select-all truncate max-w-[140px]" title={item.email}>
                <FiMail className="text-slate-500 shrink-0" size={11} />
                {item.email}
              </div>
            </td>
            
            {/* 4. App Version */}
            <td className="py-6 px-3">
              <div className="flex flex-col gap-1.5 justify-center">
                {item.platformList?.map((p, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono w-fit">
                    <FiSmartphone className="text-blue-400/80 text-[9px]" />
                    {p.appVersion || 'v0.0.0'}
                    {p.platform && p.platform !== 'unknown' && (
                      <span className="text-[9px] text-slate-400 font-semibold lowercase">
                        ({p.platform})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </td>
            
            {/* 5. Last Active */}
            <td className="py-6 px-3">
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <FiClock className="text-slate-500" size={12} />
                {item.lastActive ? formatDateTime(item.lastActive) : 'Not Active'}
              </div>
            </td>
            
            {/* 6. Notifications */}
            <td className="py-6 px-3">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${type === 'installed' && item.notificationsEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border border-white/5'
                }`}>
                <FiBell className={type === 'installed' && item.notificationsEnabled ? 'text-emerald-400' : 'text-slate-500'} size={10} />
                {type === 'installed' && item.notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </td>
            
            {/* 7. App Lock */}
            <td className="py-6 px-3">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${type === 'installed' && item.isAppLockEnabled
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                : 'bg-slate-800 text-slate-500 border border-white/5'
                }`}>
                <FiShield className={type === 'installed' && item.isAppLockEnabled ? 'text-teal-400' : 'text-slate-500'} size={10} />
                {type === 'installed' && item.isAppLockEnabled ? 'Secured' : 'Inactive'}
              </span>
            </td>
            
            {/* 8. Installed At / Uninstalled At / Deleted At */}
            {type === 'installed' && (
              <td className="py-6 px-3">
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <FiCalendar className="text-emerald-500/70" size={12} />
                  {formatDateTime(item.installedAt)}
                </div>
              </td>
            )}
            {type === 'uninstalled' && (
              <td className="py-6 px-3">
                <div className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                  <FiCalendar className="text-rose-500/70" size={12} />
                  {formatDateTime(item.uninstalledAt)}
                </div>
              </td>
            )}
            {type === 'deleted' && (
              <td className="py-6 px-3">
                <div className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                  <FiCalendar className="text-rose-500/70" size={12} />
                  {formatDateTime(item.deletedAt || item.updatedAt)}
                </div>
              </td>
            )}
            
            {/* 9. IP Address */}
            <td className="py-6 px-3 text-xs font-mono text-slate-400 select-all">
              {item.ipAddress || '-'}
            </td>
          </tr>
        );
      });
    }

    if (type === 'logins') {
      return currentItems.map((item, index) => (
        <tr
          key={item._id}
          className="hover:bg-white/[0.02] transition-colors group/row"
        >
          <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">
            <div className="flex items-center gap-2">
              {item.user?.name || 'Unknown User'}
            </div>
          </td>
          <td className="py-4 px-5 text-sm text-slate-300 select-all font-medium">{item.user?.email || '-'}</td>
          <td className="py-4 px-5 text-xs font-extrabold text-emerald-400 font-mono tracking-wider">LOGIN</td>
          <td className="py-4 px-5">
            <span className="px-3 py-1 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {item.details?.method || 'N/A'}
            </span>
          </td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt || item.timestamp)}</td>
        </tr>
      ));
    }

    if (type === 'logouts') {
      return currentItems.map((item, index) => (
        <tr
          key={item._id}
          className="hover:bg-white/[0.02] transition-colors group/row"
        >
          <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">
            <div className="flex items-center gap-2">
              {item.user?.name || 'Unknown User'}
            </div>
          </td>
          <td className="py-4 px-5 text-sm text-slate-300 select-all font-medium">{item.user?.email || '-'}</td>
          <td className="py-4 px-5 text-xs font-extrabold text-rose-400 font-mono tracking-wider">LOGOUT</td>
          <td className="py-4 px-5">
            <span className="px-3 py-1 rounded-full font-bold text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {item.details?.method || 'N/A'}
            </span>
          </td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt || item.timestamp)}</td>
        </tr>
      ));
    }

    if (type === 'search-queries') {
      return currentItems.map((item, index) => {
        const queryText = item.details?.query || item.query || item.details?.searchTerm || 'Search Query';
        const initials = (item.user?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return (
          <tr
            key={item._id || index}
            className="hover:bg-white/[0.02] transition-colors group/row"
          >
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg border bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs tracking-wider shadow-inner shrink-0">
                  {initials}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    {item.user?.name || 'Unknown User'}
                  </span>
                  {item.user?.phone && (
                    <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <FiPhone className="text-slate-500 text-[8px]" />
                      <span>{item.user.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-5 text-sm text-slate-300 font-mono select-all font-medium">{item.user?.email || '-'}</td>
            <td className="py-4 px-5 text-xs font-extrabold text-amber-400 font-mono tracking-wider">
              <span className="px-2.5 py-1 rounded-full font-bold text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                SEARCH
              </span>
            </td>
            <td className="py-4 px-5">
              <code className="text-sm font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-mono">
                {queryText}
              </code>
            </td>
            <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt || item.timestamp)}</td>
          </tr>
        );
      });
    }

    if (type === 'request-stats') {
      return currentItems.map((item, index) => {
        const isSuperAdmin = item.user?.name === 'Super Admin' || item.user?.email === 'inizio@gmail.com';
        const displayCount = item.count || 0;
        const displayIP = item.ip || 'N/A';
        const initials = (item.user?.name || 'G').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return (
          <tr key={item._id || index} 
            onClick={() => {
                    setSelectedRowLogins({
                      action: 'API_REQUESTS',
                      user: item.user || { name: 'Guest / Unauthenticated', email: item.ip },
                      count: displayCount,
                      endpointStats: item.endpointStats
                    });
                    setIsModalOpen(true);
                  }}
            className="hover:bg-white/[0.02] transition-colors cursor-pointer">
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs tracking-wider shadow-inner ${isSuperAdmin
                  ? 'bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300'
                  : item.user
                    ? 'bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300'
                    : 'bg-gradient-to-tr from-slate-500/20 to-slate-600/20 border-white/10 text-slate-400'
                  }`}>
                  {initials}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    {item.user?.name || 'Guest / Unauthenticated'}
                  </span>
                  {item.user?.phone && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block flex items-center gap-1">
                      <FiPhone className="text-slate-500 text-[8px]" /> {item.user.phone}
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-5 text-sm text-slate-300 font-medium select-all">
              {item.user?.email || 'N/A'}
            </td>
            <td className="py-4 px-5">
              <span className={`px-2.5 py-1 rounded-full font-bold text-xs border ${displayCount > 10000 && !isSuperAdmin
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : displayCount > 5000
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                {displayCount.toLocaleString()} requests
              </span>
            </td>
            <td className="py-4 px-5 text-xs font-mono text-slate-400 select-all max-w-[150px] truncate" title={displayIP}>
              {displayIP}
            </td>
            <td className="py-4 px-5 text-sm text-slate-400 font-medium">
              {formatDateTime(item.lastRequestAt)}
            </td>
            {/* <td className="py-4 px-5 text-center">
              <button
                onClick={() => {
                  setSelectedRowLogins({
                    action: 'API_REQUESTS',
                    user: item.user || { name: 'Guest / Unauthenticated', email: item.ip },
                    count: displayCount,
                    endpointStats: item.endpointStats
                  });
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                View Breakdown
              </button>
            </td> */}
          </tr>
        );
      });
    }

    if (type === 'analytics') {
      return currentItems.map((item, index) => {
        const initials = (item.name || 'G').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const eventType = (item.lastEventType || 'UNKNOWN').toUpperCase();
        const isPayment = eventType === 'INITIATED_PAYMENT' || eventType === 'INITIATE_PAYMENT' || eventType.includes('PAY') || eventType.includes('CHECKOUT');
        
        const badgeColor =
          eventType === 'ADD_TO_CART' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            eventType === 'REMOVE_FROM_CART' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              isPayment ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/20';

        // Context details from latest activity (newest action at index 0)
        const lastAct = item.activities?.[0] || {};
        const lastDetails = item.lastDetails || lastAct.details || {};
        let contextText = '';
        if (isPayment) {
          contextText = lastDetails.amount ? `₹${Number(lastDetails.amount).toLocaleString('en-IN')}` : (lastDetails.merchantTxnNo || 'Payment');
        } else {
          const prodObj = (extraData.products || []).find(p => p._id === lastDetails.productId);
          contextText = lastDetails.productName || prodObj?.name || '';
        }

        return (
          <tr
            key={item.userId || index}
            onClick={() => setSelectedUserAnalytics(item)}
            className="hover:bg-white/[0.02] transition-colors cursor-pointer group/row"
          >
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl border bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs tracking-wider shadow-inner shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white group-hover/row:text-indigo-400 transition-colors block truncate">
                    {item.name || 'Guest / Unauthenticated'}
                  </span>
                  {item.phone && (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <FiPhone size={9} className="text-slate-500" />
                      <span>{item.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-5 text-sm text-slate-300 font-medium select-all font-mono">{item.email || 'N/A'}</td>
            <td className="py-4 px-5 text-sm text-slate-300 font-medium font-mono">{item.phone || 'N/A'}</td>
            <td className="py-4 px-5 text-sm text-center">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
                {item.totalActions} Action{item.totalActions !== 1 ? 's' : ''}
              </span>
            </td>
            <td className="py-4 px-5 text-xs">
              <div className="flex flex-col items-start gap-1">
                <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${badgeColor}`}>
                  {eventType.replace(/_/g, ' ')}
                </span>
                {contextText && (
                  <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[180px]" title={contextText}>
                    {contextText}
                  </span>
                )}
              </div>
            </td>
            <td className="py-4 px-5 text-sm text-slate-400 font-medium font-mono">{formatDateTime(item.lastActiveAt)}</td>
          </tr>
        );
      });
    }
    if (type === 'product-subscriptions') {
      return currentItems.map((item, index) => {
        const initials = (item.user?.name || 'G').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const firstImg = item.product?.images?.[0] || '';
        const displayProductLogo = firstImg ? (firstImg.startsWith('http') || firstImg.startsWith('blob:') ? firstImg : `${BASE_URL}${firstImg.startsWith('/') ? '' : '/'}${firstImg.replace(/\\/g, '/')}`) : '';

        return (
          <tr key={item._id || index} className="bg-transparent hover:bg-white/[0.02] transition-colors">
            <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-xs tracking-wider shadow-inner">
                  {initials}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    {item.user?.name || 'Guest / Unauthenticated'}
                  </span>
                  {item.user?.phone && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block flex items-center gap-1">
                      <FiPhone className="text-slate-500 text-[8px]" /> {item.user.phone}
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-2">
                {displayProductLogo ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center p-0.5">
                    <img src={displayProductLogo} alt={item.product?.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-slate-500 border border-white/5">
                    <FiBox size={16} />
                  </div>
                )}
                <span className="text-sm font-bold text-white truncate max-w-[200px]" title={item.product?.name}>
                  {item.product?.name || 'Unknown Product'}
                </span>
              </div>
            </td>
            <td className="py-4 px-5 text-xs font-bold text-blue-400 font-mono">
              {item.variantName || 'Default'}
            </td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.notified
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                {item.notified ? 'notified' : 'pending alert'}
              </span>
            </td>
            <td className="py-4 px-5 text-sm text-slate-400 font-medium">
              {formatDateTime(item.createdAt)}
            </td>
          </tr>
        );
      });
    }

    if (type === 'most-searched-brands' || type === 'brand-views') {
      const maxSearches = filtered[0]?.searches || 1;
      return currentItems.map((item, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index;
        const cleanLogo = (item.brand?.logo || '').replace(/\\/g, '/');
        const logoUrl = cleanLogo ? (cleanLogo.startsWith('http') || cleanLogo.startsWith('blob:') ? cleanLogo : `${BASE_URL}${cleanLogo.startsWith('/') ? '' : '/'}${cleanLogo}`) : '';
        const rankColors = ['text-amber-400', 'text-slate-300', 'text-orange-400'];
        const rankBadgeBg = ['bg-amber-500/15 border-amber-500/30', 'bg-slate-500/15 border-slate-400/30', 'bg-orange-500/15 border-orange-500/30'];
        const viewerCount = Array.isArray(item.viewers) ? item.viewers.length : 0;
        const rowKey = item.brand?._id || item.brand?.name || `brand-${globalIndex}`;

        // Calculate total products under this brand
        const brandProductsCount = extraData.products?.filter(p => {
          const pBrandId = typeof p.brand === 'object' ? p.brand?._id : p.brand;
          return pBrandId && pBrandId === item.brand?._id;
        }).length || 0;

        const isBrandActive = item.brand?.isActive !== false;

        return (
          <tr
            key={rowKey}
            onClick={() => {
              setSelectedViewerBreakdown({
                title: item.brand?.name || 'Unknown Brand',
                type: 'Brand',
                logo: logoUrl,
                searches: item.searches || item.views || 0,
                viewers: item.viewers || [],
                brandId: item.brand?._id,
                totalProducts: brandProductsCount,
                isActive: isBrandActive,
                brandObj: item.brand
              });
            }}
            className="bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer group/row"
          >
            <td className="py-4 px-5">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-black ${globalIndex < 3 ? rankBadgeBg[globalIndex] : 'bg-slate-800/60 border-white/10 text-slate-400'} ${globalIndex < 3 ? rankColors[globalIndex] : ''}`}>
                {globalIndex + 1}
              </span>
            </td>
            <td className="py-4 px-5">
              {logoUrl ? (
                <img src={logoUrl} alt={item.brand?.name} className="w-10 h-10 object-contain rounded-xl bg-white border border-white/10 p-1" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 text-xs font-bold">
                  {(item.brand?.name || '?').substring(0, 2).toUpperCase()}
                </div>
              )}
            </td>
            <td className="py-4 px-5 text-sm font-bold text-white group-hover/row:text-indigo-400 transition-colors">{item.brand?.name || 'Unknown Brand'}</td>
            <td className="py-4 px-5 text-sm text-slate-300 font-bold">{brandProductsCount} product(s)</td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${isBrandActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {isBrandActive ? 'active' : 'inactive'}
              </span>
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round((item.searches / maxSearches) * 100)}%` }} />
                </div>
                <span className="text-indigo-400 font-extrabold text-sm">{item.searches || 0} views</span>
              </div>
            </td>
            {/* <td className="py-4 px-5 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedViewerBreakdown({
                    title: item.brand?.name || 'Unknown Brand',
                    type: 'Brand',
                    logo: logoUrl,
                    searches: item.searches || 0,
                    viewers: item.viewers || []
                  });
                }}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                View Breakdown ({viewerCount})
              </button>
            </td> */}
          </tr>
        );
      });
    }

    if (type === 'most-searched-categories' || type === 'category-views') {
      const maxSearches = filtered[0]?.searches || 1;
      return currentItems.map((item, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index;
        const viewerCount = Array.isArray(item.viewers) ? item.viewers.length : 0;
        const rowKey = item.category?._id || item.category?.name || `cat-${globalIndex}`;

        // Calculate total products under this category
        const catProductsCount = extraData.products?.filter(p => {
          const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
          return pCatId && pCatId === item.category?._id;
        }).length || 0;

        const isCatActive = item.category?.isActive !== false;

        return (
          <tr
            key={rowKey}
            onClick={() => {
              const catImg = item.category?.image || item.category?.icon || '';
              const catLogoUrl = catImg.startsWith('http') ? catImg : (catImg ? `${BASE_URL}${catImg.startsWith('/') ? '' : '/'}${catImg}` : '');
              setSelectedViewerBreakdown({
                title: item.category?.name || 'Unknown Category',
                type: 'Category',
                logo: catLogoUrl,
                searches: item.searches || item.views || 0,
                viewers: item.viewers || [],
                categoryId: item.category?._id,
                totalProducts: catProductsCount,
                isActive: isCatActive,
                categoryObj: item.category
              });
            }}
            className="bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer group/row"
          >
            <td className="py-4 px-5">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-black ${globalIndex === 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                globalIndex === 1 ? 'bg-slate-500/15 border-slate-400/30 text-slate-300' :
                  globalIndex === 2 ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                    'bg-slate-800/60 border-white/10 text-slate-400'}`}>
                {globalIndex + 1}
              </span>
            </td>
            <td className="py-4 px-5 text-sm font-bold text-white group-hover/row:text-purple-400 transition-colors">{item.category?.name || 'Unknown Category'}</td>
            <td className="py-4 px-5 text-sm text-slate-300 font-bold">{catProductsCount} product(s)</td>
            <td className="py-4 px-5 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${isCatActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {isCatActive ? 'active' : 'inactive'}
              </span>
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round((item.searches / maxSearches) * 100)}%` }} />
                </div>
                <span className="text-purple-400 font-extrabold text-sm">{item.searches || 0} views</span>
              </div>
            </td>
            {/* <td className="py-4 px-5 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedViewerBreakdown({
                    title: item.category?.name || 'Unknown Category',
                    type: 'Category',
                    searches: item.searches || 0,
                    viewers: item.viewers || []
                  });
                }}
                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/30 text-purple-400 hover:text-purple-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                View Breakdown ({viewerCount})
              </button>
            </td> */}
          </tr>
        );
      });
    }

    if (type === 'most-searched') {
      const maxCount = filtered[0]?.count || 1;
      return currentItems.map((item, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index;
        return (
          <tr key={item._id || item.query || globalIndex} className="bg-transparent hover:bg-white/[0.02] transition-colors">
            <td className="py-4 px-5">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-black ${globalIndex === 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                globalIndex === 1 ? 'bg-slate-500/15 border-slate-400/30 text-slate-300' :
                  globalIndex === 2 ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                    'bg-slate-800/60 border-white/10 text-slate-400'}`}>
                {globalIndex + 1}
              </span>
            </td>
            <td className="py-4 px-5">
              <code className="text-sm font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 font-mono">
                {item.query}
              </code>
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600" style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                </div>
                <span className="text-amber-400 font-extrabold text-sm">{item.count} searches</span>
              </div>
            </td>
          </tr>
        );
      });
    }

    if (type === 'most-viewed-products' || type === 'product-views') {
      const maxViews = filtered[0]?.views || 1;
      return currentItems.map((item, index) => {
        const globalIndex = (currentPage - 1) * itemsPerPage + index;
        const firstImg = item.product?.images?.[0] || '';
        const imgUrl = firstImg.startsWith('http') ? firstImg : (firstImg ? `${BASE_URL}${firstImg.startsWith('/') ? '' : '/'}${firstImg}` : '');
        const viewerCount = Array.isArray(item.viewers) ? item.viewers.length : 0;
        const rowKey = item.product?._id || item.product?.name || `product-${globalIndex}`;

        // Resolve Brand and Category Names
        const prodId = item.product?._id || item.productId || (typeof item.product === 'string' ? item.product : undefined);
        const fullProduct = extraData.products?.find(p => 
          (prodId && p._id === prodId) || 
          (item.product?.name && p.name?.toLowerCase() === item.product.name.toLowerCase())
        ) || item.product;

        const brandId = typeof fullProduct?.brand === 'object' ? fullProduct?.brand?._id : fullProduct?.brand;
        const brandObj = extraData.brands?.find(b => b._id === brandId) || (typeof fullProduct?.brand === 'object' ? fullProduct?.brand : null);

        const categoryId = typeof fullProduct?.category === 'object' ? fullProduct?.category?._id : fullProduct?.category;
        const categoryObj = extraData.categories?.find(c => c._id === categoryId) || (typeof fullProduct?.category === 'object' ? fullProduct?.category : null);

        const brandName = brandObj?.name || 'N/A';
        const categoryName = categoryObj?.name || 'N/A';

        return (
          <tr
            key={rowKey}
            onClick={() => {
              setSelectedViewerBreakdown({
                title: item.product?.name || 'Unknown Product',
                type: 'Product',
                logo: imgUrl,
                searches: item.views || item.searches || 0,
                viewers: item.viewers || [],
                productId: (fullProduct?._id || item.product?._id || item.product?.id),
                fullProduct: fullProduct || item.product,
                brandName,
                categoryName
              });
            }}
            className="bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer group/row"
          >
            <td className="py-4 px-5">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-black ${globalIndex === 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                globalIndex === 1 ? 'bg-slate-500/15 border-slate-400/30 text-slate-300' :
                  globalIndex === 2 ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                    'bg-slate-800/60 border-white/10 text-slate-400'}`}>
                {globalIndex + 1}
              </span>
            </td>
            <td className="py-4 px-5">
              {imgUrl ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-white/10 flex items-center justify-center p-0.5">
                  <img src={imgUrl} alt={item.product?.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500">
                  <FiBox size={18} />
                </div>
              )}
            </td>
            <td className="py-4 px-5 text-sm font-bold text-white group-hover/row:text-blue-400 transition-colors truncate max-w-[200px]" title={item.product?.name}>
              {item.product?.name || 'Unknown Product'}
            </td>
            <td className="py-4 px-5 text-sm font-medium">
              {brandName !== 'N/A' ? (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                  {brandName}
                </span>
              ) : (
                <span className="text-slate-500 font-medium text-xs">-</span>
              )}
            </td>
            <td className="py-4 px-5 text-sm font-medium">
              {categoryName !== 'N/A' ? (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold">
                  {categoryName}
                </span>
              ) : (
                <span className="text-slate-500 font-medium text-xs">-</span>
              )}
            </td>
            <td className="py-4 px-5 text-sm font-mono">
              <span className="text-emerald-400 font-extrabold">
                ₹{(item.product?.offerPrice && Number(item.product.offerPrice) > 0 ? Number(item.product.offerPrice) : Number(item.product?.basePrice || 0)).toLocaleString('en-IN')}
              </span>
              {item.product?.offerPrice && Number(item.product.offerPrice) > 0 && Number(item.product.offerPrice) < Number(item.product?.basePrice || 0) && (
                <span className="ml-1.5 text-xs text-slate-500 line-through font-medium">
                  ₹{(item.product?.basePrice || 0).toLocaleString('en-IN')}
                </span>
              )}
            </td>
            <td className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" style={{ width: `${Math.round(((item.views || 0) / maxViews) * 100)}%` }} />
                </div>
                <span className="text-blue-400 font-extrabold text-sm">{item.views || 0} views</span>
              </div>
            </td>
            {/* <td className="py-4 px-5 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedViewerBreakdown({
                    title: item.product?.name || 'Unknown Product',
                    type: 'Product',
                    logo: imgUrl,
                    searches: item.views || 0,
                    viewers: item.viewers || []
                  });
                }}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                View Breakdown ({viewerCount})
              </button>
            </td> */}
          </tr>
        );
      });
    }

    // It's an activity logs list
    return currentItems.map((item, index) => {
      let resolvedText = '';
      const actionUpper = (item.action || '').toUpperCase();

      if (actionUpper === 'LOGIN') {
        resolvedText = `Logged in ${item.details?.method ? `via ${item.details.method}` : ''}`;
      } else if (actionUpper === 'LOGOUT') {
        resolvedText = 'Logged out';
      } else if (actionUpper === 'PRODUCT_VIEW' || actionUpper === 'PRODUCTVIEW' || actionUpper === 'PRODUCT') {
        if (item.latestProduct && item.latestProduct !== 'App Product Catalog') {
          resolvedText = `Viewed product: "${item.latestProduct}"`;
        } else {
          const prod = extraData.products?.find(p => p._id === item.details?.productId);
          if (prod) {
            resolvedText = `Viewed product: "${prod.name}"`;
          } else {
            resolvedText = `Viewed product catalog (Total: ${item.count || 1} views)`;
          }
        }
      } else if (actionUpper === 'BRAND_VIEW' || actionUpper === 'BRANDVIEW' || actionUpper === 'BRAND') {
        if (item.latestBrand && item.latestBrand !== 'App Brand Catalog') {
          resolvedText = `Viewed brand: "${item.latestBrand}"`;
        } else {
          const brandId = item.details?.brandId || item.details?.id;
          const brandName = extraData.brands?.find(b => b._id === brandId)?.name || brandId;
          if (brandName) {
            resolvedText = `Viewed brand: "${brandName}"`;
          } else {
            resolvedText = `Viewed brand catalog (Total: ${item.count || 1} views)`;
          }
        }
      } else if (actionUpper === 'CATEGORY_VIEW' || actionUpper === 'CATEGORYVIEW' || actionUpper === 'CATEGORY') {
        if (item.latestCategory && item.latestCategory !== 'App Category Catalog') {
          resolvedText = `Viewed category: "${item.latestCategory}"`;
        } else {
          const categoryId = item.details?.categoryId || item.details?.id;
          const categoryName = extraData.categories?.find(c => c._id === categoryId)?.name || categoryId;
          if (categoryName) {
            resolvedText = `Viewed category: "${categoryName}"`;
          } else {
            resolvedText = `Viewed category catalog (Total: ${item.count || 1} views)`;
          }
        }
      } else if (actionUpper === 'SEARCH') {
        const q = item.details?.query || item.query || item.details?.searchTerm;
        if (q && q !== 'Search Query') {
          resolvedText = `Searched query: "${q}"`;
        } else {
          resolvedText = `Searched catalog (Total: ${item.count || 1} queries)`;
        }
      } else {
        resolvedText = `${item.action} ${item.details ? JSON.stringify(item.details) : ''}`;
      }

      return (
        <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
          <td className="py-4 px-5 text-sm text-slate-500 font-bold font-mono">{(currentPage - 1) * itemsPerPage + index + 1}</td>
          <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">{item.user?.name || 'Unknown User'}</td>
          <td className="py-4 px-5 text-sm text-slate-300 font-mono select-all font-medium">{item.user?.email || '-'}</td>
          <td className="py-4 px-5 text-xs font-extrabold text-blue-400 font-mono tracking-wider">{item.action}</td>
          <td className="py-4 px-5 text-xs font-semibold text-slate-300 max-w-xs truncate" title={resolvedText}>{resolvedText}</td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt || item.timestamp)}</td>
        </tr>
      );
    });
  };

  const getTableHeaders = () => {
    if (type === 'revenue') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order Date</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Fulfillment</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>
        </>
      );
    }
    if (type === 'brands') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Logo</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
        </>
      );
    }
    if (type === 'products') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Price / Offer Price</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">No. of Variants</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
        </>
      );
    }
    if (type === 'variants') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Variant Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Price</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
        </>
      );
    }
    if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled' || type === 'deleted') {
      return (
        <>
          <th className="py-3 px-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">App Version</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Active</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Notifications</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">App Lock</th>
          {type === 'installed' && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Installed At</th>
          )}
          {type === 'uninstalled' && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Uninstalled At</th>
          )}
          {type === 'deleted' && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Deleted At</th>
          )}
          {(type === 'installed' || type === 'uninstalled' || type === 'deleted') && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">IP Address</th>
          )}
        </>
      );
    }
    if (type === 'logins') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Method</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
        </>
      );
    }

    if (type === 'logouts') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Method</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
        </>
      );
    }

    if (type === 'product-views' || type === 'most-viewed-products') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Image</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Price / Offer Price</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Product Views</th>
          {/* <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Viewer Breakdown</th> */}
        </>
      );
    }

    if (type === 'brand-views' || type === 'most-searched-brands') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Logo</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Brand Views</th>
          {/* <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Viewer Breakdown</th> */}
        </>
      );
    }
    if (type === 'category-views' || type === 'most-searched-categories') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Category Views</th>
          {/* <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Viewer Breakdown</th> */}
        </>
      );
    }
    if (type === 'request-stats') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">IP Address</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Request At</th>
          {/* <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th> */}
        </>
      );
    }
    if (type === 'analytics') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</th>
          <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Total Actions</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Active At</th>
        </>
      );
    }
    if (type === 'product-subscriptions') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Variant</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Notified Status</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Subscribed At</th>
        </>
      );
    }
    if (type === 'most-searched-brands') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Logo</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</th>
          <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
        </>
      );
    }
    if (type === 'most-searched-categories') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</th>
          <th className="py-3 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
        </>
      );
    }
    if (type === 'search-queries') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Log ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Search Query</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
        </>
      );
    }
    if (type === 'most-searched') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Search Query</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Searches</th>
        </>
      );
    }
    if (type === 'most-viewed-products') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">Rank</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Image</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Base Price</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</th>
        </>
      );
    }

    // Activity logs
    return (
      <>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[60px]">S.No.</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Log ID</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action Description</th>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
      </>
    );
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col justify-center items-center relative z-10 w-full">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full filter blur-[80px] pointer-events-none -z-10 animate-pulse"></div>
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <FiActivity className="text-blue-400 text-2xl animate-pulse" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-base tracking-tight font-sans">Accessing Logs</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">Retrieving detailed metrics, catalog indexes, and activity entries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[80vh] flex flex-col justify-center items-center relative z-10 w-full">
        <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 backdrop-blur-xl flex flex-col items-center gap-4 max-w-md text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <FiX size={24} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg tracking-tight">Records Load Error</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 min-h-full w-full z-0 isolate pb-10">


      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 hover:scale-105"
            title="Back"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <div className={`p-2 rounded-xl ${header.bg}`}>
                  <header.icon className={`${header.color} text-xl`} />
                </div>
                {header.title}
              </h1>

              {/* Selected Date / Interval Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2 shadow-sm">
                <FiCalendar size={14} className="text-blue-400 shrink-0" />
                <span>
                  {queryBreakdown === 'true' && queryBreakdownInterval === 'day' ? 'Daily Breakdown' :
                    queryBreakdown === 'true' && queryBreakdownInterval === 'month' ? 'Monthly Breakdown' :
                      queryStartDate && queryEndDate ? `${queryStartDate}  ➔  ${queryEndDate}` :
                        `${startDate}  ➔  ${endDate}`}
                </span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-medium leading-relaxed max-w-2xl">
              {header.desc}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-11 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {['product-views', 'most-viewed-products', 'brand-views', 'most-searched-brands', 'category-views', 'most-searched-categories', 'search-queries', 'most-searched'].includes(type) && (() => {
        const isSearch = type === 'search-queries' || type === 'most-searched';
        const cardTitle = queryBreakdown === 'true' && queryBreakdownInterval === 'day'
          ? (isSearch ? 'Daily Searches' : 'Daily Views')
          : queryBreakdown === 'true' && queryBreakdownInterval === 'month'
          ? (isSearch ? 'Monthly Searches' : 'Monthly Views')
          : (isSearch ? 'Total Searches' : 'Total Views');

        const cardCount = (() => {
          if (type === 'search-queries') {
            return data.length;
          }
          if (type === 'most-searched') {
            return data.reduce((sum, item) => sum + (item.count || 1), 0);
          }
          if (type === 'product-views' || type === 'most-viewed-products') {
            return data.reduce((sum, item) => sum + (item.views !== undefined ? item.views : (item.count !== undefined ? item.count : 1)), 0);
          }
          if (type === 'brand-views' || type === 'most-searched-brands' || type === 'category-views' || type === 'most-searched-categories') {
            return data.reduce((sum, item) => sum + (item.searches !== undefined ? item.searches : (item.views !== undefined ? item.views : (item.count !== undefined ? item.count : 1))), 0);
          }
          return data.length;
        })();

        return (
          <div className="flex gap-4 z-10 relative">
            <Card
              hoverable
              className={`p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${
                isSearch ? 'hover:border-amber-500/30' : 'hover:border-blue-500/30'
              }`}
            >
              <div className={`absolute inset-0 bg-linear-to-b ${isSearch ? 'from-amber-500/25' : 'from-blue-500/25'} to-transparent pointer-events-none`}></div>
              <div className="relative flex items-center justify-between gap-4 z-10">
                <div className="min-w-0 flex-1">
                  <h3 className={`${isSearch ? 'text-amber-400' : 'text-blue-400'} text-xs sm:text-sm font-bold tracking-wide truncate`}>
                    {cardTitle}
                  </h3>
                  <p className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-white mt-1 tracking-tight truncate">
                    {cardCount.toLocaleString()}{' '}
                    <span className="text-sm font-semibold text-slate-400">
                      {isSearch ? 'Searches' : 'Views'}
                    </span>
                  </p>
                </div>
                <div className={`p-3 sm:p-3.5 rounded-xl ${isSearch ? 'bg-amber-500/20' : 'bg-blue-500/20'} shrink-0`}>
                  {isSearch ? (
                    <FiSearch className="text-lg sm:text-xl text-amber-400" />
                  ) : (
                    <FiEye className="text-lg sm:text-xl text-blue-400" />
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Summary Cards Grid for Users Status */}
      {(type === 'users' || type === 'users-status') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative">
          {[
            {
              title: "Total Registered Users",
              value: data.length,
              icon: FiUsers,
              color: "text-blue-400",
              bg: "bg-blue-500/20",
              fromColor: "from-blue-500/25",
              hoverBorder: "hover:border-blue-500/30"
            },
            {
              title: "Online Now",
              value: `${data.filter(u => u.isOnline).length} Active`,
              icon: FiActivity,
              color: "text-emerald-400",
              bg: "bg-emerald-500/20",
              fromColor: "from-emerald-500/25",
              hoverBorder: "hover:border-emerald-500/30"
            },
            {
              title: "Notifications Enabled",
              value: `${data.filter(u => u.notificationsEnabled).length} Users`,
              icon: FiBell,
              color: "text-purple-400",
              bg: "bg-purple-500/20",
              fromColor: "from-purple-500/25",
              hoverBorder: "hover:border-purple-500/30"
            },
            {
              title: "App Lock Secured",
              value: `${data.filter(u => u.isAppLockEnabled).length} Users`,
              icon: FiShield,
              color: "text-rose-400",
              bg: "bg-rose-500/20",
              fromColor: "from-rose-500/25",
              hoverBorder: "hover:border-rose-500/30"
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

      {type === 'analytics' && extraData.funnel && (
        <div className="space-y-6 z-10 relative">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              {
                title: "Active Carts",
                value: extraData.cartMetrics?.activeCartsCount || 0,
                icon: FiShoppingBag,
                color: "text-amber-400",
                bg: "bg-amber-500/20",
                fromColor: "from-amber-500/25",
                hoverBorder: "hover:border-amber-500/30"
              },
              {
                title: "Cart Items",
                value: extraData.cartMetrics?.totalQuantitiesInCarts || 0,
                icon: FiLayers,
                color: "text-blue-400",
                bg: "bg-blue-500/20",
                fromColor: "from-blue-500/25",
                hoverBorder: "hover:border-blue-500/30"
              },
              {
                title: "Cart Adds",
                value: extraData.funnel?.cartAdds || 0,
                icon: FiBox,
                color: "text-emerald-400",
                bg: "bg-emerald-500/20",
                fromColor: "from-emerald-500/25",
                hoverBorder: "hover:border-emerald-500/30"
              },
              {
                title: "Checkouts",
                value: extraData.funnel?.checkoutInitiations || 0,
                icon: FiTrendingUp,
                color: "text-indigo-400",
                bg: "bg-indigo-500/20",
                fromColor: "from-indigo-500/25",
                hoverBorder: "hover:border-indigo-500/30"
              },
              {
                title: "Purchases",
                value: extraData.funnel?.checkoutSuccesses || 0,
                icon: FiCheck,
                color: "text-purple-400",
                bg: "bg-purple-500/20",
                fromColor: "from-purple-500/25",
                hoverBorder: "hover:border-purple-500/30"
              }
            ].map((metric, index) => (
              <Card
                key={index}
                hoverable
                className={`p-3.5 sm:p-4 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${metric.hoverBorder}`}
              >
                <div className={`absolute inset-0 bg-linear-to-b ${metric.fromColor} to-transparent pointer-events-none`}></div>
                <div className="relative flex items-center justify-between gap-2 z-10">
                  <div className="min-w-0 flex-1">
                    <h3 className={`${metric.color} text-[11px] sm:text-xs font-bold tracking-wide truncate`}>
                      {metric.title}
                    </h3>
                    <p
                      className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight truncate"
                      title={metric.value ? metric.value.toString() : ''}
                    >
                      {metric.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${metric.bg} shrink-0`}>
                    <metric.icon className={`text-base ${metric.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Funnel Graph Section & Manager Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Funnel Chart/Visual */}
            <div className="lg:col-span-1 bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-b from-blue-500/5 to-transparent pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <FiActivity size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Conversion Funnel
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Customer buying journey stages
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 1. Cart Adds */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        1. Cart Adds
                      </span>
                      <span className="text-white font-mono">{extraData.funnel?.cartAdds || 0}</span>
                    </div>
                    <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* 2. Checkout Initiations */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                        2. Checkout Initiations
                      </span>
                      <span className="text-white font-mono">{extraData.funnel?.checkoutInitiations || 0}</span>
                    </div>
                    <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${extraData.funnel?.cartAdds ? Math.max(5, Math.round(((extraData.funnel?.checkoutInitiations || 0) / extraData.funnel.cartAdds) * 100)) : 0}%` }} 
                      />
                    </div>
                  </div>

                  {/* 3. Purchases */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                        3. Successful Purchases
                      </span>
                      <span className="text-white font-mono">{extraData.funnel?.checkoutSuccesses || 0}</span>
                    </div>
                    <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" 
                        style={{ width: `${extraData.funnel?.cartAdds ? Math.max(5, Math.round(((extraData.funnel?.checkoutSuccesses || 0) / extraData.funnel.cartAdds) * 100)) : 0}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Rates Sub-Grid */}
              <div className="mt-5 pt-3.5 border-t border-white/10 grid grid-cols-2 gap-2.5 text-center">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cart to Checkout</span>
                  <span className="text-sm font-black text-indigo-400 mt-1 font-mono">{extraData.funnel?.conversionRates?.cartToCheckout || '0.0%'}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Checkout to Purchase</span>
                  <span className="text-sm font-black text-cyan-400 mt-1 font-mono">{extraData.funnel?.conversionRates?.checkoutToPurchase || '0.0%'}</span>
                </div>
              </div>
            </div>

            {/* Manager Performance table */}
            <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FiUsers size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Manager Sales Performance
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      State Sales Heads and Territory Managers
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                {/* State Sales Heads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State Sales Heads</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{extraData.managerPerformance?.salesHeads?.length || 0} active</span>
                  </div>
                  
                  {!extraData.managerPerformance?.salesHeads || extraData.managerPerformance.salesHeads.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-3 text-center bg-white/[0.01] rounded-xl border border-white/5">No Sales Heads registered.</div>
                  ) : (
                    <div className="space-y-2">
                      {extraData.managerPerformance.salesHeads.map(sh => (
                        <div key={sh._id} className="bg-white/[0.02] border border-white/5 hover:border-white/15 p-3 rounded-2xl transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate">{sh.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono truncate">{sh.email}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-400 font-mono block">₹{(sh.totalSales || 0).toLocaleString('en-IN')}</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{sh.orderCount || 0} orders</span>
                            </div>
                          </div>
                          {Array.isArray(sh.states) && sh.states.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {sh.states.map((st, i) => (
                                <span key={i} className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {st}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Territory Sales Managers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Territory Sales Managers</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{extraData.managerPerformance?.territorySalesManagers?.length || 0} active</span>
                  </div>

                  {!extraData.managerPerformance?.territorySalesManagers || extraData.managerPerformance.territorySalesManagers.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-3 text-center bg-white/[0.01] rounded-xl border border-white/5">No TSMs registered.</div>
                  ) : (
                    <div className="space-y-2">
                      {extraData.managerPerformance.territorySalesManagers.map(tsm => (
                        <div key={tsm._id} className="bg-white/[0.02] border border-white/5 hover:border-white/15 p-3 rounded-2xl transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white block truncate">{tsm.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono truncate">{tsm.email}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-400 font-mono block">₹{(tsm.totalSales || 0).toLocaleString('en-IN')}</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{tsm.orderCount || 0} orders</span>
                            </div>
                          </div>
                          {Array.isArray(tsm.territories) && tsm.territories.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tsm.territories.map((t, i) => (
                                <span key={i} className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden z-10 relative flex flex-col h-full">

        {/* Admin Analytics Table Filter Toolbar */}
        {type === 'analytics' && (() => {
          const filterOptions = [
            {
              id: 'ALL',
              label: 'All Activity Streams',
              count: getUserBasedAnalytics(data, 'ALL').length,
              activeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
            },
            {
              id: 'ADD_TO_CART',
              label: 'Add to Cart',
              count: getUserBasedAnalytics(data, 'ADD_TO_CART').length,
              activeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            },
            {
              id: 'REMOVE_FROM_CART',
              label: 'Remove from Cart',
              count: getUserBasedAnalytics(data, 'REMOVE_FROM_CART').length,
              activeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
            },
            {
              id: 'UPDATE_CART',
              label: 'Cart & Qty Updates',
              count: getUserBasedAnalytics(data, 'UPDATE_CART').length,
              activeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            },
            {
              id: 'INITIATED_PAYMENT',
              label: 'Initiated Payment',
              count: getUserBasedAnalytics(data, 'INITIATED_PAYMENT').length,
              activeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
            }
          ];

          return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.01] relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FiFilter size={14} />
                </div>
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider block">Segregate User Activity</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">Filter table records by cart event types</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filterOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setAnalyticsFilter(opt.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${analyticsFilter === opt.id
                      ? `${opt.activeStyle} ring-1 ring-white/20 scale-[1.02]`
                      : 'bg-slate-900/60 hover:bg-white/10 text-slate-400 border-white/10 hover:text-white'
                      }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${analyticsFilter === opt.id ? 'bg-black/50 text-white' : 'bg-white/5 text-slate-400'
                      }`}>
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap divide-x divide-white/10">
            <thead className="sticky top-0 z-20 bg-white/[0.03] backdrop-blur-md border-b border-white/10 text-slate-300 text-sm shadow-md">
              <tr className="divide-x divide-white/10">
                {getTableHeaders()}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 divide-x divide-white/10 bg-transparent">
              {renderTableContent()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && (
          <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
            <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
              Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filtered.length)}</span> of <span className="font-bold text-white">{filtered.length}</span> entries
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
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
                        if (page !== '...') handlePageChange(page);
                      }}
                      disabled={page === '...'}
                      className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border transition-colors shrink-0 transform-gpu ${
                        page === currentPage
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
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
              >
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Logins Modal */}
      {isModalOpen && selectedRowLogins && (() => {
        const modalConfig = getModalHeader(selectedRowLogins.action);
        const ModalIcon = modalConfig.icon;

        return createPortal(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-linear-to-br from-slate-950 via-slate-900 to-blue-950/95 border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="flex justify-between items-start mb-5 relative z-1000">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ModalIcon className={modalConfig.color} /> {modalConfig.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">{selectedRowLogins.user?.name || 'Unknown User'}</p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedRowLogins(null);
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* User Meta Card */}
              <div className="bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl p-4 mb-5 space-y-2 text-xs relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Email Address</span>
                  <span className="text-slate-200 font-bold select-all font-mono">{selectedRowLogins.user?.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    {modalConfig.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${modalConfig.color.replace('text-', 'bg-').replace('400', '500/10')} ${modalConfig.color} ${modalConfig.color.replace('text-', 'border-').replace('400', '500/20')}`}>
                    {selectedRowLogins.count} {modalConfig.unit}
                  </span>
                </div>
              </div>

              {/* List of individual entries */}
              {modalConfig.isViewType ? (
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    {selectedRowLogins.action === 'API_REQUESTS' ? 'Endpoint Hits' : 'Viewed Items'}
                  </span>
                  {selectedRowLogins.action === 'API_REQUESTS' ? (
                    Object.entries(selectedRowLogins.endpointStats || {}).map(([endpoint, count], idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors animate-in fade-in duration-150 font-mono text-xs"
                      >
                        <div className="text-left flex-1 min-w-0 pr-2">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Endpoint Path</span>
                          <span className="text-xs text-white font-bold mt-0.5 block truncate select-all" title={endpoint}>{endpoint}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Hits</span>
                          <span className="text-xs text-blue-400 font-extrabold mt-0.5 block font-sans">{count.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    selectedRowLogins.views?.map((view, index) => (
                      <div
                        key={view._id || index}
                        className="flex justify-between items-center bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors animate-in fade-in duration-150"
                      >
                        <div className="text-left flex-1 min-w-0 pr-2">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">{modalConfig.viewHeader}</span>
                          <span className="text-xs text-white font-bold mt-0.5 block truncate" title={view.productName || view.name}>{view.productName || view.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Viewed At</span>
                          <span className="text-xs text-slate-300 font-medium font-mono mt-0.5 block">{formatDateTime(view.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Detailed Logs</span>
                  {selectedRowLogins.logins?.map((login, index) => (
                    <div
                      key={login._id || index}
                      className="flex justify-between items-center bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors"
                    >
                      <div className="text-left">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Method</span>
                        <span className="text-xs text-white font-bold capitalize mt-0.5 block">{login.method}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Logged At</span>
                        <span className="text-xs text-slate-300 font-medium font-mono mt-0.5 block">{formatDateTime(login.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedRowLogins(null);
                }}
                className="w-full mt-6 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                Close History
              </button>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* User Analytics Activity Popup Modal */}
      {selectedUserAnalytics && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedUserAnalytics(null)}
        >
          <div 
            className="bg-slate-950/15 border border-white/20 shadow-2xl rounded-3xl p-5 sm:p-6 max-w-2xl w-full relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-transparent pointer-events-none" />

            <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3.5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm font-mono shadow-inner">
                  {(selectedUserAnalytics.name || 'G').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white leading-tight">
                      {selectedUserAnalytics.name || 'Guest / Unauthenticated'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Customer
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 select-all">{selectedUserAnalytics.email || 'No email'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserAnalytics(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                title="Close modal"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* User Meta Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 mb-4 text-xs relative z-10 shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">Phone Number</span>
                <span className="text-slate-200 font-semibold select-all font-mono">{selectedUserAnalytics.phone || '-'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">Last Logged IP</span>
                <span className="text-slate-200 font-semibold select-all font-mono truncate">{selectedUserAnalytics.ip || '-'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">Total Activity Logs</span>
                <span className="text-indigo-400 font-black font-mono">{selectedUserAnalytics.totalActions} Action(s)</span>
              </div>
            </div>

            {/* List of individual activity stream entries */}
            <div className="flex-1 min-h-0 flex flex-col relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FiActivity size={12} className="text-indigo-400" />
                  Activity Stream Log ({selectedUserAnalytics.activities?.length || 0})
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {selectedUserAnalytics.activities.map((item, index) => {
                  const eventType = (item.eventType || 'UNKNOWN').toUpperCase();
                  const isPayment = eventType === 'INITIATED_PAYMENT' || eventType === 'INITIATE_PAYMENT' || eventType.includes('PAY') || eventType.includes('CHECKOUT');
                  
                  const badgeColor =
                    eventType === 'ADD_TO_CART' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      eventType === 'REMOVE_FROM_CART' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        isPayment ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20';

                  return (
                    <div
                      key={item._id || index}
                      className="bg-white/[0.02] border border-white/10 hover:border-white/20 p-3 rounded-2xl transition-colors flex flex-col gap-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {eventType.replace(/_/g, ' ')}
                          </span>
                          {item.ip && (
                            <span className="text-slate-500 text-[10px] font-mono select-all">IP: {item.ip}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">
                          {formatDateTime(item.timestamp || item.createdAt)}
                        </span>
                      </div>

                      {/* Event Details Resolution */}
                      {(() => {
                        if (isPayment) {
                          const oId = String(item.details?.orderId || '');
                          const mTxn = String(item.details?.merchantTxnNo || '');
                          const amt = item.details?.amount;

                          // Lookup matching order from extraData.orders
                          const matchedOrder = (extraData.orders || []).find(o => 
                            (oId && (String(o._id) === oId || String(o.orderId) === oId || String(o.id) === oId)) ||
                            (mTxn && (String(o.merchantTxnNo) === mTxn || String(o.orderId) === mTxn))
                          );

                          const orderItems = matchedOrder ? (matchedOrder.items || matchedOrder.orderItems || matchedOrder.products || []) : [];

                          return (
                            <div className="space-y-2">
                              {/* Order & Transaction Row */}
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                {amt !== undefined && (
                                  <span className="text-sm font-black text-emerald-400 font-mono">
                                    ₹{Number(amt).toLocaleString('en-IN')}
                                  </span>
                                )}
                                {mTxn && (
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px]">
                                    Txn: {mTxn}
                                  </span>
                                )}
                                {oId && (
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px]">
                                    Order ID: #{oId}
                                  </span>
                                )}
                              </div>

                              {/* Products inside this Initiated Order */}
                              {orderItems.length > 0 ? (
                                <div className="pt-1">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Ordered Products ({orderItems.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {orderItems.map((oi, oiIdx) => {
                                      const prodObj = (extraData.products || []).find(p => String(p._id) === String(oi.product?._id || oi.product || oi.productId));
                                      const pName = oi.product?.name || oi.productName || oi.name || prodObj?.name || 'Product';
                                      const vName = oi.variant?.name || oi.variantName || '';
                                      const q = oi.quantity || oi.qty || 1;
                                      return (
                                        <div key={oiIdx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-white">
                                          <FiBox size={11} className="text-blue-400 shrink-0" />
                                          <span className="font-bold">{pName}</span>
                                          {vName && <span className="text-[10px] text-amber-400 font-medium">({vName})</span>}
                                          <span className="text-[11px] font-mono text-emerald-400 font-bold ml-0.5">×{q}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 italic">
                                  Order #{oId ? oId.slice(-8) : 'N/A'} • Initiated with amount ₹{Number(amt || 0).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // For standard cart events (ADD_TO_CART, REMOVE_FROM_CART, UPDATE_CART_QTY)
                        const productFromLookup = (extraData.products || []).find(p => p._id === item.details?.productId);
                        const pName = item.details?.productName || productFromLookup?.name || 'Unknown Product';
                        const vId = item.details?.variantId;
                        let vName = '';
                        if (vId && productFromLookup?.variants) {
                          const vObj = productFromLookup.variants.find(v => v._id === vId || v.name === vId);
                          if (vObj) vName = vObj.name;
                        }

                        return (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-xs text-white font-bold truncate" title={pName}>
                                {pName}
                              </span>
                              {vName && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Variant: {vName}
                                </span>
                              )}
                            </div>
                            {item.details?.quantity !== undefined && (
                              <span className="text-xs text-emerald-400 font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                Qty: {item.details.quantity}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Viewers & Engagement Breakdown Modal (Expanded) */}
      {selectedViewerBreakdown && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-lg flex items-center justify-center z-[9999] p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={() => {
            setSelectedViewerBreakdown(null);
            setViewerSearchQuery('');
          }}
        >
          <div 
            className="bg-slate-950/15 border border-white/20 shadow-2xl rounded-3xl p-5 sm:p-6 max-w-2xl w-full relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`absolute inset-0 pointer-events-none ${
              selectedViewerBreakdown.type === 'Brand' ? 'bg-transparent' :
              selectedViewerBreakdown.type === 'Category' ? 'bg-transparent' :
              'bg-transparent'
            }`} />

            {(() => {
              const bType = selectedViewerBreakdown.type;
              const totalViews = selectedViewerBreakdown.searches || 0;
              const viewersList = selectedViewerBreakdown.viewers || [];
              const uniqueCount = viewersList.length;
              const repeatCount = viewersList.filter(u => (u.count || 0) > 1).length;
              const avgViews = uniqueCount > 0 ? (totalViews / uniqueCount).toFixed(1) : '0';

              // Product specific metadata
              const fullProd = selectedViewerBreakdown.fullProduct || {};
              const offerPrice = Number(fullProd.offerPrice || 0);
              const basePrice = Number(fullProd.basePrice || 0);
              const effectivePrice = offerPrice > 0 ? offerPrice : basePrice;
              const discountPercent = (offerPrice > 0 && offerPrice < basePrice)
                ? Math.round(((basePrice - offerPrice) / basePrice) * 100)
                : 0;
              const variantsCount = fullProd.variants?.length || 0;

              // Calculate order stats from extraData.orders
              let ordersCount = 0;
              let totalUnitsSold = 0;
              let totalSalesRevenue = 0;
              const allOrders = Array.isArray(extraData.orders) ? extraData.orders : [];

              // Gather matching product IDs for this entity
              const matchingProdIds = new Set();
              if (bType === 'Product') {
                const pId = selectedViewerBreakdown.productId || fullProd._id || fullProd.id;
                if (pId) matchingProdIds.add(String(pId));
              } else if (bType === 'Brand') {
                const bId = selectedViewerBreakdown.brandId || selectedViewerBreakdown.brandObj?._id;
                if (bId && Array.isArray(extraData.products)) {
                  extraData.products.forEach(p => {
                    const pBrand = typeof p.brand === 'object' ? p.brand?._id : p.brand;
                    if (String(pBrand) === String(bId)) {
                      matchingProdIds.add(String(p._id));
                    }
                  });
                }
              } else if (bType === 'Category') {
                const cId = selectedViewerBreakdown.categoryId || selectedViewerBreakdown.categoryObj?._id;
                if (cId && Array.isArray(extraData.products)) {
                  extraData.products.forEach(p => {
                    const pCat = typeof p.category === 'object' ? p.category?._id : p.category;
                    if (String(pCat) === String(cId)) {
                      matchingProdIds.add(String(p._id));
                    }
                  });
                }
              }

              if (matchingProdIds.size > 0 && allOrders.length > 0) {
                allOrders.forEach(o => {
                  const items = o.items || o.orderItems || o.products || [];
                  let hasMatch = false;
                  items.forEach(it => {
                    const itProdId = String(it.product?._id || it.product?.id || it.product || it.productId || '');
                    if (matchingProdIds.has(itProdId)) {
                      hasMatch = true;
                      const qty = Number(it.quantity || it.qty || 1);
                      const price = Number(it.price || it.totalPrice || effectivePrice || 0);
                      totalUnitsSold += qty;
                      totalSalesRevenue += (price * qty);
                    }
                  });
                  if (hasMatch) ordersCount++;
                });
              }

              // Calculate traffic share for Brand & Category
              const totalAggregatedTraffic = Array.isArray(data)
                ? data.reduce((acc, it) => acc + (it.searches || it.views || 0), 0)
                : 0;
              const trafficSharePercent = totalAggregatedTraffic > 0
                ? ((totalViews / totalAggregatedTraffic) * 100).toFixed(1)
                : '0';

              // Filter viewers by search query
              const filteredViewers = viewersList.filter(item => {
                if (!viewerSearchQuery.trim()) return true;
                const q = viewerSearchQuery.toLowerCase().trim();
                const u = item.user || {};
                return (
                  (u.name || '').toLowerCase().includes(q) ||
                  (u.email || '').toLowerCase().includes(q) ||
                  (u.phone || '').toLowerCase().includes(q)
                );
              });

              return (
                <div className="flex flex-col h-full min-h-0 relative z-10 space-y-4">
                  {/* Top Header: Info (Left) + 2x2 Compact Metric Grid (Right) */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-white/10 pb-3.5 sm:pb-4 relative">
                    {/* Close Button - positioned top-right */}
                    <button
                      onClick={() => {
                        setSelectedViewerBreakdown(null);
                        setViewerSearchQuery('');
                      }}
                      className="absolute top-0 right-0 sm:static p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0 z-20 sm:order-3"
                      title="Close modal"
                    >
                      <FiX size={16} />
                    </button>

                    {/* Left Column: Image/Logo & Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-8 sm:pr-0 sm:order-1">
                      {/* Logo / Thumbnail */}
                      {selectedViewerBreakdown.logo ? (
                        <div 
                          onClick={() => {
                            if (bType === 'Product' && selectedViewerBreakdown.productId) {
                              setViewerProductModalId(selectedViewerBreakdown.productId);
                            }
                          }}
                          className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-white shrink-0 border border-white/15 p-1 flex items-center justify-center shadow-inner ${
                            bType === 'Product' ? 'cursor-pointer hover:scale-105 hover:border-blue-500/50 transition-all' : ''
                          }`}
                        >
                          <img 
                            src={selectedViewerBreakdown.logo} 
                            alt={selectedViewerBreakdown.title} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl shrink-0 flex items-center justify-center border bg-white/5 border-white/10 text-slate-300">
                          {bType === 'Brand' ? <FiTrendingUp size={24} /> :
                           bType === 'Category' ? <FiLayers size={24} /> :
                           <FiBox size={24} />}
                        </div>
                      )}

                      {/* Title & Tags */}
                      <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 
                            onClick={() => {
                              if (bType === 'Product' && selectedViewerBreakdown.productId) {
                                setViewerProductModalId(selectedViewerBreakdown.productId);
                              }
                            }}
                            className={`text-sm sm:text-base font-black text-white tracking-tight leading-snug truncate ${
                              bType === 'Product' ? 'hover:text-blue-400 cursor-pointer transition-colors' : ''
                            }`}
                            title={selectedViewerBreakdown.title}
                          >
                            {selectedViewerBreakdown.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                            {bType}
                          </span>
                        </div>

                        {/* Metadata Tags Row */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          {bType === 'Product' && (
                            <>
                              {selectedViewerBreakdown.brandName && selectedViewerBreakdown.brandName !== 'N/A' && (
                                <span className="font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1">
                                  <FiTag size={10} className="text-slate-400" />
                                  {selectedViewerBreakdown.brandName}
                                </span>
                              )}
                              {selectedViewerBreakdown.categoryName && selectedViewerBreakdown.categoryName !== 'N/A' && (
                                <span className="font-semibold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                                  {selectedViewerBreakdown.categoryName}
                                </span>
                              )}
                              {variantsCount > 0 && (
                                <span className="font-semibold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10">
                                  {variantsCount} Variant{variantsCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </>
                          )}

                          {(bType === 'Brand' || bType === 'Category') && (
                            <>
                              {selectedViewerBreakdown.totalProducts !== undefined && (
                                <span className="font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1">
                                  <FiBox size={10} className="text-slate-400" />
                                  {selectedViewerBreakdown.totalProducts} Catalog Product{selectedViewerBreakdown.totalProducts !== 1 ? 's' : ''}
                                </span>
                              )}
                              {selectedViewerBreakdown.isActive !== undefined && (
                                <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                                  selectedViewerBreakdown.isActive 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {selectedViewerBreakdown.isActive ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Product Pricing (if Product) */}
                        {bType === 'Product' && effectivePrice > 0 && (
                          <div className="flex items-center gap-2 text-xs font-mono pt-0.5 flex-wrap">
                            <span className="text-emerald-400 font-black text-sm">
                              ₹{effectivePrice.toLocaleString('en-IN')}
                            </span>
                            {discountPercent > 0 && (
                              <>
                                <span className="text-slate-500 line-through text-[11px]">
                                  ₹{basePrice.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25">
                                  {discountPercent}% OFF
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: 2x2 Compact Metric Grid */}
                    <div className="w-full sm:w-auto sm:order-2">
                      <div className="grid grid-cols-2 gap-1.5 w-full sm:min-w-[220px]">
                        {/* Total Views / Searches */}
                        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Total Views</span>
                            <FiEye size={11} className="text-slate-400" />
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span className="text-sm font-black text-white font-mono">{totalViews}</span>
                            <span className="text-[9px] text-slate-500">hits</span>
                          </div>
                        </div>

                        {/* Unique Viewers */}
                        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Unique</span>
                            <FiUsers size={11} className="text-slate-400" />
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span className="text-sm font-black text-white font-mono">{uniqueCount}</span>
                            <span className="text-[9px] text-slate-500">{repeatCount} rep</span>
                          </div>
                        </div>

                        {/* Avg Views */}
                        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[9px] font-bold uppercase tracking-wider">Avg Views</span>
                            <FiActivity size={11} className="text-slate-400" />
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span className="text-sm font-black text-white font-mono">{avgViews}x</span>
                            <span className="text-[9px] text-slate-500">/user</span>
                          </div>
                        </div>

                        {/* 4th Card: Ordered (for Product) vs Traffic Share (for Brand / Category) */}
                        {bType === 'Product' ? (
                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="text-[9px] font-bold uppercase tracking-wider">Ordered</span>
                              <FiShoppingBag size={11} className="text-slate-400" />
                            </div>
                            <div className="mt-1 flex items-baseline justify-between gap-1">
                              <span className="text-sm font-black text-emerald-400 font-mono">
                                {totalUnitsSold > 0 ? `${totalUnitsSold}u` : `${ordersCount} ord`}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {totalSalesRevenue > 0 ? `₹${totalSalesRevenue.toLocaleString('en-IN')}` : 'sold'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="text-[9px] font-bold uppercase tracking-wider">Traffic Share</span>
                              <FiPercent size={11} className="text-slate-400" />
                            </div>
                            <div className="mt-1 flex items-baseline justify-between gap-1">
                              <span className="text-sm font-black text-blue-400 font-mono">
                                {trafficSharePercent}%
                              </span>
                              <span className="text-[9px] text-slate-500 truncate">
                                {bType === 'Brand' ? 'of brand traffic' : 'of cat traffic'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Searchable Viewers Section Header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FiUsers className="text-blue-400" size={13} />
                        <span>Viewer Breakdown</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold">
                        {filteredViewers.length} of {uniqueCount}
                      </span>
                    </div>

                    {/* Viewer search input */}
                    {uniqueCount > 0 && (
                      <div className="relative flex-1 sm:max-w-xs">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                        <input
                          type="text"
                          placeholder="Filter user by name, email, phone..."
                          value={viewerSearchQuery}
                          onChange={(e) => setViewerSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                        />
                        {viewerSearchQuery && (
                          <button
                            onClick={() => setViewerSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scrollable list of user view metrics */}
                  <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1 flex-1">
                    {filteredViewers.length === 0 ? (
                      <div className="p-8 text-center bg-white/[0.01] rounded-2xl border border-white/5">
                        <FiUsers className="mx-auto text-slate-600 text-2xl mb-1.5" />
                        <p className="text-xs text-slate-400 font-medium">
                          {viewerSearchQuery
                            ? `No viewers match "${viewerSearchQuery}".`
                            : 'No individual viewer statistics recorded.'}
                        </p>
                      </div>
                    ) : (
                      [...filteredViewers]
                        .sort((a, b) => (b.count || 0) - (a.count || 0))
                        .map((item, index) => {
                          const u = item.user || {};
                          const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                          const percent = totalViews > 0
                            ? Math.round(((item.count || 0) / totalViews) * 100)
                            : 0;

                          return (
                            <div
                              key={u._id || u.email || index}
                              className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/15 transition-all duration-200 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2.5">
                                {/* User details */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-inner text-white ${
                                    bType === 'Brand' ? 'bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border-indigo-500/30' :
                                    bType === 'Category' ? 'bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border-purple-500/30' :
                                    'bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border-blue-500/30'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span 
                                        onClick={() => {
                                          if (u._id) {
                                            setSelectedViewerBreakdown(null);
                                            navigate(`/users/list?userId=${u._id}`);
                                          }
                                        }}
                                        className="text-xs text-white font-extrabold truncate hover:text-blue-400 transition-colors cursor-pointer"
                                        title={u.name || 'Unknown User'}
                                      >
                                        {u.name || 'Unknown User'}
                                      </span>
                                      {u.role && u.role !== 'user' && (
                                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                          {u.role}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                                      <span className="truncate">{u.email || '-'}</span>
                                      {u.phone && (
                                        <span className="text-slate-500 shrink-0 flex items-center gap-0.5">
                                          • {u.phone}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* View count & Time */}
                                <div className="text-right shrink-0 flex flex-col items-end">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                    bType === 'Brand' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                                    bType === 'Category' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                                    'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                  }`}>
                                    {item.count || 0} view{item.count !== 1 ? 's' : ''} ({percent}%)
                                  </span>
                                  {(item.lastViewedAt || item.timestamp || item.createdAt || u.lastActive) && (
                                    <span className="text-[9px] text-slate-500 font-medium mt-0.5 font-mono flex items-center gap-1">
                                      <FiClock size={9} />
                                      {formatDateTimeSmall(item.lastViewedAt || item.timestamp || item.createdAt || u.lastActive)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    bType === 'Brand' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                                    bType === 'Category' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {bType === 'Product' && selectedViewerBreakdown.productId && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedViewerBreakdown(null);
                              navigate(`/products/variants/${selectedViewerBreakdown.productId}`);
                            }}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FiSliders size={13} />
                            <span>Edit Variants</span>
                          </button>
                          <button
                            onClick={() => {
                              setViewerProductModalId(selectedViewerBreakdown.productId);
                            }}
                            className="flex-1 sm:flex-initial px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FiEye size={13} />
                            <span>Product Details</span>
                          </button>
                        </>
                      )}

                      {bType === 'Brand' && (
                        <button
                          onClick={() => {
                            setSelectedViewerBreakdown(null);
                            navigate(`/products/list?brand=${encodeURIComponent(selectedViewerBreakdown.brandId || selectedViewerBreakdown.title)}`);
                          }}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <FiPackage size={13} />
                          <span>View Brand Products</span>
                        </button>
                      )}

                      {bType === 'Category' && (
                        <button
                          onClick={() => {
                            setSelectedViewerBreakdown(null);
                            navigate(`/products/list?category=${encodeURIComponent(selectedViewerBreakdown.categoryId || selectedViewerBreakdown.title)}`);
                          }}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <FiLayers size={13} />
                          <span>View Category Products</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedViewerBreakdown(null);
                        setViewerSearchQuery('');
                      }}
                      className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border border-white/10 shadow-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* In-Page Product Details Modal */}
      <ProductDetailsModal
        isOpen={!!viewerProductModalId}
        productId={viewerProductModalId}
        onClose={() => setViewerProductModalId(null)}
        showEditButton={false}
      />
    </div>
  );
};

export default ActivityDetails;
