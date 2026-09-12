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
  FiFilter,
  FiCopy,
  FiCheck,
  FiArrowRight
} from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../api/axios';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import CustomDropdown from '../Components/CustomDropdown';
import Pagination from '../Components/Pagination';
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
  const [copiedId, setCopiedId] = useState(null);
  const itemsPerPage = 10;

  // Navigation Hook
  const navigate = useNavigate();

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return '?';
    const clean = nameOrEmail.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name = '') => {
    const colors = [
      'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white',
      'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white',
      'bg-gradient-to-tr from-violet-500 to-purple-600 text-white',
      'bg-gradient-to-tr from-amber-500 to-orange-600 text-white',
      'bg-gradient-to-tr from-rose-500 to-pink-600 text-white',
      'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderAvatarStack = (recipients, isLoading, isTopRow = false) => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1.5 justify-center py-1">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-slate-900" />
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-slate-900" />
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-slate-900" />
          </div>
        </div>
      );
    }

    if (!recipients || recipients.length === 0) {
      return <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">No recipients</span>;
    }

    const maxVisible = 4;
    const visible = recipients.slice(0, maxVisible);
    const overflow = recipients.length - maxVisible;
    const popoverPosition = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

    return (
      <div className="relative group/stack inline-flex items-center justify-center py-1">
        {/* Overlapping Avatar Stack */}
        <div className="flex items-center -space-x-2 hover:space-x-0.5 transition-all duration-200 cursor-pointer">
          {visible.map((rec, idx) => {
            const name = rec.user?.name || rec.user?.email || rec.user?.phone || 'User';
            const initials = getInitials(name);
            const colorClass = getAvatarColor(name);
            return (
              <div
                key={idx}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase ring-2 ring-white dark:ring-slate-900 shadow-sm transition-transform hover:scale-110 hover:z-20 ${colorClass}`}
                title={name}
              >
                {initials}
              </div>
            );
          })}
          {overflow > 0 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 ring-2 ring-white dark:ring-slate-900 shadow-sm transition-transform hover:scale-110 hover:z-20">
              +{overflow}
            </div>
          )}
        </div>

        {/* Hover Popover */}
        <div className={`absolute ${popoverPosition} left-1/2 -translate-x-1/2 w-64 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl opacity-0 invisible group-hover/stack:opacity-100 group-hover/stack:visible transition-all duration-200 z-50 pointer-events-none group-hover/stack:pointer-events-auto text-left`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FiUsers className="text-blue-500 text-xs" /> Recipients ({recipients.length})
            </span>
            <span className="text-[9px] font-semibold text-slate-400">Preview</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {recipients.slice(0, 6).map((rec, rIdx) => {
              const name = rec.user?.name || 'User';
              const contact = rec.user?.email || rec.user?.phone || rec.user?.userId || '';
              const status = rec.isClicked ? 'Clicked' : rec.isReceived ? 'Delivered' : 'Sent';
              const statusColor = rec.isClicked 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                : rec.isReceived 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                  : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';

              return (
                <div key={rIdx} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${getAvatarColor(name)}`}>
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px] leading-tight">{name}</p>
                      {contact && <p className="text-[9px] text-slate-400 truncate">{contact}</p>}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${statusColor}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
          {recipients.length > 6 && (
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold text-center mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5">
              +{recipients.length - 6} more in detailed view
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderDirectNames = (campaignId, isTopRow = false) => {
    const recipients = recipientsMap[campaignId];
    return renderAvatarStack(recipients, recipients === undefined, isTopRow);
  };

  const renderGroupDirectNames = (group, isTopRow = false) => {
    const anyLoading = group.members.some(m => recipientsMap[m.campaignId] === undefined);
    if (anyLoading) {
      return renderAvatarStack([], true, isTopRow);
    }

    const allRecipients = [];
    const seenKeys = new Set();
    group.members.forEach(m => {
      const recs = recipientsMap[m.campaignId] || [];
      recs.forEach(r => {
        const key = r.user?._id || r.user?.userId || r.user?.email || r.user?.phone || JSON.stringify(r);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allRecipients.push(r);
        }
      });
    });

    return renderAvatarStack(allRecipients, false, isTopRow);
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 w-full pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <MdHistory className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Campaign Statistics</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
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
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 shadow-inner text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            title="Refresh Stats"
            className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 dark:text-blue-400 font-bold rounded-2xl border border-blue-200 dark:border-blue-500/30 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer h-[42px]"
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
              color: "text-blue-600 dark:text-blue-400",
              valueColor: "text-blue-500 dark:text-white",
              bg: "bg-blue-50 dark:bg-blue-500/20",
              fromColor: "from-blue-500/25",
              hoverBorder: "hover:border-blue-500/40"
            },
            {
              title: "Total Notifications Sent",
              value: totalSent.toLocaleString(),
              icon: FiSend,
              color: "text-indigo-600 dark:text-indigo-400",
              valueColor: "text-indigo-500 dark:text-white",
              bg: "bg-indigo-50 dark:bg-indigo-500/20",
              fromColor: "from-indigo-500/25",
              hoverBorder: "hover:border-indigo-500/40"
            },
            {
              title: "Avg. Delivery Rate",
              value: avgDeliveryRate,
              icon: FiCheckCircle,
              color: "text-emerald-600 dark:text-emerald-400",
              valueColor: "text-emerald-500 dark:text-white",
              bg: "bg-emerald-50 dark:bg-emerald-500/20",
              fromColor: "from-emerald-500/25",
              hoverBorder: "hover:border-emerald-500/40"
            },
            {
              title: "Avg. Click-Through Rate",
              value: avgClickRate,
              icon: FiActivity,
              color: "text-rose-600 dark:text-rose-400",
              valueColor: "text-rose-500 dark:text-white",
              bg: "bg-rose-50 dark:bg-rose-500/20",
              fromColor: "from-rose-500/25",
              hoverBorder: "hover:border-rose-500/40"
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
                    className={`text-xl sm:text-2xl xl:text-3xl font-extrabold mt-1 tracking-tight truncate ${metric.valueColor || 'text-slate-900 dark:text-white'}`}
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
        <div className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg" /> {error}
        </div>
      )}

      {loading && campaigns.length === 0 ? (
        <Card className="p-6">
          <TableRowSkeleton columns={6} rows={5} />
        </Card>
      ) : sortedGroups.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-white/20">
          <MdHistory className="text-5xl text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No campaign statistics found matching the current filters.</p>
          {(metricFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setMetricFilter('all');
                setStatusFilter('all');
                setSortBy('createdAt');
                setSortOrder('desc');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 dark:text-blue-400 font-bold rounded-xl border border-blue-200 dark:border-blue-500/30 text-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/10 dark:bg-transparent border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full">
          <div className="overflow-auto custom-scrollbar max-h-[60vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-white/10">
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="p-4 font-bold text-center">S.No</th>
                  <th className="p-4 font-bold">Campaign</th>
                  <th 
                    onClick={() => handleSortChange('createdAt')}
                    className="p-4 font-bold cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span className={sortBy === 'createdAt' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>Message & Date</span>
                      {sortBy === 'createdAt' ? (
                        sortOrder === 'asc' ? <span className="text-blue-600 dark:text-blue-400">▲</span> : <span className="text-blue-600 dark:text-blue-400">▼</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">⇅</span>
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
                        statusColor={`!border-none !bg-transparent !py-1.5 !px-3 text-xs select-none ${
                          metricFilter !== 'all' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-700 dark:text-slate-300 font-bold hover:text-slate-900 dark:hover:text-white'
                        }`}
                      />
                    </div>
                  </th>
                  <th className="p-4 font-bold text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {currentGroups.map((group, index) => {
                  const item = group.representative;
                  const isGrouped = group.members.length > 1;
                  const isExpanded = expandedGroups[group.groupKey];
                  const isTopRow = index < 2;

                  return (
                    <React.Fragment key={group.groupKey}>
                      <tr 
                        onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/campaign-stats' } })}
                        className="hover:bg-slate-50/75 dark:hover:bg-white/[0.025] cursor-pointer transition-colors group"
                      >
                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                          {indexOfFirstItem + index + 1}
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt="Campaign" 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 shadow-xs"
                                onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=Img'; }} 
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-500/20 shrink-0 shadow-xs">
                                <MdImage className="text-xl" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[200px]" title={item.title}>
                                {item.title || 'Untitled Notification'}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: {item.campaignId}</span>
                                {isGrouped && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupExpand(group.groupKey);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 shadow-xs ${
                                      isExpanded
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20'
                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-500/30'
                                    }`}
                                    title={isExpanded ? 'Collapse platform breakdown' : 'Expand platform breakdown'}
                                  >
                                    <span>{isExpanded ? 'Hide' : `+${group.members.length - 1} platforms`}</span>
                                    <FiChevronDown 
                                      size={12} 
                                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm max-w-[260px]">
                          <p className="text-slate-700 dark:text-slate-300 text-xs truncate leading-relaxed font-medium" title={item.message}>
                            {item.message || 'No description'}
                          </p>
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] block mt-0.5">
                            {item.createdAt ? formatDateTimeDDMMYYYY(item.createdAt) : 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                          {renderGroupDirectNames(group, isTopRow)}
                        </td>
                        <td className="p-4 text-sm text-center">
                          <div className="inline-flex flex-col items-stretch gap-1.5 min-w-[160px]">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Sent: <strong className="text-slate-800 dark:text-white font-bold">{group.totalSent}</strong></span>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs">{group.clickRate}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-emerald-500 h-full transition-all duration-500" 
                                style={{ width: `${parseFloat(group.deliveryRate) || 0}%` }}
                                title={`Delivered: ${group.deliveryRate}`}
                              />
                              <div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-full transition-all duration-500" 
                                style={{ width: `${parseFloat(group.clickRate) || 0}%` }}
                                title={`Clicked: ${group.clickRate}`}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                Recv: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{group.totalReceived}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                                Clicks: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{group.totalClicked}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(e, item.campaignId)}
                              title="Copy Campaign ID"
                              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              {copiedId === item.campaignId ? (
                                <FiCheck size={13} className="text-emerald-500" />
                              ) : (
                                <FiCopy size={13} />
                              )}
                              {copiedId === item.campaignId && (
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded shadow-md whitespace-nowrap z-30">
                                  Copied!
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/campaign-stats' } })}
                              title="View Campaign Details"
                              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 transition-all cursor-pointer shadow-xs active:scale-95 group/btn"
                            >
                              <FiArrowRight size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isGrouped && isExpanded && group.members.map((member, mIdx) => (
                        <tr 
                          key={member.campaignId}
                          onClick={() => navigate(`/campaign-stats/${member.campaignId}`)}
                          className="bg-indigo-50/20 hover:bg-indigo-50/50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors border-l-4 border-indigo-500/80 group/sub"
                        >
                          <td className="p-3 text-center">
                            <span className="text-[10px] text-indigo-400 dark:text-indigo-500 font-mono font-bold">↳ {mIdx + 1}</span>
                          </td>
                          <td className="p-3 pl-8 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-6 rounded-full bg-indigo-500/40 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover/sub:text-indigo-600 dark:group-hover/sub:text-indigo-400 transition-colors">
                                  Platform #{mIdx + 1}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">ID: {member.campaignId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-slate-500 text-[11px]">
                            {member.createdAt ? formatDateTimeDDMMYYYY(member.createdAt) : 'N/A'}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {renderDirectNames(member.campaignId, isTopRow)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex flex-col items-stretch gap-1 min-w-[140px]">
                              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>Sent: <strong className="text-slate-800 dark:text-white">{member.totalSent || 0}</strong></span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{member.clickRate || '0%'}</span>
                              </div>
                              <div className="w-full h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 h-full" style={{ width: `${parseFloat(member.deliveryRate) || 0}%` }} />
                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${parseFloat(member.clickRate) || 0}%` }} />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-600">
                                <span>Recv: <strong className="text-emerald-600 dark:text-emerald-400">{member.totalReceived || 0}</strong></span>
                                <span>Clicks: <strong className="text-blue-600 dark:text-blue-400">{member.totalClicked || 0}</strong></span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(e, member.campaignId)}
                                title="Copy Sub-Campaign ID"
                                className="relative p-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                {copiedId === member.campaignId ? (
                                  <FiCheck size={11} className="text-emerald-500" />
                                ) : (
                                  <FiCopy size={11} />
                                )}
                                {copiedId === member.campaignId && (
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded shadow-md whitespace-nowrap z-30">
                                    Copied!
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/campaign-stats/${member.campaignId}`, { state: { from: '/campaign-stats' } })}
                                title="View Details"
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer shadow-xs active:scale-95 group/btn"
                              >
                                <FiArrowRight size={12} className="transition-transform group-hover/btn:translate-x-0.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && sortedGroups.length > 0 && (
            <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Showing <span className="font-bold text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(indexOfLastItem, sortedGroups.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{sortedGroups.length}</span> campaigns
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CampaignStats;
