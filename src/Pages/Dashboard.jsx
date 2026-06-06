import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { FiTrendingUp, FiUsers, FiBox, FiDollarSign } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

   useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [productsResponse, brandsResponse, usersResponse, ordersResponse] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/orders/all', { headers }).catch(() => ({ data: [] }))
        ]);
        setUsers(usersResponse.data);
        setProducts(productsResponse.data);
        setBrands(brandsResponse.data);
        
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
    if(index ==1){
      navigate('/products/brands');
    }
    else if(index === 2){
      navigate('/products/list');
    }
    else if(index === 3) {
      navigate('/users/list');
    }
    else if(index === 0){
      navigate('/orders');
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
    <div className="relative space-y-6 min-h-full z-0 isolate w-full">
      
      {/* Added 'transform-gpu' to the heavy blur elements to force hardware acceleration */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="relative flex justify-between items-end mb-8 z-10">
        <div className="flex">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FiTrendingUp className="text-blue-400" /> Dashboard</h1>
          {/* <p className="text-slate-500 font-medium mt-1">
            Welcome back to Inizio. You are logged in as <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded-md">{user?.role}</span>
          </p> */}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 z-10">
        {metrics.map((metric, index) => (
          <div 
            key={index} 
            className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 cursor-pointer relative overflow-hidden group" 
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
              <p className="text-3xl font-extrabold text-white mt-1 tracking-tight">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area (Sales Chart) */}
      <div className="relative mt-8 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 sm:p-8 overflow-hidden z-10">
        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
        <div className="relative flex items-center justify-between mb-6 z-10">
          <h2 className="text-lg font-bold text-white">Electronics Sales Overview</h2>
        </div>
        <div className="relative h-80 w-full z-10">
          <ReactApexChart options={apexOptions} series={apexSeries} type="area" height="100%" width="100%" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;