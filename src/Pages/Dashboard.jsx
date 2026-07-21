import React, { useEffect, useState } from 'react';
import { api, BASE_URL } from '../api/axios';
import {
  FiTrendingUp, FiUsers, FiBox, FiDollarSign, FiLayers,
  FiActivity, FiEye, FiSearch, FiLogIn, FiLogOut, FiX, FiCheck, FiBell, FiCalendar, FiPhone
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  VisxAreaChart,
  VisxStackedBarChart,
  VisxDonutChart,
  VisxAppVersionsChart,
  VisxNotificationsDonutChart,
  VisxPriceTierGroupedBarChart
} from '../Components/VisxCharts';
import PageHeader from '../Components/PageHeader';
import { KPISkeleton, TableRowSkeleton } from '../Components/Skeleton';
import { formatDateDDMMYYYY, formatYYYYMMDDToDDMMYYYY } from '../utils/dateUtils';
import Card from '../Components/Card';



const formatActivityTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDateDDMMYYYY(date);
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

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [requestStats, setRequestStats] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [breakdownType, setBreakdownType] = useState('day'); // 'day', 'month', 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProductViews, setSelectedProductViews] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const navigate = useNavigate();

  const getActivityStatsUrl = () => {
    if (breakdownType === 'day') {
      return `/activity/stats?breakdown=true&breakdownInterval=day`;
    }
    if (breakdownType === 'month') {
      return `/activity/stats?breakdown=true&breakdownInterval=month`;
    }
    if (breakdownType === 'custom') {
      return `/activity/stats?startDate=${startDate}&endDate=${endDate}`;
    }
    return `/activity/stats`;
  };

  const getFilterQueryParams = () => {
    if (breakdownType === 'day') return '?breakdown=true&breakdownInterval=day';
    if (breakdownType === 'month') return '?breakdown=true&breakdownInterval=month';
    if (breakdownType === 'custom') return `?startDate=${startDate}&endDate=${endDate}`;
    return '';
  };

  useEffect(() => {
    const fetchData = async (isPoll = false) => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const activityUrl = getActivityStatsUrl();
        const [
          productsResponse,
          brandsResponse,
          categoriesResponse,
          usersResponse,
          ordersResponse,
          activityResponse,
          requestResponse,
          subsResponse,
          analyticsResponse
        ] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get(activityUrl, { headers }).catch(() => ({ data: null })),
          api.get('/admin/request-stats', { headers }).catch(() => ({ data: { stats: [] } })),
          api.get('/admin/products/subscriptions/all', { headers }).catch(() => ({ data: { subscriptions: [] } })),
          api.get('/admin/analytics', { headers }).catch(() => ({ data: null }))
        ]);
        const rawUsers = usersResponse.data || [];
        const actUsers = activityResponse?.data?.users || [];
        const mergedUsers = rawUsers.map(u => {
          const match = actUsers.find(au => au.userId === u._id || (au.email && u.email && au.email.toLowerCase() === u.email.toLowerCase()));
          const lastActive = u.lastActive || match?.lastActive;
          const isOnline = u.isOnline !== undefined ? u.isOnline : (lastActive ? (new Date() - new Date(lastActive) < 5 * 60 * 1000) : false);
          return {
            ...u,
            lastActive,
            isOnline,
            lastLoginAt: u.lastLoginAt || match?.lastLoginAt,
            appVersion: u.appVersion || match?.appVersion,
            notificationsEnabled: u.notificationsEnabled !== undefined ? u.notificationsEnabled : match?.notificationsEnabled,
            isAppInstalled: u.isAppInstalled !== undefined ? u.isAppInstalled : match?.isAppInstalled
          };
        });
        setUsers(mergedUsers);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setCategories(categoriesResponse.data);
        setActivityStats(activityResponse?.data || null);
        setRequestStats(requestResponse?.data?.stats || []);
        setSubscriptions(subsResponse?.data?.subscriptions || []);
        setAnalyticsData(analyticsResponse?.data || null);

        const fetchedOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data?.orders || [];
        setOrders(fetchedOrders);
        if (!isPoll) setLoading(false);
      } catch {
        if (!isPoll) {
          setError('Failed to load dashboard data.');
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData(false);

    // Setup polling every 30 seconds
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [breakdownType, startDate, endDate]);

  // console.log(products)
  // console.log(brands)

  const usernav = (index) => {
    const detailPaths = [
      'revenue',      // index 0
      'brands',       // index 1
      'products',     // index 2
      'variants',     // index 3
      'users',        // index 4
      'users-status'  // index 5
    ];
    if (detailPaths[index]) {
      navigate(`/dashboard/details/${detailPaths[index]}`);
    }
  }

  const handleProductViewsClick = (productItem) => {
    const resolvedProductId = productItem.productId || productItem.product?._id || productItem.product;
    const prod = products.find(p => p._id === resolvedProductId) || productItem.product || {};
    if (!prod || !prod._id) return;

    const userViewMap = {};

    // 1. Process viewers array attached directly to the product item
    if (Array.isArray(productItem.viewers) && productItem.viewers.length > 0) {
      productItem.viewers.forEach(v => {
        let uObj = v.user;
        if (!uObj || typeof uObj === 'string') {
          const matchedUser = users.find(u => u._id === (v.user || v.userId || v._id));
          uObj = matchedUser || { name: 'Unknown User', email: 'N/A' };
        }
        const uId = uObj._id || uObj.email || uObj.name || 'unknown';
        userViewMap[uId] = {
          user: uObj,
          count: (userViewMap[uId]?.count || 0) + (v.count || 1),
          latestView: v.lastViewedAt || v.timestamp || v.createdAt
        };
      });
    }

    // 2. Process recentActivities / activityStream for additional product view logs
    const stream = activityStats?.recentActivities || activityStats?.activityStream || [];
    stream.forEach(act => {
      const action = (act.action || act.eventType || '').toUpperCase();
      const matchesAction = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
      const pId = act.details?.productId || act.productId;
      if (matchesAction && pId === prod._id) {
        let uObj = act.user;
        if (!uObj || typeof uObj === 'string') {
          const matchedUser = users.find(u => u._id === (act.user || act.userId || act._id));
          uObj = matchedUser || { name: 'Unknown User', email: 'N/A' };
        }
        const uId = uObj._id || uObj.email || uObj.name || 'unknown';
        userViewMap[uId] = {
          user: uObj,
          count: (userViewMap[uId]?.count || 0) + 1,
          latestView: act.createdAt || act.timestamp || userViewMap[uId]?.latestView
        };
      }
    });

    const uniqueUsers = Object.values(userViewMap).sort((a, b) => b.count - a.count);

    setSelectedProductViews({
      product: prod,
      viewsList: uniqueUsers,
      totalViews: productItem.views || uniqueUsers.reduce((sum, u) => sum + u.count, 0)
    });
    setIsProductModalOpen(true);
  };

  // Process orders data for the chart (last 6 months)
  const processChartData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentDate = new Date();

    const labels = [];
    const salesData = [0, 0, 0, 0, 0, 0];
    const deliveredCountData = [0, 0, 0, 0, 0, 0];
    const processingCountData = [0, 0, 0, 0, 0, 0];
    const cancelledCountData = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }

    let totalRev = 0;

    orders.forEach(order => {
      const isPaid = order.paymentStatus?.toLowerCase() === 'paid';
      const status = order.orderStatus?.toLowerCase() || 'pending';

      if (order.totalAmount && isPaid) {
        totalRev += order.totalAmount;
      }

      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const monthsDiff = (currentDate.getFullYear() - orderDate.getFullYear()) * 12 + (currentDate.getMonth() - orderDate.getMonth());

        if (monthsDiff >= 0 && monthsDiff <= 5) {
          const index = 5 - monthsDiff;
          if (isPaid) {
            salesData[index] += order.totalAmount || 0;
          }
          if (status === 'delivered') {
            deliveredCountData[index] += 1;
          } else if (status === 'cancelled') {
            cancelledCountData[index] += 1;
          } else {
            processingCountData[index] += 1;
          }
        }
      }
    });

    // Brand Share: group products by brand accurately
    const brandCounts = {};
    (products || []).forEach(p => {
      let brandName = 'Unassigned';
      if (p.brand) {
        if (typeof p.brand === 'object' && p.brand !== null) {
          brandName = p.brand.name || (brands.find(b => String(b._id) === String(p.brand._id))?.name) || 'Other Brand';
        } else {
          const matchedBrand = (brands || []).find(b => String(b._id) === String(p.brand));
          brandName = matchedBrand ? matchedBrand.name : 'Other Brand';
        }
      }
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });

    const brandShareSorted = Object.entries(brandCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let brandShare = [];
    if (brandShareSorted.length > 5) {
      const top5 = brandShareSorted.slice(0, 5);
      const otherSum = brandShareSorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      brandShare = [...top5, { name: 'Other Brands', value: otherSum }];
    } else {
      brandShare = brandShareSorted;
    }

    if (brandShare.length === 0 && products.length > 0) {
      brandShare = [{ name: 'All Products', value: products.length }];
    }

    return { labels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev };
  };

  const { labels: chartLabels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev } = processChartData();

  const ordersChartConfig = {
    series: [
      { name: 'Delivered', data: deliveredCountData },
      { name: 'Processing', data: processingCountData },
      { name: 'Cancelled', data: cancelledCountData }
    ]
  };

  // Notification Push Alert Metrics calculation across ALL registered users
  const notificationsMetrics = React.useMemo(() => {
    let enabled = 0;
    let disabled = 0;

    (users || []).forEach(u => {
      const isEnabled = u.notificationsEnabled === true || (Array.isArray(u.devices) && u.devices.some(d => d.notificationsEnabled === true));
      if (isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
    });

    if (users && users.length > 0) {
      return { enabled, disabled };
    }

    return {
      enabled: Number(activityStats?.deviceMetrics?.notificationsEnabled) || 0,
      disabled: Number(activityStats?.deviceMetrics?.notificationsDisabled) || 0
    };
  }, [users, activityStats]);



  // Calculate Product Price Tier Engagement (Grouped Bar Chart)
  const priceTierEngagementData = React.useMemo(() => {
    const tiers = {
      budget: { label: 'Budget (< ₹1k)', views: 0, cartAdds: 0 },
      mid: { label: 'Mid-Tier (₹1k-10k)', views: 0, cartAdds: 0 },
      premium: { label: 'Premium (₹10k-20k)', views: 0, cartAdds: 0 }
    };

    const getTierKey = (price) => {
      const p = Number(price) || 0;
      if (p < 1000) return 'budget';
      if (p < 10000) return 'mid';
      return 'premium';
    };

    const productPriceMap = {};
    (products || []).forEach(prod => {
      if (prod && prod._id) {
        productPriceMap[prod._id] = Number(prod.offerPrice || prod.basePrice) || 0;
      }
    });

    const stream = [
      ...(activityStats?.recentActivities || []),
      ...(activityStats?.activityStream || []),
      ...(analyticsData?.activityStream || [])
    ];

    const productViewsMap = {};

    // 1. Accumulate views from mostViewedProducts API
    const mostViewed = activityStats?.mostViewedProducts || [];
    mostViewed.forEach(item => {
      const prodId = item.productId || (typeof item.product === 'object' ? item.product?._id : item.product);
      if (!prodId) return;

      let views = Number(item.views || item.count || 0);
      if (!views && Array.isArray(item.viewers)) {
        views = item.viewers.reduce((s, v) => s + (v.count || 1), 0);
      }

      productViewsMap[prodId] = (productViewsMap[prodId] || 0) + views;
    });

    // 2. Accumulate views from activity streams for products not in mostViewed
    const seenEvents = new Set();
    stream.forEach(evt => {
      const eventKey = evt._id || `${evt.userId || evt.user?._id || ''}-${evt.timestamp || evt.createdAt || ''}-${evt.eventType || evt.action || ''}`;
      if (seenEvents.has(eventKey)) return;
      seenEvents.add(eventKey);

      const action = (evt.action || evt.eventType || evt.type || '').toUpperCase();
      const isProductView = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'VIEW_PRODUCT' || (action.includes('PRODUCT') && action.includes('VIEW'));

      if (isProductView) {
        const prodId = evt.details?.productId || evt.productId || (typeof evt.product === 'object' ? evt.product?._id : evt.product);
        if (prodId && !mostViewed.some(mv => (mv.productId || (typeof mv.product === 'object' ? mv.product?._id : mv.product)) === prodId)) {
          productViewsMap[prodId] = (productViewsMap[prodId] || 0) + 1;
        }
      }

      // Accumulate cart additions per price tier
      if (action === 'ADD_TO_CART' || action === 'CART_ADD' || (action.includes('CART') && !action.includes('REMOVE') && !action.includes('CLEAR'))) {
        const prodId = evt.details?.productId || evt.productId || (typeof evt.product === 'object' ? evt.product?._id : evt.product);
        const price = (evt.details?.offerPrice || evt.details?.price || (typeof evt.product === 'object' ? (evt.product?.offerPrice || evt.product?.basePrice) : undefined)) ?? productPriceMap[prodId] ?? 0;
        const key = getTierKey(price);
        tiers[key].cartAdds += 1;
      }
    });

    // 3. Map views to price tiers
    Object.entries(productViewsMap).forEach(([prodId, views]) => {
      const prodObj = (products || []).find(p => p._id === prodId);
      const price = (prodObj?.offerPrice || prodObj?.basePrice) ?? productPriceMap[prodId] ?? 0;
      const key = getTierKey(price);
      tiers[key].views += views;
    });

    return {
      categories: [tiers.budget.label, tiers.mid.label, tiers.premium.label],
      views: [tiers.budget.views, tiers.mid.views, tiers.premium.views],
      cartAdds: [tiers.budget.cartAdds, tiers.mid.cartAdds, tiers.premium.cartAdds]
    };
  }, [products, activityStats, analyticsData]);



  const totalProductViews = (activityStats?.mostViewedProducts?.reduce((sum, item) => sum + (item.views !== undefined ? item.views : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
  }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.productViews || 0), 0)) || 0;

  const sortedMostViewedProducts = React.useMemo(() => {
    return activityStats?.mostViewedProducts || [];
  }, [activityStats]);

  // Calculate aggregate daily counts for trends chart
  const dailyCounts = React.useMemo(() => {
    const map = {};
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        if (item.date) {
          map[item.date] = (map[item.date] || 0) + (item.count || 0);
        }
      });
    };
    add(activityStats?.trends?.products);
    add(activityStats?.trends?.brands);
    add(activityStats?.trends?.categories);
    add(activityStats?.trends?.searches);

    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activityStats]);

  const dailyLabels = React.useMemo(() => dailyCounts.map(d => formatYYYYMMDDToDDMMYYYY(d.date)), [dailyCounts]);
  const dailyValues = React.useMemo(() => dailyCounts.map(d => d.count), [dailyCounts]);

  // Extract top trending highlights to display in the side list
  const trendingHighlights = React.useMemo(() => {
    const list = [];
    if (activityStats?.trends?.products) {
      activityStats.trends.products.forEach(p => {
        list.push({
          name: p.productName || 'Unknown Product',
          type: 'Product',
          date: formatYYYYMMDDToDDMMYYYY(p.date),
          count: p.count || 0
        });
      });
    }
    if (activityStats?.trends?.brands) {
      activityStats.trends.brands.forEach(b => {
        list.push({
          name: b.brandName || 'Unknown Brand',
          type: 'Brand',
          date: formatYYYYMMDDToDDMMYYYY(b.date),
          count: b.count || 0
        });
      });
    }
    if (activityStats?.trends?.categories) {
      activityStats.trends.categories.forEach(c => {
        list.push({
          name: c.categoryName || 'Unknown Category',
          type: 'Category',
          date: formatYYYYMMDDToDDMMYYYY(c.date),
          count: c.count || 0
        });
      });
    }
    if (activityStats?.trends?.searches) {
      activityStats.trends.searches.forEach(s => {
        list.push({
          name: `"${s.query}"`,
          type: 'Search',
          date: formatYYYYMMDDToDDMMYYYY(s.date),
          count: s.count || 0
        });
      });
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [activityStats]);

  // Dynamic data metrics
  const metrics = [
    {
      title: "Total Revenue",
      value: `₹${totalRev.toLocaleString('en-IN')}`,
      icon: FiDollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]"
    },
    {
      title: "No of Brands",
      value: brands.length,
      icon: FiTrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]"
    },
    {
      title: "No of Products",
      value: products.length,
      icon: FiBox,
      color: "text-amber-400",
      bg: "bg-amber-500/20",
      hoverBorder: "hover:border-amber-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]"
    },
    {
      title: "Total Products (with Variants)",
      value: products.reduce((sum, p) => sum + (Array.isArray(p.variants) && p.variants.length > 1 ? p.variants.length : 1), 0),
      icon: FiLayers,
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      hoverBorder: "hover:border-purple-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
    },
    {
      title: "Total Users",
      value: users.length,
      icon: FiUsers,
      color: "text-indigo-400",
      bg: "bg-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/30",
      hoverGlow: "hover:shadow-[0_0_20px_rgba(99,102,241,0.12)]"
    },
  ];

  // Dynamic activity metrics cards configurations
  const brandViewsCount = (activityStats?.mostSearchedBrands?.reduce((sum, item) => sum + (item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'BRAND_VIEW' || action === 'BRAND';
  }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.brandViews || 0), 0)) || 0;

  const categoryViewsCount = (activityStats?.mostSearchedCategories?.reduce((sum, item) => sum + (item.searches !== undefined ? item.searches : (Array.isArray(item.viewers) ? item.viewers.reduce((s, v) => s + (v.count || 0), 0) : 0)), 0)) || (activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
  }).length) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.categoryViews || 0), 0)) || 0;

  const activityMetricCards = [
    {
      title: "Total Logins",
      value: (activityStats?.summary?.totalLogins !== undefined && activityStats?.summary?.totalLogins !== null)
        ? activityStats.summary.totalLogins
        : ((activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.logins || 0), 0)) || (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGIN').length) || 0),
      desc: "Active user logins log",
      path: "/dashboard/details/logins",
      icon: FiLogIn,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
      theme: "emerald"
    },
    {
      title: "Total Logouts",
      value: (activityStats?.summary?.totalLogouts !== undefined && activityStats?.summary?.totalLogouts !== null)
        ? activityStats.summary.totalLogouts
        : ((activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.logouts || 0), 0)) || (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGOUT').length) || 0),
      desc: "Active user logouts log",
      path: "/dashboard/details/logouts",
      icon: FiLogOut,
      color: "text-rose-400",
      bg: "bg-rose-500/15",
      theme: "rose"
    },
    {
      title: "Product Views",
      value: totalProductViews,
      desc: "Product catalogs visited",
      path: "/dashboard/details/product-views",
      icon: FiEye,
      color: "text-blue-400",
      bg: "bg-blue-500/15",
      theme: "blue"
    },
    {
      title: "Brand Views",
      value: brandViewsCount,
      desc: "Brand catalogs visited",
      path: "/dashboard/details/brand-views",
      icon: FiTrendingUp,
      color: "text-indigo-400",
      bg: "bg-indigo-500/15",
      theme: "indigo"
    },
    {
      title: "Category Views",
      value: categoryViewsCount,
      desc: "Category segments visited",
      path: "/dashboard/details/category-views",
      icon: FiLayers,
      color: "text-purple-400",
      bg: "bg-purple-500/15",
      theme: "purple"
    },
    {
      title: "Search Queries",
      value: (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'SEARCH').length) || (activityStats?.mostSearched?.reduce((sum, item) => sum + (item.count || 0), 0)) || (activityStats?.users?.reduce((sum, u) => sum + (u.activityStats?.searches || 0), 0)) || 0,
      desc: "Catalog searches made",
      path: "/dashboard/details/search-queries",
      icon: FiSearch,
      color: "text-amber-400",
      bg: "bg-amber-500/15",
      theme: "amber"
    },
    {
      title: "Users Status",
      value: `${users.filter(u => u.isOnline).length} Online`,
      desc: `${users.filter(u => u.isAppLockEnabled).length} App Lock Secured`,
      path: "/dashboard/details/users-status",
      icon: FiActivity,
      color: "text-teal-400",
      bg: "bg-teal-500/15",
      theme: "teal"
    },
    {
      title: "App Installed",
      value: users.filter(u => checkAppStatus(u) === 'installed').length,
      desc: "Active Installations count",
      path: "/dashboard/details/installed",
      icon: FiCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
      theme: "emerald"
    },
    {
      title: "App Uninstalled",
      value: users.filter(u => checkAppStatus(u) === 'uninstalled').length,
      desc: "Device app uninstalls count",
      path: "/dashboard/details/uninstalled",
      icon: FiX,
      color: "text-rose-400",
      bg: "bg-rose-500/15",
      theme: "rose"
    },
    {
      title: "API Request Stats",
      value: requestStats.reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString(),
      desc: "Total tracked API endpoint hits",
      path: "/dashboard/details/request-stats",
      icon: FiActivity,
      color: "text-rose-400",
      bg: "bg-rose-500/15",
      theme: "rose"
    },
    {
      title: "Product Subscriptions",
      value: subscriptions.length,
      desc: "Back in stock alerts subscribed",
      path: "/dashboard/details/product-subscriptions",
      icon: FiBell,
      color: "text-cyan-400",
      bg: "bg-cyan-500/15",
      theme: "cyan"
    },
    {
      title: "Funnel & Cart Analytics",
      value: `${analyticsData?.cartMetrics?.activeCartsCount || 0} Active Carts`,
      desc: `Total Cart Adds: ${analyticsData?.funnel?.cartAdds || 0}`,
      path: "/dashboard/details/analytics",
      icon: FiTrendingUp,
      color: "text-indigo-400",
      bg: "bg-indigo-500/15",
      theme: "indigo"
    }
  ];

  if (loading) {
    return (
      <div className="relative space-y-6 min-h-full z-0 isolate w-full">
        <PageHeader
          title="Dashboard Overview"
          icon={FiTrendingUp}
          description="Welcome back to Inizio. Here is a summary of your system health, metrics, and logs."
        />

        <KPISkeleton cards={5} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative mt-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="h-6 bg-white/5 rounded-lg w-1/4 mb-6 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="p-6 min-h-[300px]">
              <div className="h-6 bg-white/5 rounded-lg w-1/2 mb-6 animate-pulse" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center animate-pulse">
                    <div className="h-4 bg-white/5 rounded-md w-2/3" />
                    <div className="h-6 bg-white/5 rounded-md w-12" />
                  </div>
                ))}
              </div>
            </Card>
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
            <FiActivity size={24} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg tracking-tight">Dashboard Connection Error</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">



      {/* Header Section */}
      <PageHeader
        title="Dashboard Overview"
        icon={FiTrendingUp}
        description="Welcome back to Inizio. Here is a summary of your system health, metrics, and logs."
        action={
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 px-4.5 py-2 rounded-2xl flex items-center gap-3 shadow-lg shrink-0 w-fit self-start md:self-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[10px] md:text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Live Connection</span>
              <span className="text-white font-extrabold font-mono mt-0.5 block">
                {formatDateDDMMYYYY(new Date())}
              </span>
            </div>
          </div>
        }
      />

      {/* Activity Stats Breakdown Filter Controls */}
      <Card className="!p-4 z-10 relative flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <FiCalendar size={16} />
          </div>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider block">Activity Data Interval</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Select breakdown mode or custom date range to update metric cards</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interval Selector Buttons */}
          <div className="bg-black/40 p-1 border border-white/10 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setBreakdownType('day')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${breakdownType === 'day' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                }`}
            >
              Daily Breakdown
            </button>
            <button
              onClick={() => setBreakdownType('month')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${breakdownType === 'month' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                }`}
            >
              Monthly Breakdown
            </button>
            <button
              onClick={() => setBreakdownType('custom')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${breakdownType === 'custom' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                }`}
            >
              Custom Date Range
            </button>
          </div>

          {/* Custom Date Pickers */}
          {breakdownType === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="date"]');
                  if (input && typeof input.showPicker === 'function') {
                    try { input.showPicker(); } catch (err) { console.error(err); }
                  }
                }}
                className="flex items-center gap-2 bg-black/30 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer rounded-xl px-3 py-1.5"
              >
                <span className="text-[9px] text-slate-400 font-bold uppercase select-none">From:</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent text-xs text-white outline-none border-none cursor-pointer font-bold font-mono"
                />
                <FiCalendar className="text-slate-400 hover:text-white transition-colors text-xs pointer-events-none" />
              </div>

              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input[type="date"]');
                  if (input && typeof input.showPicker === 'function') {
                    try { input.showPicker(); } catch (err) { console.error(err); }
                  }
                }}
                className="flex items-center gap-2 bg-black/30 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer rounded-xl px-3 py-1.5"
              >
                <span className="text-[9px] text-slate-400 font-bold uppercase select-none">To:</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent text-xs text-white outline-none border-none cursor-pointer font-bold font-mono"
                />
                <FiCalendar className="text-slate-400 hover:text-white transition-colors text-xs pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6 z-10">
        {metrics.map((metric, index) => (
          <Card
            key={index}
            hoverable
            className={`p-4 sm:p-5 xl:p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${metric.hoverBorder} ${metric.hoverGlow}`}
            onClick={() => usernav(index)}
          >
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <div className="relative flex items-center justify-between mb-4 z-10">
              <div className={`p-3.5 rounded-xl ${metric.bg}`}>
                <metric.icon className={`text-xl ${metric.color}`} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-slate-400 text-sm font-bold tracking-wide">{metric.title}</h3>
              <p
                className="text-2xl xl:text-xl 2xl:text-3xl font-extrabold text-white mt-1 tracking-tight truncate"
                title={metric.value.toString()}
              >
                {metric.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity & engagement Analytics Section */}
      {!loading && activityStats && (
        <div className="mt-8 space-y-2 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <FiActivity className="text-blue-400" /> Activity & Engagement Analytics
            </h2>
            <button
              onClick={() => navigate(`/dashboard/details/all${getFilterQueryParams()}`)}
              className="flex items-center px-4 py-2 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] w-fit"
            >
              <FiActivity className="mr-1.5" /> View Detailed Log Feed
            </button>
          </div>

          {/* Main Activity Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Engagement Categories Grid */}
            <Card className="lg:col-span-2 h-full gap-6">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10">
                {activityMetricCards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`${card.path}${getFilterQueryParams()}`)}
                    className="bg-slate-950/20 border border-white/5 hover:border-white/15 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[145px] group hover:bg-slate-950/45 hover:shadow-xl shadow-black/30"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-white transition-colors">{card.title}</span>
                      <div className={`p-2 rounded-xl ${card.bg}`}>
                        <card.icon className={`${card.color} text-lg`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-white tracking-tight">{card.value}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-2.5 group-hover:text-blue-400 transition-colors flex items-center gap-1.5 uppercase tracking-wider">
                        {card.desc} &rarr;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right Column: Most Viewed Products */}
            <Card className="lg:min-h-full min-h-fit bg-transparent backdrop-blur-2xl border border-white/10">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="relative border-b border-white/5 pb-4 mb-6 z-10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiEye className="text-blue-400" /> Most viewed Products
                </h3>
                <button
                  onClick={() => navigate(`/dashboard/details/most-viewed-products${getFilterQueryParams()}`)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="relative z-10 flex-1 max-h-[620px] overflow-y-auto space-y-3 p-0.5 custom-scrollbar pr-1">
                {!sortedMostViewedProducts || sortedMostViewedProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <FiBox className="mx-auto text-slate-600 text-3xl mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No product views recorded yet.</p>
                  </div>
                ) : (
                  sortedMostViewedProducts.map((item, idx) => {
                    const resolvedProductId = item.productId || item.product?._id || item.product;
                    const prod = products.find(p => p._id === resolvedProductId) || item.product || {};
                    const firstImg = prod.images?.[0] || '';
                    const imgUrl = firstImg.startsWith('http') ? firstImg : (firstImg ? `${BASE_URL}${firstImg.startsWith('/') ? '' : '/'}${firstImg}` : '');

                    let rankBg = 'bg-slate-800/80 text-slate-400 border-white/10';
                    let itemBorder = 'border-white/5 hover:border-blue-500/30 bg-transparent backdrop-blur-2xl hover:bg-white/5';
                    let rankLabel = `${idx + 1}`;

                    if (idx === 0) {
                      rankBg = 'bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-300/30';
                      itemBorder = 'border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-transparent';
                      rankLabel = '1st';
                    } else if (idx === 1) {
                      rankBg = 'bg-gradient-to-r from-slate-300 to-slate-500 text-slate-950 font-black shadow-lg shadow-slate-400/25 border-slate-200/30';
                      itemBorder = 'border-slate-400/30 hover:border-slate-300/60 bg-gradient-to-r from-slate-400/10 via-slate-900/40 to-transparent';
                      rankLabel = '2nd';
                    } else if (idx === 2) {
                      rankBg = 'bg-gradient-to-r from-orange-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-orange-500/25 border-orange-300/30';
                      itemBorder = 'border-orange-500/30 hover:border-orange-400/60 bg-gradient-to-r from-orange-500/10 via-slate-900/40 to-transparent';
                      rankLabel = '3rd';
                    }

                    return (
                      <div
                        key={prod._id || idx}
                        onClick={() => handleProductViewsClick(item)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group cursor-pointer hover:scale-[1.01] shadow-sm ${itemBorder}`}
                      >
                        {/* Rank Badge */}
                        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-xl text-[10px] font-black border uppercase tracking-wider ${rankBg}`}>
                          {rankLabel}
                        </div>

                        {/* Product Image preview */}
                        {imgUrl ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center shadow-inner p-0.5 group-hover:scale-105 transition-transform duration-300">
                            <img src={imgUrl} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800/80 shrink-0 flex items-center justify-center text-slate-500 border border-white/5 group-hover:scale-105 transition-transform duration-300">
                            <FiBox size={18} />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-white truncate group-hover:text-blue-400 transition-colors leading-snug" title={prod.name || 'Unknown Product'}>
                            {prod.name || 'Unknown Product'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 font-mono">
                            <span className="text-[10px] text-emerald-400 font-extrabold">
                              ₹{(prod.offerPrice && Number(prod.offerPrice) > 0 ? Number(prod.offerPrice) : Number(prod.basePrice || 0)).toLocaleString('en-IN')}
                            </span>
                            {prod.offerPrice && Number(prod.offerPrice) > 0 && Number(prod.offerPrice) < Number(prod.basePrice || 0) && (
                              <span className="text-[9px] text-slate-500 line-through">
                                ₹{(prod.basePrice || 0).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Views counter */}
                        <div className="shrink-0 bg-blue-500/15 text-blue-300 text-xs font-black font-mono px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-xs group-hover:bg-blue-500/25 transition-all">
                          {item.views || 0} views
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Trends Graph Row */}
      {!loading && activityStats && activityStats.trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative mt-6">
          {/* Trends Area Chart */}
          <Card className="lg:col-span-2 !p-5 overflow-hidden flex flex-col h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Overall Traffic & Search Trends
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Daily aggregate activity and query counts</p>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase">live insights</span>
            </div>

            <div className="relative flex-1 w-full z-10">
              <VisxAreaChart labels={dailyLabels} data={dailyValues} color="#3b82f6" valueSuffix=" actions" />
            </div>
          </Card>

          {/* Top Trending List */}
          <Card className="!p-5 overflow-hidden flex flex-col h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiTrendingUp className="text-indigo-400" />
                Trending Highlights
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Top active items by date</p>
            </div>

            <div className="relative flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar z-10">
              {trendingHighlights.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-12 italic">
                  No highlight events recorded.
                </div>
              ) : (
                trendingHighlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/10 border border-white/5 hover:border-indigo-500/10 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{item.type} &bull; {item.date}</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${item.type === 'Product' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      item.type === 'Brand' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        item.type === 'Category' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                      {item.count} views
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area (Analytics Charts Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 relative z-10">

        {/* Sales Revenue Chart */}
        <Card className="h-[380px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sales Revenue</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Historical sales trends & revenue growth</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            <VisxAreaChart labels={chartLabels} data={salesData} color="#3b82f6" valuePrefix="₹" />
          </div>
        </Card>

        {/* Order Volume Chart */}
        <Card className="h-[380px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Order Volume</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Number of orders received over time</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            <VisxStackedBarChart labels={chartLabels} series={ordersChartConfig.series} />
          </div>
        </Card>

        {/* Brand Share Chart */}
        <Card className="h-[380px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Brand Share</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Product distribution across brands</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10 flex items-center justify-center">
            <VisxDonutChart data={brandShare} centerLabel="Products" />
          </div>
        </Card>

      </div>

      {/* Device & Search Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 relative z-10">

        {/* App Version Distribution Chart */}
        <Card className="h-[420px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">App Version Distribution</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Registered devices per application release version</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            <VisxAppVersionsChart data={activityStats?.deviceMetrics?.appVersions || []} />
          </div>
        </Card>

        {/* Push Notification Alerts Chart */}
        <Card className="h-[420px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Push Alerts Permission</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Notification permissions enabled vs disabled ratio</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10 flex items-center justify-center">
            <VisxNotificationsDonutChart
              enabled={notificationsMetrics.enabled}
              disabled={notificationsMetrics.disabled}
            />
          </div>
        </Card>

        {/* Product Price Tier Engagement Chart */}
        <Card className="h-[420px] overflow-hidden flex flex-col !p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

          <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Product Price Tier Engagement
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Views vs cart additions by price tier</p>
            </div>
          </div>

          <div className="relative flex-1 w-full z-10">
            <VisxPriceTierGroupedBarChart
              categories={priceTierEngagementData.categories}
              views={priceTierEngagementData.views}
              cartAdds={priceTierEngagementData.cartAdds}
            />
          </div>
        </Card>

      </div>

      {/* Product Views Details Modal */}
      {isProductModalOpen && selectedProductViews && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="flex justify-between items-start mb-5 relative z-1000">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <FiEye size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight leading-snug truncate max-w-[240px]" title={selectedProductViews.product.name}>
                    {selectedProductViews.product.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                    <span className="text-emerald-400 font-extrabold">
                      Price: ₹{(selectedProductViews.product.offerPrice && Number(selectedProductViews.product.offerPrice) > 0 ? Number(selectedProductViews.product.offerPrice) : Number(selectedProductViews.product.basePrice || 0)).toLocaleString('en-IN')}
                    </span>
                    {selectedProductViews.product.offerPrice && Number(selectedProductViews.product.offerPrice) > 0 && Number(selectedProductViews.product.offerPrice) < Number(selectedProductViews.product.basePrice || 0) && (
                      <span className="text-slate-500 line-through">
                        ₹{(selectedProductViews.product.basePrice || 0).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  setSelectedProductViews(null);
                }}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Total Metric Highlight Banner */}
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 rounded-2xl p-4.5 mb-5 flex justify-between items-center text-xs relative z-10">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Total System Views</span>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  navigate(`/dashboard/details/product-views${getFilterQueryParams()}`);
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/25 hover:bg-blue-500/40 text-blue-300 font-black border border-blue-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {selectedProductViews.totalViews} views &rarr;
              </button>
            </div>

            {/* Scrollable list of user view metrics */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                User View Breakdown ({selectedProductViews.viewsList.length} user{selectedProductViews.viewsList.length !== 1 ? 's' : ''})
              </span>
              {selectedProductViews.viewsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">No individual user view statistics recorded.</p>
              ) : (
                selectedProductViews.viewsList.map((item, index) => {
                  const u = item.user || {};
                  const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const percent = selectedProductViews.totalViews > 0
                    ? Math.round(((item.count || 0) / selectedProductViews.totalViews) * 100)
                    : 0;

                  return (
                    <div
                      key={u._id || u.email || index}
                      className="flex items-center justify-between bg-transparent backdrop-blur-2xl border border-white/10 p-3 rounded-xl hover:border-white/20 transition-colors animate-in fade-in duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="w-8 h-8 rounded-lg border bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border-white/10 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-white font-extrabold block truncate">{u.name || 'Unknown User'}</span>
                          <span className="text-[9px] text-slate-400 font-mono block truncate select-all">{u.email || '-'}</span>
                          {u.phone && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <FiPhone size={8} /> {u.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.count || 0} view{item.count !== 1 ? 's' : ''} ({percent}%)
                        </span>
                        {item.latestView && (
                          <span className="text-[9px] text-slate-500 font-medium mt-1 font-mono">
                            {formatActivityTime(item.latestView)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setIsProductModalOpen(false);
                setSelectedProductViews(null);
              }}
              className="w-full mt-6 py-2.5 bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Close Details
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;