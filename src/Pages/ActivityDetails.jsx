import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api, BASE_URL } from '../api/axios';
import {
  FiArrowLeft, FiSearch, FiActivity, FiUsers, FiBox,
  FiDollarSign, FiLayers, FiTrendingUp, FiEye, FiLogIn,
  FiLogOut, FiClock, FiSettings, FiCheck, FiX
} from 'react-icons/fi';

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

const ActivityDetails = () => {
  const { type } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [extraData, setExtraData] = useState({}); // Stores lookup data like brands, categories, products
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowLogins, setSelectedRowLogins] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch lookups first or parallelly to map names (products, brands, categories)
        const [prodRes, brandRes, catRes] = await Promise.all([
          api.get('/products/', { headers }).catch(() => ({ data: [] })),
          api.get('/brands/', { headers }).catch(() => ({ data: [] })),
          api.get('/categories', { headers }).catch(() => ({ data: [] }))
        ]);

        const lookup = {
          products: prodRes.data,
          brands: brandRes.data,
          categories: catRes.data
        };
        setExtraData(lookup);

        if (type === 'revenue') {
          const res = await api.get('/orders/all', { headers });
          const fetchedOrders = Array.isArray(res.data) ? res.data : res.data?.orders || [];
          setData(fetchedOrders);
        } else if (type === 'brands') {
          setData(brandRes.data);
        } else if (type === 'products' || type === 'variants') {
          setData(prodRes.data);
        } else if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
          const res = await api.get('/admin/customers', { headers });
          let userList = Array.isArray(res.data) ? res.data : [];
          if (type === 'installed') {
            userList = userList.filter(u => checkAppStatus(u) === 'installed');
          } else if (type === 'uninstalled') {
            userList = userList.filter(u => checkAppStatus(u) === 'uninstalled');
          }
          userList.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            const dateA = a.lastActive ? new Date(a.lastActive) : 0;
            const dateB = b.lastActive ? new Date(b.lastActive) : 0;
            return dateB - dateA;
          });
          setData(userList);
        } else {
          // It's an activity metrics log type
          const res = await api.get('/activity/stats', { headers });
          const activities = res.data?.recentActivities || [];

          let filtered = [];
          if (type === 'logins') {
            const loginActivities = activities.filter(act => (act.action || '').toUpperCase() === 'LOGIN');
            const groupedLogins = [];
            const userMap = {};

            loginActivities.forEach(act => {
              const uId = act.user?._id || act.user?.email || 'unknown';
              if (!userMap[uId]) {
                userMap[uId] = {
                  _id: act._id || uId,
                  user: act.user,
                  action: act.action,
                  count: 0,
                  logins: [],
                  createdAt: act.createdAt
                };
                groupedLogins.push(userMap[uId]);
              }
              userMap[uId].count += 1;
              userMap[uId].logins.push({
                _id: act._id,
                method: act.details?.method || 'N/A',
                createdAt: act.createdAt
              });
            });
            groupedLogins.sort((a, b) => b.count - a.count);
            filtered = groupedLogins;
          } else if (type === 'logouts') {
            filtered = activities.filter(act => (act.action || '').toUpperCase() === 'LOGOUT');
          } else if (type === 'product-views') {
            const pvActivities = activities.filter(act => (act.action || '').toUpperCase() === 'PRODUCT_VIEW');
            const groupedPV = [];
            const userMap = {};

            pvActivities.forEach(act => {
              const uId = act.user?._id || act.user?.email || 'unknown';
              if (!userMap[uId]) {
                userMap[uId] = {
                  _id: act._id || uId,
                  user: act.user,
                  action: act.action,
                  count: 0,
                  views: [],
                  createdAt: act.createdAt
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
            groupedPV.sort((a, b) => b.count - a.count);
            filtered = groupedPV;
          } else if (type === 'brand-views') {
            const bvActivities = activities.filter(act => {
              const action = (act.action || '').toUpperCase();
              return action === 'BRAND_VIEW' || action === 'BRAND';
            });
            const groupedBV = [];
            const userMap = {};

            bvActivities.forEach(act => {
              const uId = act.user?._id || act.user?.email || 'unknown';
              if (!userMap[uId]) {
                userMap[uId] = {
                  _id: act._id || uId,
                  user: act.user,
                  action: 'BRAND_VIEW',
                  count: 0,
                  views: [],
                  createdAt: act.createdAt
                };
                groupedBV.push(userMap[uId]);
              }
              userMap[uId].count += 1;

              const brandId = act.details?.brandId;
              const brand = lookup.brands?.find(b => b._id === brandId);
              userMap[uId].views.push({
                _id: act._id,
                name: brand?.name || brandId || 'a brand',
                createdAt: act.createdAt
              });
            });
            // Sort grouped brand views descending by view count
            groupedBV.sort((a, b) => b.count - a.count);
            filtered = groupedBV;
          } else if (type === 'category-views') {
            const cvActivities = activities.filter(act => {
              const action = (act.action || '').toUpperCase();
              return action === 'CATEGORY_VIEW' || action === 'CATEGORY';
            });
            const groupedCV = [];
            const userMap = {};

            cvActivities.forEach(act => {
              const uId = act.user?._id || act.user?.email || 'unknown';
              if (!userMap[uId]) {
                userMap[uId] = {
                  _id: act._id || uId,
                  user: act.user,
                  action: 'CATEGORY_VIEW',
                  count: 0,
                  views: [],
                  createdAt: act.createdAt
                };
                groupedCV.push(userMap[uId]);
              }
              userMap[uId].count += 1;

              const catId = act.details?.categoryId;
              const cat = lookup.categories?.find(c => c._id === catId);
              userMap[uId].views.push({
                _id: act._id,
                name: cat?.name || catId || 'a category',
                createdAt: act.createdAt
              });
            });
            // Sort grouped category views descending by view count
            groupedCV.sort((a, b) => b.count - a.count);
            filtered = groupedCV;
          } else if (type === 'search-queries') {
            filtered = activities.filter(act => (act.action || '').toUpperCase() === 'SEARCH');
          } else {
            filtered = activities;
          }
          setData(filtered);
        }
      } catch (err) {
        console.error('Failed to load detail logs:', err);
        setError('Failed to fetch records. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

  // Derived Title & Details Configurations
  const getHeaderConfig = () => {
    switch (type) {
      case 'revenue':
        return { title: 'Sales Transactions', desc: 'Detailed log of client orders, fulfillment status, and total revenue calculations.', icon: FiDollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'brands':
        return { title: 'Brands Catalog Directory', desc: 'List of all system-registered retail brands and logos.', icon: FiTrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'products':
        return { title: 'Products Catalog Directory', desc: 'List of all inventory products and active prices.', icon: FiBox, color: 'text-amber-400', bg: 'bg-amber-500/20' };
      case 'variants':
        return { title: 'Variants Inventory', desc: 'Detailed overview of products and variant configurations.', icon: FiLayers, color: 'text-purple-400', bg: 'bg-purple-500/20' };
      case 'users':
      case 'users-status':
        return { title: 'Users Status', desc: 'Overview of user system permissions, active connections, and notification keys.', icon: FiUsers, color: 'text-teal-400', bg: 'bg-teal-500/20' };
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
      default:
        return { title: 'Activity Logs', desc: 'System log statistics overview.', icon: FiActivity, color: 'text-slate-400', bg: 'bg-slate-500/20' };
    }
  };

  const header = getHeaderConfig();

  // Filtering Logic
  const getFilteredData = () => {
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
      } else if (type === 'brands') {
        return item.name?.toLowerCase().includes(query);
      } else if (type === 'products' || type === 'variants') {
        return item.name?.toLowerCase().includes(query) || item._id?.toLowerCase().includes(query);
      } else if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.phone?.includes(query)
        );
      } else {
        // Activity logs filter
        const actUser = item.user?.name || 'unknown';
        const actEmail = item.user?.email || '';
        const actionStr = item.action || '';

        let detailMatch = false;
        if (item.details) {
          detailMatch = JSON.stringify(item.details).toLowerCase().includes(query);
        }

        return (
          actUser.toLowerCase().includes(query) ||
          actEmail.toLowerCase().includes(query) ||
          actionStr.toLowerCase().includes(query) ||
          detailMatch
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

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

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
      return currentItems.map((item) => (
        <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td className="py-4 px-5 text-xs font-mono text-blue-400 select-all font-semibold">#{item._id}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">{item.customerName || 'Walk-in Customer'}</td>
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
      return currentItems.map((item) => {
        const cleanPath = (item.logo || '').replace(/\\/g, '/');
        const logoUrl = item.logo ? `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}` : '';
        return (
          <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
            <td className="py-4 px-5">
              {item.logo ? (
                <img src={logoUrl} alt={item.name} className="w-10 h-10 object-contain rounded-xl bg-slate-900 border border-white/10 p-1" />
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

    if (type === 'products' || type === 'variants') {
      return currentItems.map((item) => {
        const variantCount = Array.isArray(item.variants) ? item.variants.length : 1;
        return (
          <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
            <td className="py-4 px-5 text-sm font-bold text-white truncate max-w-[200px]" title={item.name}>{item.name}</td>
            <td className="py-4 px-5 text-sm text-emerald-400 font-extrabold">₹{(item.basePrice || 0).toLocaleString('en-IN')}</td>
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

    if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
      return currentItems.map((item) => (
        <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td className="py-4 px-5 text-sm font-bold text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
              {item.name || 'Unknown User'}
            </div>
          </td>
          <td className="py-4 px-5 text-sm text-slate-300 select-all font-medium">{item.email}</td>
          <td className="py-4 px-5 text-xs font-bold text-blue-400 font-mono">{item.appVersion || 'unknown'}</td>
          <td className="py-4 px-5 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.notificationsEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'
              }`}>
              {item.notificationsEnabled ? 'enabled' : 'disabled'}
            </span>
          </td>
          <td className="py-4 px-5 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${item.isAppLockEnabled ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'
              }`}>
              {item.isAppLockEnabled ? 'secured' : 'inactive'}
            </span>
          </td>
          {type === 'installed' && (
            <td className="py-4 px-5 text-sm text-slate-300 font-medium">
              {formatDateTime(item.installedAt)}
            </td>
          )}
          {type === 'uninstalled' && (
            <td className="py-4 px-5 text-sm text-slate-300 font-medium">
              {formatDateTime(item.uninstalledAt)}
            </td>
          )}
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.lastActive)}</td>
        </tr>
      ));
    }

    if (type === 'logins') {
      return currentItems.map((item) => (
        <tr
          key={item._id}
          onClick={() => {
            setSelectedRowLogins(item);
            setIsModalOpen(true);
          }}
          className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group/row"
        >
          <td className="py-4 px-5 text-sm font-bold text-white">
            <div className="flex items-center gap-2 group-hover/row:text-blue-400 transition-colors">
              {item.user?.name || 'Unknown User'}
            </div>
          </td>
          <td className="py-4 px-5 text-sm text-slate-300 select-all font-medium">{item.user?.email || '-'}</td>
          <td className="py-4 px-5 text-xs font-extrabold text-emerald-400 font-mono tracking-wider">LOGIN</td>
          <td className="py-4 px-5">
            <span className="px-2.5 py-1 rounded-full font-extrabold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {item.count} log{item.count > 1 ? 's' : ''}
            </span>
          </td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt)}</td>
        </tr>
      ));
    }

    if (type === 'product-views' || type === 'brand-views' || type === 'category-views') {
      const badgeColor = type === 'product-views' 
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
        : type === 'brand-views' 
        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
        : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      const actionLabel = type === 'product-views' ? 'PRODUCT_VIEW' : type === 'brand-views' ? 'BRAND_VIEW' : 'CATEGORY_VIEW';

      return currentItems.map((item) => (
        <tr
          key={item._id}
          onClick={() => {
            setSelectedRowLogins(item);
            setIsModalOpen(true);
          }}
          className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group/row"
        >
          <td className="py-4 px-5 text-sm font-bold text-white">
            <div className="flex items-center gap-2 group-hover/row:text-blue-400 transition-colors">
              {item.user?.name || 'Unknown User'}
            </div>
          </td>
          <td className="py-4 px-5 text-sm text-slate-300 select-all font-medium">{item.user?.email || '-'}</td>
          <td className={`py-4 px-5 text-xs font-extrabold font-mono tracking-wider ${
            type === 'product-views' ? 'text-blue-400' : type === 'brand-views' ? 'text-indigo-400' : 'text-purple-400'
          }`}>{actionLabel}</td>
          <td className="py-4 px-5">
            <span className={`px-2.5 py-1 rounded-full font-extrabold text-xs border ${badgeColor}`}>
              {item.count} view{item.count > 1 ? 's' : ''}
            </span>
          </td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt)}</td>
        </tr>
      ));
    }

    // It's an activity logs list
    return currentItems.map((item) => {
      let resolvedText = '';
      const actionUpper = (item.action || '').toUpperCase();

      if (actionUpper === 'LOGIN') {
        resolvedText = `Logged in ${item.details?.method ? `via ${item.details.method}` : ''}`;
      } else if (actionUpper === 'LOGOUT') {
        resolvedText = 'Logged out';
      } else if (actionUpper === 'PRODUCT_VIEW' || actionUpper === 'PRODUCTVIEW' || actionUpper === 'PRODUCT') {
        const prod = extraData.products?.find(p => p._id === item.details?.productId);
        resolvedText = `Viewed product: "${prod?.name || item.details?.productId || 'a product'}"`;
      } else if (actionUpper === 'BRAND_VIEW' || actionUpper === 'BRANDVIEW' || actionUpper === 'BRAND') {
        const brandId = item.details?.brandId || item.details?.id;
        const brandName = extraData.brands?.find(b => b._id === brandId)?.name || brandId || 'a brand';
        resolvedText = `Viewed brand: "${brandName}"`;
      } else if (actionUpper === 'CATEGORY_VIEW' || actionUpper === 'CATEGORYVIEW' || actionUpper === 'CATEGORY') {
        const categoryId = item.details?.categoryId || item.details?.id;
        const categoryName = extraData.categories?.find(c => c._id === categoryId)?.name || categoryId || 'a category';
        resolvedText = `Viewed category: "${categoryName}"`;
      } else if (actionUpper === 'SEARCH') {
        resolvedText = `Searched query: "${item.details?.query || ''}"`;
      } else {
        resolvedText = `${item.action} ${item.details ? JSON.stringify(item.details) : ''}`;
      }

      return (
        <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td className="py-4 px-5 text-xs font-mono text-slate-500">#{item._id}</td>
          <td className="py-4 px-5 text-sm font-bold text-white">{item.user?.name || 'Unknown User'}</td>
          <td className="py-4 px-5 text-sm text-slate-300 font-mono select-all font-medium">{item.user?.email || '-'}</td>
          <td className="py-4 px-5 text-xs font-extrabold text-blue-400 font-mono tracking-wider">{item.action}</td>
          <td className="py-4 px-5 text-xs font-semibold text-slate-300 max-w-xs truncate" title={resolvedText}>{resolvedText}</td>
          <td className="py-4 px-5 text-sm text-slate-400 font-medium">{formatDateTime(item.createdAt)}</td>
        </tr>
      );
    });
  };

  const getTableHeaders = () => {
    if (type === 'revenue') {
      return (
        <>
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
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Logo</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
        </>
      );
    }
    if (type === 'products' || type === 'variants') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product ID</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Base Price</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">No. of Variants</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
        </>
      );
    }
    if (type === 'users' || type === 'users-status' || type === 'installed' || type === 'uninstalled') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">App Version</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Notifications</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">App Lock</th>
          {type === 'installed' && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Installed At</th>
          )}
          {type === 'uninstalled' && (
            <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Uninstalled At</th>
          )}
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Active</th>
        </>
      );
    }
    if (type === 'logins') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Login Count</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Login</th>
        </>
      );
    }
    if (type === 'product-views' || type === 'brand-views' || type === 'category-views') {
      return (
        <>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Name</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Email</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Views Count</th>
          <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Latest View</th>
        </>
      );
    }
    // Activity logs
    return (
      <>
        <th className="py-3 px-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Log ID</th>
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
      {/* Background glow blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full filter blur-[80px] opacity-40 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 hover:scale-105"
            title="Back to Dashboard"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <div className={`p-2 rounded-xl ${header.bg}`}>
                <header.icon className={`${header.color} text-xl`} />
              </div>
              {header.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-medium leading-relaxed max-w-2xl">
              {header.desc}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden z-10 relative">
        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {getTableHeaders()}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {renderTableContent()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4.5 border-t border-white/5 bg-white/[0.01]">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Page {currentPage} of {totalPages} ({filtered.length} total entries)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
                title="Previous Page"
              >
                &larr;
              </button>
              
              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                if (totalPages > 6) {
                  const isFirstOrLast = pageNumber === 1 || pageNumber === totalPages;
                  const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1;
                  
                  if (!isFirstOrLast && !isNearCurrent) {
                    if (pageNumber === 2 && currentPage > 3) {
                      return <span key="ellipsis-start" className="px-1.5 text-slate-600 text-xs font-black select-none">...</span>;
                    }
                    if (pageNumber === totalPages - 1 && currentPage < totalPages - 2) {
                      return <span key="ellipsis-end" className="px-1.5 text-slate-600 text-xs font-black select-none">...</span>;
                    }
                    return null;
                  }
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
                title="Next Page"
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/95 border border-white/10 shadow-2xl rounded-3xl p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
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
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 mb-5 space-y-2 text-xs relative z-10">
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
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Viewed Items</span>
                  {selectedRowLogins.views?.map((view, index) => (
                    <div 
                      key={view._id || index}
                      className="flex justify-between items-center bg-slate-950/30 border border-white/5 p-3 rounded-xl hover:border-white/10 transition-colors animate-in fade-in duration-150"
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
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 relative z-10">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Detailed Logs</span>
                  {selectedRowLogins.logins?.map((login, index) => (
                    <div 
                      key={login._id || index}
                      className="flex justify-between items-center bg-slate-950/30 border border-white/5 p-3 rounded-xl hover:border-white/10 transition-colors"
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
    </div>
  );
};

export default ActivityDetails;
