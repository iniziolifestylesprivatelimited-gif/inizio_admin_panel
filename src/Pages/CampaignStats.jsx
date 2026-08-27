import React, { useState, useEffect, useRef } from 'react';
import { MdHistory, MdRefresh, MdImage } from 'react-icons/md';
import { 
  FiAlertCircle, 
  FiSearch, 
  FiChevronLeft, 
  FiChevronRight, 
  FiBarChart2, 
  FiActivity, 
  FiCheckCircle, 
  FiSend,
  FiUsers,
  FiSmartphone,
  FiChevronDown,
  FiX,
  FiFilter
} from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../api/axios';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import CustomDropdown from '../Components/CustomDropdown';
import { KPISkeleton, TableRowSkeleton } from '../Components/Skeleton';

const CampaignStats = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selection data to resolve names
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Recipients batch data state
  const [recipientsMap, setRecipientsMap] = useState({});

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [metricFilter, setMetricFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'sent' | 'received' | 'clicked'
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt' | 'sent' | 'received' | 'clicked' | 'deliveryRate' | 'clickRate'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});
  const itemsPerPage = 10;

  // Navigation Hook
  const navigate = useNavigate();

  const metricOptions = [
    { value: 'all', label: 'All (Sent / Recv / Clicked)' },
    { value: 'sent', label: 'Sent Only (> 0)' },
    { value: 'received', label: 'Received Only (> 0)' },
    { value: 'clicked', label: 'Clicked Only (> 0)' },
    { value: 'most_sent', label: 'Sort: Most Sent' },
    { value: 'most_received', label: 'Sort: Most Received' },
    { value: 'most_clicked', label: 'Sort: Most Clicked' }
  ];

  const handleMetricFilterChange = (val) => {
    setMetricFilter(val);
    if (val === 'most_sent') {
      setStatusFilter('all');
      setSortBy('sent');
      setSortOrder('desc');
    } else if (val === 'most_received') {
      setStatusFilter('all');
      setSortBy('received');
      setSortOrder('desc');
    } else if (val === 'most_clicked') {
      setStatusFilter('all');
      setSortBy('clicked');
      setSortOrder('desc');
    } else {
      setStatusFilter(val); // 'all', 'sent', 'received', 'clicked'
    }
  };

  const handleSortChange = (key) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  // Fetch campaign statistics and resolve helper data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [campaignRes, prodRes, catRes, brandRes] = await Promise.all([
        api.get('/admin/campaign-stats', { headers }),
        axios.get(`${BASE_URL}/api/products/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] }))
      ]);

      setCampaigns(Array.isArray(campaignRes.data) ? campaignRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load campaign statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Data fetching trigger
  useEffect(() => {
    fetchData();
  }, []);


  // Reset page when search or filter options change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const getActionTargetName = (clickAction, actionId) => {
    if (clickAction === 'homepage' || clickAction === 'home') return 'Home Page';
    if (!actionId) return '';
    if (clickAction === 'product') {
      const p = products.find(prod => prod._id === actionId);
      return p ? p.name : actionId;
    }
    if (clickAction === 'category') {
      const c = categories.find(cat => cat._id === actionId);
      return c ? c.name : actionId;
    }
    if (clickAction === 'brand') {
      const b = brands.find(br => br._id === actionId);
      return b ? b.name : actionId;
    }
    return actionId;
  };

  // Group campaigns sent at the same time (same title + same message + same timestamp up to minute)
  const groupCampaigns = (list) => {
    const groups = [];
    const seen = new Map();

    list.forEach(item => {
      // Round to the nearest minute to group campaigns sent at the same time
      const dt = item.createdAt ? new Date(item.createdAt) : null;
      const minuteKey = dt
        ? `${item.title}__${item.message}__${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}-${dt.getMinutes()}`
        : `${item.title}__${item.message}__unknown`;

      if (seen.has(minuteKey)) {
        const groupObj = seen.get(minuteKey);
        groupObj.members.push(item);
        // Accumulate stats
        groupObj.totalSent += item.totalSent || 0;
        groupObj.totalReceived += item.totalReceived || 0;
        groupObj.totalClicked += item.totalClicked || 0;
      } else {
        const group = {
          groupKey: minuteKey,
          representative: item, // Primary campaign (first encountered)
          members: [item],
          totalSent: item.totalSent || 0,
          totalReceived: item.totalReceived || 0,
          totalClicked: item.totalClicked || 0,
        };
        seen.set(minuteKey, group);
        groups.push(group);
      }
    });

    // Compute aggregated rates per group
    return groups.map(g => ({
      ...g,
      deliveryRate: g.totalSent > 0 ? `${((g.totalReceived / g.totalSent) * 100).toFixed(1)}%` : '0%',
      clickRate: g.totalSent > 0 ? `${((g.totalClicked / g.totalSent) * 100).toFixed(1)}%` : '0%',
    }));
  };

  const getPaginationRange = () => {
    const range = [];
    const delta = 1;
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  // Calculate Global KPI Summary Metrics
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, curr) => acc + (curr.totalSent || 0), 0);
  const totalReceived = campaigns.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
  const totalClicked = campaigns.reduce((acc, curr) => acc + (curr.totalClicked || 0), 0);

  const avgDeliveryRate = totalSent > 0 ? ((totalReceived / totalSent) * 100).toFixed(1) + '%' : '0%';
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) + '%' : '0%';

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter((item) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const messageMatch = (item.message || '').toLowerCase().includes(query);
    const idMatch = (item.campaignId || '').toLowerCase().includes(query);
    const targetName = getActionTargetName(item.clickAction, item.actionId) || '';
    const targetMatch = targetName.toLowerCase().includes(query);
    return titleMatch || messageMatch || idMatch || targetMatch;
  });

  // Group after filtering
  const groupedCampaigns = groupCampaigns(filteredCampaigns);

  // Quick Filter Counts
  const countAll = groupedCampaigns.length;
  const countSent = groupedCampaigns.filter(g => g.totalSent > 0).length;
  const countReceived = groupedCampaigns.filter(g => g.totalReceived > 0).length;
  const countClicked = groupedCampaigns.filter(g => g.totalClicked > 0).length;

  // Filter by metric / status (sent, received, clicked)
  const statusFilteredGroups = groupedCampaigns.filter((group) => {
    if (statusFilter === 'sent') return group.totalSent > 0;
    if (statusFilter === 'received') return group.totalReceived > 0;
    if (statusFilter === 'clicked') return group.totalClicked > 0;
    return true;
  });

  // Sort groups
  const sortedGroups = [...statusFilteredGroups].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;
    if (sortBy === 'sent') {
      aVal = a.totalSent || 0;
      bVal = b.totalSent || 0;
    } else if (sortBy === 'received') {
      aVal = a.totalReceived || 0;
      bVal = b.totalReceived || 0;
    } else if (sortBy === 'clicked') {
      aVal = a.totalClicked || 0;
      bVal = b.totalClicked || 0;
    } else if (sortBy === 'deliveryRate') {
      aVal = parseFloat(a.deliveryRate) || 0;
      bVal = parseFloat(b.deliveryRate) || 0;
    } else if (sortBy === 'clickRate') {
      aVal = parseFloat(a.clickRate) || 0;
      bVal = parseFloat(b.clickRate) || 0;
    } else {
      // Default: createdAt
      aVal = a.representative?.createdAt ? new Date(a.representative.createdAt).getTime() : 0;
      bVal = b.representative?.createdAt ? new Date(b.representative.createdAt).getTime() : 0;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  // Paginate groups
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = sortedGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Fetch campaign recipients details in batches for the current page
  useEffect(() => {
    const fetchRecipientsForCurrentPage = async () => {
      const ids = [];
      currentGroups.forEach(g => {
        g.members.forEach(m => {
          if (m.campaignId && recipientsMap[m.campaignId] === undefined && !ids.includes(m.campaignId)) {
            ids.push(m.campaignId);
          }
        });
      });

      if (ids.length === 0) return;

      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await api.get(`/admin/campaign-stats/${id}`, { headers });
              return { id, recipients: res.data?.recipients || [] };
            } catch (e) {
              console.error(`Failed to fetch recipients for ${id}`, e);
              return { id, recipients: [] };
            }
          })
        );

        setRecipientsMap(prev => {
          const next = { ...prev };
          results.forEach(({ id, recipients }) => {
            next[id] = recipients;
          });
          return next;
        });
      } catch (err) {
        console.error('Error fetching batch campaign details:', err);
      }
    };

    if (currentGroups && currentGroups.length > 0) {
      fetchRecipientsForCurrentPage();
    }
  }, [currentPage, currentGroups]);

  const renderDirectNames = (campaignId) => {
    const recipients = recipientsMap[campaignId];
    if (recipients === undefined) {
      return (
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium justify-center">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      );
    }
    if (recipients.length === 0) {
      return <span className="text-slate-500 text-xs font-semibold">No users</span>;
    }
    
    const names = recipients.map(r => r.user?.name || r.user?.email || r.user?.phone || 'N/A');
    const limit = 5;
    const displayedNames = names.slice(0, limit);
    const remaining = names.length - limit;

    return (
      <div className="flex flex-wrap gap-1 max-w-[200px] justify-center">
        {displayedNames.map((name, idx) => (
          <span 
            key={idx} 
            className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 text-[10px] font-semibold"
            title={name}
          >
            {name}
          </span>
        ))}
        {remaining > 0 && (
          <span 
            className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 text-[10px] font-bold"
            title={names.slice(limit).join(', ')}
          >
            +{remaining} more
          </span>
        )}
      </div>
    );
  };

  const renderGroupDirectNames = (group) => {
    const anyLoading = group.members.some(m => recipientsMap[m.campaignId] === undefined);
    if (anyLoading) {
      return (
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium justify-center">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      );
    }

    const allNames = [];
    group.members.forEach(m => {
      const recs = recipientsMap[m.campaignId] || [];
      recs.forEach(r => {
        const name = r.user?.name || r.user?.email || r.user?.phone || 'N/A';
        if (!allNames.includes(name)) {
          allNames.push(name);
        }
      });
    });

    if (allNames.length === 0) {
      return <span className="text-slate-500 text-xs font-semibold">No users</span>;
    }

    const limit = 5;
    const displayedNames = allNames.slice(0, limit);
    const remaining = allNames.length - limit;

    return (
      <div className="flex flex-wrap gap-1 max-w-[220px] justify-center text-center">
        {displayedNames.map((name, idx) => (
          <span 
            key={idx} 
            className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 text-[10px] font-semibold"
            title={name}
          >
            {name}
          </span>
        ))}
        {remaining > 0 && (
          <span 
            className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 text-[10px] font-bold"
            title={allNames.slice(limit).join(', ')}
          >
            +{remaining} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 w-full pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <MdHistory className="text-blue-400 shrink-0" />
            <span>Campaign Statistics</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-medium leading-relaxed">
            Review notification histories, check delivery status, and analyze click-through rates.
          </p>
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-72 md:w-80">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              placeholder="Search campaigns by title, message, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-black/20 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner text-white placeholder-slate-400 text-sm font-medium transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh Stats"
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-2xl border border-blue-500/30 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer h-[42px]"
          >
            <MdRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
        
      {/* KPI Cards Row */}
      {loading && campaigns.length === 0 ? (
        <KPISkeleton cards={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
          {[
            {
              title: "Total Campaigns",
              value: totalCampaigns,
              icon: FiBarChart2,
              color: "text-blue-400",
              bg: "bg-blue-500/20",
              fromColor: "from-blue-500/25",
              hoverBorder: "hover:border-blue-500/30"
            },
            {
              title: "Total Notifications Sent",
              value: totalSent.toLocaleString(),
              icon: FiSend,
              color: "text-indigo-400",
              bg: "bg-indigo-500/20",
              fromColor: "from-indigo-500/25",
              hoverBorder: "hover:border-indigo-500/30"
            },
            {
              title: "Avg. Delivery Rate",
              value: avgDeliveryRate,
              icon: FiCheckCircle,
              color: "text-emerald-400",
              bg: "bg-emerald-500/20",
              fromColor: "from-emerald-500/25",
              hoverBorder: "hover:border-emerald-500/30"
            },
            {
              title: "Avg. Click-Through Rate",
              value: avgClickRate,
              icon: FiActivity,
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
                    title={metric.value.toString()}
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

      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg" /> {error}
        </div>
      )}

      {loading && campaigns.length === 0 ? (
        <Card className="p-6">
          <TableRowSkeleton columns={5} rows={5} />
        </Card>
      ) : sortedGroups.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-white/20">
          <MdHistory className="text-5xl text-slate-500 mb-4" />
          <p className="text-slate-400 font-medium">No campaign statistics found matching the current filters.</p>
          {(metricFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setMetricFilter('all');
                setStatusFilter('all');
                setSortBy('createdAt');
                setSortOrder('desc');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-xl border border-blue-500/30 text-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden flex flex-col h-full isolate will-change-transform !p-0">
          <div className="overflow-auto custom-scrollbar max-h-[60vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-4 font-bold text-center">S.No</th>
                  <th className="p-4 font-bold">Campaign</th>
                  <th 
                    onClick={() => handleSortChange('createdAt')}
                    className="p-4 font-bold cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span className={sortBy === 'createdAt' ? 'text-blue-400 font-extrabold' : ''}>Message & Date</span>
                      {sortBy === 'createdAt' ? (
                        sortOrder === 'asc' ? <span className="text-blue-400">▲</span> : <span className="text-blue-400">▼</span>
                      ) : (
                        <span className="text-slate-600">⇅</span>
                      )}
                    </div>
                  </th>
                  <th className="p-4 font-bold text-center">Sent To</th>
                  <th className="p-3 font-bold text-center min-w-[210px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <CustomDropdown
                        value={metricFilter}
                        onChange={handleMetricFilterChange}
                        options={metricOptions}
                        defaultLabel="Sent / Received / Clicked"
                        statusColor={`!border-none !bg-slate-900/90 !py-1.5 !px-3 text-xs select-none hover:text-white ${
                          metricFilter !== 'all' ? 'text-blue-400 font-extrabold' : 'text-slate-300 font-bold'
                        }`}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentGroups.map((group, index) => {
                  const item = group.representative;
                  const isGrouped = group.members.length > 1;
                  const isExpanded = expandedGroups[group.groupKey];

                  return (
                    <React.Fragment key={group.groupKey}>
                      {/* Main Group Row */}
                      <tr 
                        onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/campaign-stats' } })}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                      >
                        {/* S.No */}
                        <td className="p-4 text-sm text-slate-400 text-center font-medium">
                          {indexOfFirstItem + index + 1}
                        </td>

                        {/* Campaign Info */}
                        <td className="p-4 text-sm font-medium text-white">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt="Campaign" 
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=Img'; }} 
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                                <MdImage className="text-xl" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 max-w-[200px]">
                              <span className="font-bold text-white truncate hover:text-blue-400 transition-colors" title={item.title}>
                                {item.title}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono tracking-wider truncate mt-0.5" title={item.campaignId}>
                                ID: {item.campaignId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Message snippet & Date */}
                        <td className="p-4 text-sm max-w-[250px]">
                          <div className="truncate text-slate-300 font-medium whitespace-normal line-clamp-2" title={item.message}>
                            {item.message}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            {item.createdAt ? formatDateTimeDDMMYYYY(item.createdAt) : 'N/A'}
                          </div>
                        </td>

                        {/* Sent To */}
                        <td className="p-4 text-sm text-center" onClick={(e) => { if (isGrouped) { e.stopPropagation(); toggleGroupExpand(group.groupKey); } }}>
                          <div className="inline-flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {renderGroupDirectNames(group)}
                              {isGrouped && (
                                <button
                                  className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-colors cursor-pointer"
                                  title={`${group.members.length} platform variants — click to ${isExpanded ? 'collapse' : 'expand'}`}
                                >
                                  <FiSmartphone size={10} />
                                  {group.members.length} Variants
                                  <FiChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                            {/* Platform breakdown badges */}
                            {/* <div className="flex flex-wrap gap-1 justify-center max-w-[150px]">
                              {group.members.map((m) => {
                                const platform = m.platform || m.targetPlatform || 'all';
                                const color = platform === 'android' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : platform === 'ios' ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                                const label = platform === 'android' ? 'Android'
                                            : platform === 'ios' ? 'iOS'
                                            : 'All Users';
                                return (
                                  <span key={m.campaignId} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wide ${color}`}>
                                    {label} ({m.totalSent || 0})
                                  </span>
                                );
                              })}
                            </div> */}
                          </div>
                        </td>

                        {/* Action Target Link */}
                        {/* <td className="p-4 text-sm text-center">
                          {item.clickAction && item.clickAction !== 'none' ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-extrabold border border-blue-500/20 uppercase tracking-wide">
                                {item.clickAction}
                              </span>
                              {item.actionId && (
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]" title={getActionTargetName(item.clickAction, item.actionId)}>
                                  {getActionTargetName(item.clickAction, item.actionId)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs font-semibold">None</span>
                          )}
                        </td> */}

                        {/* Aggregated Progress details */}
                        <td className="p-4 text-sm text-center">
                          <div className="inline-flex flex-col items-stretch gap-1.5 min-w-[160px]">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Sent: <strong className="text-white font-bold">{group.totalSent}</strong></span>
                              <span className="text-slate-400">Click Rate: <strong className="text-blue-400 font-bold">{group.clickRate}</strong></span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-emerald-500 h-full" 
                                style={{ width: `${parseFloat(group.deliveryRate) || 0}%` }}
                                title={`Delivery Rate: ${group.deliveryRate}`}
                              ></div>
                              <div 
                                className="h-full border-l border-black/40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                                style={{ width: `${parseFloat(group.clickRate) || 0}%` }}
                                title={`Click Rate: ${group.clickRate}`}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>Recv: <strong className="text-emerald-400">{group.totalReceived} ({group.deliveryRate})</strong></span>
                              <span>Clicks: <strong className="text-blue-400">{group.totalClicked}</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-Rows for each member in a grouped campaign */}
                      {isGrouped && isExpanded && group.members.map((member, mIdx) => {
                        // const platform = member.platform || member.targetPlatform || 'all';
                        // const platformLabel = platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'All Users';
                        // const platformColor = platform === 'android' ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        //                     : platform === 'ios' ? 'text-slate-300 bg-slate-500/10 border-slate-500/20'
                        //                     : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                        return (
                          <tr 
                            key={member.campaignId}
                            onClick={() => navigate(`/campaign-stats/${member.campaignId}`)}
                            className="bg-white/[0.015] hover:bg-white/[0.03] cursor-pointer transition-colors border-l-2 border-indigo-500/40"
                          >
                            <td className="p-3 text-center">
                              <span className="text-[10px] text-slate-600 font-mono">{mIdx + 1}</span>
                            </td>
                            <td className="p-3 pl-6 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-8 rounded-full bg-indigo-500/30 shrink-0" />
                                <div>
                                  <span className="text-[10px] text-slate-500 font-mono block">ID: {member.campaignId}</span>
                                  {/* <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wide ${platformColor}`}>
                                    {platformLabel}
                                  </span> */}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-slate-500 text-[11px]">
                              {member.createdAt ? formatDateTimeDDMMYYYY(member.createdAt) : 'N/A'}
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {renderDirectNames(member.campaignId)}
                            </td>
                            {/* <td className="p-3 text-center">
                              <span className="text-slate-600 text-[10px]">—</span>
                            </td> */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-stretch gap-1 min-w-[140px]">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>Sent: <strong className="text-white">{member.totalSent || 0}</strong></span>
                                  <span className="text-blue-400 font-bold">{member.clickRate || '0%'}</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex">
                                  <div className="bg-emerald-500 h-full" style={{ width: `${parseFloat(member.deliveryRate) || 0}%` }} />
                                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" style={{ width: `${parseFloat(member.clickRate) || 0}%` }} />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-600">
                                  <span>Recv: <strong className="text-emerald-400">{member.totalReceived || 0}</strong></span>
                                  <span>Clicks: <strong className="text-blue-400">{member.totalClicked || 0}</strong></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent border-t border-white/10 p-4 rounded-b-3xl">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-white">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-white">{Math.min(indexOfLastItem, sortedGroups.length)}</span> of <span className="font-semibold text-white">{sortedGroups.length}</span> campaigns
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <FiChevronLeft className="text-lg" />
                </button>
                
                {getPaginationRange().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${index}`} className="px-2.5 py-1.5 text-xs text-slate-500 font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentPage === page 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <FiChevronRight className="text-lg" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default CampaignStats;
