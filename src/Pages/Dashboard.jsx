import React, { useEffect, useState } from 'react';
import { api, BASE_URL } from '../api/axios';
import {
  FiTrendingUp, FiUsers, FiBox, FiDollarSign, FiLayers,
  FiActivity, FiEye, FiSearch, FiLogIn, FiLogOut, FiX, FiCheck, FiBell
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReactApexChart from 'react-apexcharts';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

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
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [requestStats, setRequestStats] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeActivityTab, setActiveActivityTab] = useState('ALL');
  const [selectedProductViews, setSelectedProductViews] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async (isPoll = false) => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [
          productsResponse,
          brandsResponse,
          categoriesResponse,
          usersResponse,
          ordersResponse,
          activityResponse,
          requestResponse,
          subsResponse
        ] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get('/activity/stats', { headers }).catch(() => ({ data: null })),
          api.get('/admin/request-stats', { headers }).catch(() => ({ data: { stats: [] } })),
          api.get('/admin/products/subscriptions/all', { headers }).catch(() => ({ data: { subscriptions: [] } }))
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
            appVersion: u.appVersion || match?.appVersion
          };
        });
        setUsers(mergedUsers);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setCategories(categoriesResponse.data);
        setActivityStats(activityResponse?.data || null);
        setRequestStats(requestResponse?.data?.stats || []);
        setSubscriptions(subsResponse?.data?.subscriptions || []);

        const fetchedOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data?.orders || [];
        setOrders(fetchedOrders);
        if (!isPoll) setLoading(false);
      } catch (err) {
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
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

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

    const pvLogs = (activityStats?.recentActivities || []).filter(act => {
      const action = (act.action || '').toUpperCase();
      const matchesAction = action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
      return matchesAction && (act.details?.productId === prod._id);
    });

    // Group logs by user
    const userViewCounts = {};
    const uniqueUsers = [];

    pvLogs.forEach(log => {
      const uId = log.user?._id || log.user?.email || 'unknown';
      if (!userViewCounts[uId]) {
        userViewCounts[uId] = {
          user: log.user || { name: 'Unknown User', email: 'N/A' },
          count: 0,
          latestView: log.createdAt
        };
        uniqueUsers.push(userViewCounts[uId]);
      }
      userViewCounts[uId].count += 1;
    });

    // Sort users by count descending
    uniqueUsers.sort((a, b) => b.count - a.count);

    setSelectedProductViews({
      product: prod,
      viewsList: uniqueUsers,
      totalViews: productItem.views || uniqueUsers.reduce((sum, u) => sum + u.count, 0)
    });
    setIsProductModalOpen(true);
  }

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

    // Brand Share: group products by brand
    const brandCounts = {};
    products.forEach(p => {
      const brandId = p.brand?._id || p.brand;
      if (brandId) {
        brandCounts[brandId] = (brandCounts[brandId] || 0) + 1;
      }
    });

    // Map brand names and counts, sorted descending
    let brandShare = Object.entries(brandCounts).map(([brandId, count]) => {
      const brandName = brands.find(b => b._id === brandId)?.name || 'Other';
      return { name: brandName, value: count };
    }).sort((a, b) => b.value - a.value).slice(0, 6);

    if (brandShare.length === 0 && products.length > 0) {
      brandShare = [{ name: 'Other Brands', value: products.length }];
    }

    return { labels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev };
  };

  const { labels: chartLabels, salesData, deliveredCountData, processingCountData, cancelledCountData, brandShare, totalRev } = processChartData();

  const salesChartConfig = {
    series: [{ name: 'Revenue', data: salesData }],
    options: {
      chart: { type: 'area', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      colors: ['#3b82f6'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories: chartLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#94a3b8', fontWeight: 600 } } },
      yaxis: { labels: { style: { colors: '#94a3b8', fontWeight: 600 }, formatter: (value) => `₹${value.toLocaleString('en-IN')}` } },
      grid: { borderColor: 'rgba(255, 255, 255, 0.1)', strokeDashArray: 3, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      markers: {
        size: 0,
        colors: ['#3b82f6'],
        strokeColors: 'rgba(255, 255, 255, 0.8)',
        strokeWidth: 2,
        hover: { size: 8 }
      },
      tooltip: { theme: 'dark', y: { formatter: (val) => `₹${val.toLocaleString('en-IN')}` } }
    },
    type: 'area'
  };

  const ordersChartConfig = {
    series: [
      { name: 'Delivered', data: deliveredCountData },
      { name: 'Processing', data: processingCountData },
      { name: 'Cancelled', data: cancelledCountData }
    ],
    options: {
      chart: { type: 'bar', stacked: true, toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      colors: ['#10b981', '#3b82f6', '#f43f5e'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: chartLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#94a3b8', fontWeight: 600 } } },
      yaxis: { labels: { style: { colors: '#94a3b8', fontWeight: 600 }, formatter: (val) => Math.round(val) } },
      grid: { borderColor: 'rgba(255, 255, 255, 0.1)', strokeDashArray: 3, yaxis: { lines: { show: true } } },
      legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: '#94a3b8', fontWeight: 600 } },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} orders` } }
    },
    type: 'bar'
  };

  const brandsChartConfig = {
    series: brandShare.map(b => b.value),
    options: {
      chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
      labels: brandShare.map(b => b.name),
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#f43f5e'],
      dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
      legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
      stroke: { colors: ['rgba(255,255,255,0.05)'], width: 1 },
      theme: { mode: 'dark' },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} products` } }
    },
    type: 'donut'
  };

  // Device metrics: dynamic charts
  const notificationsChartConfig = {
    series: [
      activityStats?.deviceMetrics?.notificationsEnabled || 0,
      activityStats?.deviceMetrics?.notificationsDisabled || 0
    ],
    options: {
      chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
      labels: ['Enabled', 'Disabled'],
      colors: ['#10b981', '#f43f5e'],
      dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
      legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
      stroke: { colors: ['rgba(255,255,255,0.05)'], width: 1 },
      theme: { mode: 'dark' },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} users` } }
    },
    type: 'donut'
  };

  const appVersionsData = activityStats?.deviceMetrics?.appVersions || [];
  const appVersionsLabels = appVersionsData.map(av => av.version || 'Unknown');
  const appVersionsCounts = appVersionsData.map(av => av.count || 0);

  const appVersionsChartConfig = {
    series: [{
      name: 'Devices',
      data: appVersionsCounts
    }],
    options: {
      chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      colors: ['#6366f1'],
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
          barHeight: '60%',
          distributed: true
        }
      },
      dataLabels: { enabled: true, formatter: (val) => `${val}`, style: { colors: ['#fff'] } },
      xaxis: {
        categories: appVersionsLabels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#94a3b8', fontWeight: 600 } }
      },
      yaxis: {
        labels: { style: { colors: '#94a3b8', fontWeight: 600 } }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        strokeDashArray: 3,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } }
      },
      legend: { show: false },
      theme: { mode: 'dark' },
      tooltip: { theme: 'dark', y: { formatter: (val) => `${val} devices` } }
    },
    type: 'bar'
  };

  // Sort request stats to show the top 5 users with most requests
  const topRequestStats = React.useMemo(() => {
    return [...requestStats]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5);
  }, [requestStats]);

  const requestStatsLabels = topRequestStats.map(item => {
    if (!item.user) return 'Guest / Unknown';
    return item.user.name || item.user.email || 'Guest';
  });
  const requestStatsCounts = topRequestStats.map(item => item.count || 0);

  const apiRequestStatsChartConfig = {
    series: [{
      name: 'Requests',
      data: requestStatsCounts
    }],
    options: {
      chart: { type: 'area', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      colors: ['#10b981'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: {
        categories: requestStatsLabels,
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
        colors: ['#10b981'],
        strokeColors: 'rgba(255, 255, 255, 0.8)',
        strokeWidth: 2,
        hover: { size: 6 }
      },
      theme: { mode: 'dark' },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => `${val.toLocaleString('en-IN')} requests` }
      }
    },
    type: 'area'
  };

  // Calculate activity-related values
  const totalProductViews = activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'PRODUCT_VIEW' || action === 'PRODUCTVIEW' || action === 'PRODUCT';
  }).length || 0;
  const recentActivitiesCount = activityStats?.recentActivities?.length || 0;

  const getFilteredActivities = () => {
    if (!activityStats?.recentActivities) return [];
    switch (activeActivityTab) {
      case 'SESSIONS':
        return activityStats.recentActivities.filter(act => {
          const actionUpper = (act.action || '').toUpperCase();
          return actionUpper === 'LOGIN' || actionUpper === 'LOGOUT';
        });
      case 'VIEWS':
        return activityStats.recentActivities.filter(act => {
          const actionUpper = (act.action || '').toUpperCase();
          return actionUpper === 'PRODUCT_VIEW' || actionUpper === 'PRODUCTVIEW' ||
            actionUpper === 'BRAND_VIEW' || actionUpper === 'BRANDVIEW' ||
            actionUpper === 'CATEGORY_VIEW' || actionUpper === 'CATEGORYVIEW';
        });
      case 'SEARCHES':
        return activityStats.recentActivities.filter(act => {
          const actionUpper = (act.action || '').toUpperCase();
          return actionUpper === 'SEARCH';
        });
      case 'ALL':
      default:
        return activityStats.recentActivities;
    }
  };
  const filteredActivities = getFilteredActivities();

  const sortedMostViewedProducts = React.useMemo(() => {
    return activityStats?.mostViewedProducts || [];
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
  const brandViewsCount = activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'BRAND_VIEW' || action === 'BRAND';
  }).length || 0;

  const categoryViewsCount = activityStats?.recentActivities?.filter(act => {
    const action = (act.action || '').toUpperCase();
    return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
  }).length || 0;

  const activityMetricCards = [
    {
      title: "Total Logins",
      value: activityStats?.summary?.totalLogins ?? (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGIN').length || 0),
      desc: "Active user logins log",
      path: "/dashboard/details/logins",
      icon: FiLogIn,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
      theme: "emerald"
    },
    {
      title: "Total Logouts",
      value: activityStats?.summary?.totalLogouts ?? (activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'LOGOUT').length || 0),
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
      value: activityStats?.recentActivities?.filter(act => (act.action || '').toUpperCase() === 'SEARCH').length || 0,
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
    }
  ];

  // ApexCharts Data & Options
  const apexSeries = [
    {
      name: 'Sales',
      data: salesData
    }
  ];

  const apexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
    },
    colors: ['#3b82f6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 0,
      colors: ['#3b82f6'],
      strokeColors: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 2,
      hover: {
        size: 8,
      }
    },
    xaxis: {
      categories: chartLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: '#94a3b8',
          fontWeight: 600,
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontWeight: 600,
        },
        formatter: (value) => `₹${value / 1000}k`
      }
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      strokeDashArray: 3,
      xaxis: {
        lines: { show: false }
      },
      yaxis: {
        lines: { show: true }
      }
    },
    theme: {
      mode: 'dark'
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `₹${val.toLocaleString('en-IN')}`
      }
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col justify-center items-center relative z-10 w-full">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[80px] pointer-events-none -z-10 transform-gpu animate-pulse"></div>
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl flex flex-col items-center gap-4 max-w-sm text-center shadow-2xl">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <FiTrendingUp className="text-blue-400 text-2xl animate-pulse" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-base tracking-tight">Initializing Dashboard</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Fetching live catalog statistics and session activity logs...</p>
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

      {/* Added 'transform-gpu' to the heavy blur elements to force hardware acceleration */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 z-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FiTrendingUp className="text-blue-400" /> Dashboard Overview
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-medium leading-relaxed">
            Welcome back to the <span className="text-blue-400 font-bold">Inizio</span>. Here is a summary of your system health, metrics, and logs.
          </p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 px-4.5 py-2 rounded-2xl flex items-center gap-3 shadow-lg shrink-0 w-fit self-start md:self-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-[10px] md:text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Live Connection</span>
            <span className="text-white font-extrabold font-mono mt-0.5 block">
              {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6 z-10">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-4 sm:p-5 xl:p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${metric.hoverBorder} ${metric.hoverGlow}`}
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
          </div>
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
              onClick={() => navigate('/dashboard/details/all')}
              className="flex items-center px-4 py-2 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] w-fit"
            >
              <FiActivity className="mr-1.5" /> View Detailed Log Feed
            </button>
          </div>

          {/* Main Activity Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Engagement Categories Grid */}
            <div className="lg:col-span-2 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden flex flex-col h-fit gap-6">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              {/* <div className="relative z-10 mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiActivity className="text-blue-400 animate-pulse" /> Engagement Categories
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Click on any category card below to navigate directly to its detailed dashboard logs, campaigns, catalog lists, or system directories.
                </p>
              </div> */}

              <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10">
                {activityMetricCards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(card.path)}
                    className="bg-slate-950/20 border border-white/5 hover:border-white/15 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[145px] group hover:bg-slate-950/45 hover:shadow-xl shadow-black/30"
                  >
                    <div className="flex justify-between items-start mb-3">
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
            </div>

            {/* Right Column: Most Viewed Products */}
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden flex flex-col lg:min-h-[580px] min-h-fit">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

              <div className="relative border-b border-white/5 pb-4 mb-6 z-10 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiEye className="text-blue-400" /> Most viewed Products
                </h3>
                <button
                  onClick={() => navigate('/dashboard/details/most-viewed-products')}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="relative z-10 flex-1 max-h-[460px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {!sortedMostViewedProducts || sortedMostViewedProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No product views recorded yet.</p>
                ) : (
                  sortedMostViewedProducts.map((item, idx) => {
                    const resolvedProductId = item.productId || item.product?._id || item.product;
                    const prod = products.find(p => p._id === resolvedProductId) || item.product || {};
                    const imgUrl = prod.images?.[0] || '';

                    let rankBg = 'bg-slate-800 text-slate-400 border-white/5';
                    let itemBorder = 'border-white/5 hover:border-blue-500/20 bg-slate-950/10 hover:bg-slate-950/30';
                    let rankLabel = `${idx + 1}`;

                    if (idx === 0) {
                      rankBg = 'bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-300/30';
                      itemBorder = 'border-amber-500/20 hover:border-amber-400/50 bg-gradient-to-r from-amber-500/5 via-slate-900/30 to-slate-950/50';
                      rankLabel = '1st';
                    } else if (idx === 1) {
                      rankBg = 'bg-gradient-to-r from-slate-300 to-slate-500 text-slate-950 font-black shadow-lg shadow-slate-400/25 border-slate-200/30';
                      itemBorder = 'border-slate-400/20 hover:border-slate-300/50 bg-gradient-to-r from-slate-400/5 via-slate-900/30 to-slate-950/50';
                      rankLabel = '2nd';
                    } else if (idx === 2) {
                      rankBg = 'bg-gradient-to-r from-orange-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-orange-500/25 border-orange-300/30';
                      itemBorder = 'border-orange-500/20 hover:border-orange-400/50 bg-gradient-to-r from-orange-500/5 via-slate-900/30 to-slate-950/50';
                      rankLabel = '3rd';
                    }

                    return (
                      <div
                        key={prod._id || idx}
                        onClick={() => handleProductViewsClick(item)}
                        className={`flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300 group cursor-pointer hover:scale-[1.01] ${itemBorder}`}
                      >
                        {/* Rank Badge */}
                        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-xl text-[10px] font-black border uppercase tracking-wider ${rankBg}`}>
                          {rankLabel}
                        </div>

                        {/* Product Image preview */}
                        {imgUrl ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-white/10 flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-105 p-0.5">
                            <img src={getImageUrl(imgUrl)} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0 flex items-center justify-center text-slate-500 border border-white/5 transition-transform duration-300 group-hover:scale-105">
                            <FiBox size={18} />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors leading-snug">{prod.name || 'Unknown Product'}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">Base Price: ₹{prod.basePrice?.toLocaleString('en-IN') || 0}</p>
                        </div>

                        {/* Views counter */}
                        <div className="shrink-0 bg-blue-500/10 text-blue-400 text-[10px] font-extrabold px-3 py-1 rounded-xl border border-blue-500/20 shadow-xs">
                          {item.views || 0} views
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Analytics Charts Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 relative z-10">

        {/* Sales Revenue Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[380px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sales Revenue</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Historical sales trends & revenue growth</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            <ReactApexChart
              options={salesChartConfig.options}
              series={salesChartConfig.series}
              type={salesChartConfig.type}
              height="100%"
              width="100%"
            />
          </div>
        </div>

        {/* Order Volume Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[380px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Order Volume</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Number of orders received over time</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            <ReactApexChart
              options={ordersChartConfig.options}
              series={ordersChartConfig.series}
              type={ordersChartConfig.type}
              height="100%"
              width="100%"
            />
          </div>
        </div>

        {/* Brand Share Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[380px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Brand Share</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Product distribution across brands</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10 flex items-center justify-center">
            {brandShare.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10 italic">
                No brand data available for distribution.
              </div>
            ) : (
              <ReactApexChart
                options={brandsChartConfig.options}
                series={brandsChartConfig.series}
                type={brandsChartConfig.type}
                height="100%"
                width="100%"
              />
            )}
          </div>
        </div>

      </div>

      {/* Device & Search Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 relative z-10">

        {/* App Version Distribution Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[420px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">App Version Distribution</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Registered devices per application release version</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10">
            {appVersionsCounts.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10 italic">
                No app version data available.
              </div>
            ) : (
              <ReactApexChart
                options={appVersionsChartConfig.options}
                series={appVersionsChartConfig.series}
                type={appVersionsChartConfig.type}
                height="100%"
                width="100%"
              />
            )}
          </div>
        </div>

        {/* Push Notification Alerts Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[420px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="relative border-b border-white/5 pb-3 mb-4 z-10">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Push Alerts Permission</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Notification permissions enabled vs disabled ratio</p>
            </div>
          </div>
          <div className="relative flex-1 w-full z-10 flex items-center justify-center">
            {notificationsChartConfig.series[0] === 0 && notificationsChartConfig.series[1] === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10 italic">
                No device permissions recorded.
              </div>
            ) : (
              <ReactApexChart
                options={notificationsChartConfig.options}
                series={notificationsChartConfig.series}
                type={notificationsChartConfig.type}
                height="100%"
                width="100%"
              />
            )}
          </div>
        </div>

        {/* API Request Stats Live Chart */}
        <div className="relative bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 overflow-hidden flex flex-col h-[420px]">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

          <div className="relative border-b border-white/5 pb-3 mb-4 z-10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                API Request Stats
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Top active accounts by API request volume</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/details/request-stats')}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
            >
              View All &rarr;
            </button>
          </div>

          <div className="relative flex-1 w-full z-10">
            {requestStatsCounts.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10 italic">
                No request statistics recorded yet.
              </div>
            ) : (
              <ReactApexChart
                options={apiRequestStatsChartConfig.options}
                series={apiRequestStatsChartConfig.series}
                type={apiRequestStatsChartConfig.type}
                height="100%"
                width="100%"
              />
            )}
          </div>
        </div>

      </div>

      {/* Product Views Details Modal */}
      {isProductModalOpen && selectedProductViews && createPortal(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
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
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">Base Price: ₹{selectedProductViews.product.basePrice?.toLocaleString('en-IN') || 0}</p>
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
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4.5 mb-5 flex justify-between items-center text-xs relative z-10">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Total System Views</span>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  navigate('/dashboard/details/product-views');
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/25 hover:bg-blue-500/40 text-blue-400 font-black border border-blue-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {selectedProductViews.totalViews} views &rarr;
              </button>
            </div>

            {/* Scrollable list of user view metrics */}
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">User View Frequency</span>
              {selectedProductViews.viewsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No detailed user views logs found.</p>
              ) : (
                selectedProductViews.viewsList.map((item, index) => (
                  <div
                    key={item.user?._id || index}
                    className="flex justify-between items-center bg-slate-950/30 border border-white/5 p-3 rounded-xl hover:border-white/10 transition-colors"
                  >
                    <div className="text-left min-w-0 pr-2">
                      <span className="text-xs text-white font-extrabold block truncate">{item.user.name || 'Unknown User'}</span>
                      <span className="text-[9px] text-slate-400 font-mono block mt-0.5 select-all truncate">{item.user.email || '-'}</span>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="px-2 py-0.5 rounded-md text-[9px] bg-blue-500/10 text-blue-400 font-extrabold border border-blue-500/20">
                        {item.count} view{item.count > 1 ? 's' : ''}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium mt-1 font-mono">
                        {formatActivityTime(item.latestView)}
                      </span>
                    </div>
                  </div>
                ))
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