import { useEffect, useState } from 'react';
import { api, BASE_URL } from '../api/axios';
import { 
  FiTrendingUp, FiUsers, FiBox, FiDollarSign, FiLayers,
  FiActivity, FiEye, FiSearch, FiLogIn, FiLogOut
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
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

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const navigate = useNavigate();

   useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [productsResponse, brandsResponse, usersResponse, ordersResponse, activityResponse] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get('/activity/stats', { headers }).catch(() => ({ data: null }))
        ]);
        setUsers(usersResponse.data);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        setActivityStats(activityResponse?.data || null);
        
        const fetchedOrders = Array.isArray(ordersResponse.data) ? ordersResponse.data : ordersResponse.data?.orders || [];
        setOrders(fetchedOrders);
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // console.log(products)
  // console.log(brands)

  const usernav = (index) => {
    if(index == 1){
      navigate('/products/brands');
    }
    else if(index === 2){
      navigate('/products/list');
    }
    else if(index === 4) {
      navigate('/users/list');
    }
    else if(index === 0){
      navigate('/orders');
    }
    else if(index === 3){
      navigate('/products/list');
    }
  }

  // Process orders data for the chart (last 6 months)
  const processChartData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentDate = new Date();
    
    const labels = [];
    const salesData = [0, 0, 0, 0, 0, 0];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }
    
    let totalRev = 0;

    orders.forEach(order => {
      const isCancelled = order.orderStatus?.toLowerCase() === 'cancelled';
      
      if (order.totalAmount && !isCancelled) {
         totalRev += order.totalAmount;
      }
      
      if (order.createdAt && !isCancelled) {
        const orderDate = new Date(order.createdAt);
        const monthsDiff = (currentDate.getFullYear() - orderDate.getFullYear()) * 12 + (currentDate.getMonth() - orderDate.getMonth());
        
        if (monthsDiff >= 0 && monthsDiff <= 5) {
          const index = 5 - monthsDiff;
          salesData[index] += order.totalAmount || 0;
        }
      }
    });

    return { labels, salesData, totalRev };
  };

  const { labels: chartLabels, salesData, totalRev } = processChartData();

  // Dynamic data metrics
  const metrics = [
    { title: "Total Revenue", value: `₹${totalRev.toLocaleString('en-IN')}`, icon: FiDollarSign, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    { title: "No of Brands", value: brands.length, icon: FiTrendingUp, color: "text-blue-400", bg: "bg-blue-500/20" },
    { title: "No of Products", value: products.length, icon: FiBox, color: "text-amber-400", bg: "bg-amber-500/20" },
    { title: "Total Products (with Variants)", value: products.reduce((sum, p) => sum + (Array.isArray(p.variants) && p.variants.length > 1 ? p.variants.length : 1), 0), icon: FiLayers, color: "text-purple-400", bg: "bg-purple-500/20" },
    { title: "Total Users", value: users.length, icon: FiUsers, color: "text-indigo-400", bg: "bg-indigo-500/20" },
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

  return (
    <div className="relative space-y-4 min-h-full z-0 isolate w-full">
      
      {/* Added 'transform-gpu' to the heavy blur elements to force hardware acceleration */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="relative flex justify-between items-end mb-4 z-10">
        <div className="flex">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiTrendingUp className="text-blue-400" /> Dashboard</h1>
          {/* <p className="text-slate-500 font-medium mt-1">
            Welcome back to Inizio. You are logged in as <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded-md">{user?.role}</span>
          </p> */}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6 z-10">
        {metrics.map((metric, index) => (
          <div 
            key={index} 
            className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-4 sm:p-5 xl:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 cursor-pointer relative overflow-hidden group" 
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

      {/* Main Content Area (Sales Chart) */}
      <div className="relative mt-8 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 sm:p-8 overflow-hidden z-10">
        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
        <div className="relative flex items-center justify-between mb-6 z-10">
          <h2 className="text-lg font-bold text-white">Sales Overview</h2>
        </div>
        <div className="relative h-80 w-full z-10">
          <ReactApexChart options={apexOptions} series={apexSeries} type="area" height="100%" width="100%" />
        </div>
      </div>

      {/* Activity Stats Section */}
      {!loading && activityStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 z-10 relative">
          
          {/* Left Column: Recent User Activities */}
          <div className="lg:col-span-2 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
            <div className="relative flex items-center justify-between mb-4 border-b border-white/5 pb-4 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FiActivity className="text-blue-400" /> Recent User Activities
              </h2>
            </div>
            
            <div className="relative z-10 flex-1 overflow-y-auto max-h-96 custom-scrollbar divide-y divide-white/5 space-y-4">
              {!activityStats.recentActivities || activityStats.recentActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No recent activities recorded.
                </div>
              ) : (
                activityStats.recentActivities.map((act) => {
                  let actionText = '';
                  let actionIcon = null;
                  let iconBg = '';
                  let iconColor = '';
                  
                  if (act.action === 'LOGIN') {
                    actionText = `Logged in ${act.details?.method ? `via ${act.details.method}` : ''}`;
                    actionIcon = FiLogIn;
                    iconBg = 'bg-emerald-500/10';
                    iconColor = 'text-emerald-400';
                  } else if (act.action === 'LOGOUT') {
                    actionText = 'Logged out';
                    actionIcon = FiLogOut;
                    iconBg = 'bg-rose-500/10';
                    iconColor = 'text-rose-400';
                  } else if (act.action === 'PRODUCT_VIEW') {
                    const productId = act.details?.productId;
                    const prodName = products.find(p => p._id === productId)?.name || 'a product';
                    actionText = `Viewed product: "${prodName}"`;
                    actionIcon = FiEye;
                    iconBg = 'bg-blue-500/10';
                    iconColor = 'text-blue-400';
                  } else if (act.action === 'SEARCH') {
                    actionText = `Searched for "${act.details?.query || ''}"`;
                    actionIcon = FiSearch;
                    iconBg = 'bg-amber-500/10';
                    iconColor = 'text-amber-400';
                  } else {
                    actionText = `${act.action} ${act.details ? JSON.stringify(act.details) : ''}`;
                    actionIcon = FiActivity;
                    iconBg = 'bg-slate-500/10';
                    iconColor = 'text-slate-400';
                  }
                  
                  const ActionIconComponent = actionIcon;

                  return (
                    <div key={act._id} className="flex gap-4 pt-4 first:pt-0 align-middle">
                      {/* Action Icon */}
                      <div className={`p-2.5 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center ${iconBg}`}>
                        <ActionIconComponent className={iconColor} size={18} />
                      </div>
                      
                      {/* Activity Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-semibold text-white capitalize truncate">{act.user?.name || 'Unknown User'}</p>
                          <span className="text-xs text-slate-500 font-medium shrink-0">{formatActivityTime(act.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-1">{actionText}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{act.user?.email || ''}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Summary & Most Viewed */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Activity Summary mini-panel */}
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Activity Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-start gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Logins</span>
                  <span className="text-2xl font-black text-emerald-400">{activityStats.summary?.totalLogins || 0}</span>
                </div>
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-start gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Logouts</span>
                  <span className="text-2xl font-black text-rose-400">{activityStats.summary?.totalLogouts || 0}</span>
                </div>
              </div>
            </div>

            {/* Most Viewed Products */}
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 relative overflow-hidden flex-1 flex flex-col min-h-60 mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Most Viewed Products</h2>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {!activityStats.mostViewedProducts || activityStats.mostViewedProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No product views recorded yet.</p>
                ) : (
                  activityStats.mostViewedProducts.map((item, idx) => {
                    const prod = item.product || {};
                    const imgUrl = prod.images?.[0] || '';
                    
                    return (
                      <div key={prod._id || idx} className="flex items-center gap-3 p-2 bg-slate-950/20 hover:bg-slate-950/40 rounded-xl border border-white/5 transition-all">
                        {imgUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 border border-white/5 flex items-center justify-center">
                            <img src={getImageUrl(imgUrl)} alt={prod.name} className="w-full h-full object-cover bg-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-slate-500 border border-white/5">
                            <FiBox size={16} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{prod.name || 'Unknown Product'}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Price: ₹{prod.basePrice?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div className="shrink-0 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
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
    </div>
  );
};

export default Dashboard;