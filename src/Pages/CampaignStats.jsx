import React, { useState, useEffect } from 'react';
import { MdHistory, MdRefresh, MdImage, MdLink } from 'react-icons/md';
import { 
  FiLoader, 
  FiAlertCircle, 
  FiSearch, 
  FiChevronLeft, 
  FiChevronRight, 
  FiBarChart2, 
  FiActivity, 
  FiCheckCircle, 
  FiSend 
} from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../api/axios';

const CampaignStats = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selection data to resolve names
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Navigation Hook
  const navigate = useNavigate();

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

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const getPaginationRange = () => {
    const range = [];
    const delta = 1; // pages to show around current page
    
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

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((item) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const messageMatch = (item.message || '').toLowerCase().includes(query);
    const idMatch = (item.campaignId || '').toLowerCase().includes(query);
    const targetName = getActionTargetName(item.clickAction, item.actionId) || '';
    const targetMatch = targetName.toLowerCase().includes(query);
    return titleMatch || messageMatch || idMatch || targetMatch;
  });

  // Paginate campaigns
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCampaigns = filteredCampaigns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  return (
    <div className="relative space-y-6 min-h-full z-0 w-full pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <MdHistory className="text-blue-400" />
            Campaign Statistics
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            Review notification histories, check delivery status, and analyze click-through rates.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Campaigns */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Campaigns</p>
            <p className="text-2xl font-black text-white mt-1.5">{totalCampaigns}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
            <FiBarChart2 className="text-xl" />
          </div>
        </div>

        {/* KPI 2: Total Sent */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Notifications Sent</p>
            <p className="text-2xl font-black text-white mt-1.5">{totalSent.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
            <FiSend className="text-xl" />
          </div>
        </div>

        {/* KPI 3: Delivery Rate */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Delivery Rate</p>
            <p className="text-2xl font-black text-emerald-400 mt-1.5">{avgDeliveryRate}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <FiCheckCircle className="text-xl" />
          </div>
        </div>

        {/* KPI 4: CTR */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:-translate-y-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Click-Through Rate</p>
            <p className="text-2xl font-black text-violet-400 mt-1.5">{avgClickRate}</p>
          </div>
          <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
            <FiActivity className="text-xl" />
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-4 bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-xl">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns by title, message, ID, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner text-white placeholder-slate-500 text-sm font-medium transition-all"
          />
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center justify-center px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-xl border border-blue-500/30 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <MdRefresh className={`mr-2 text-lg ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center">
          <FiAlertCircle className="mr-2 text-lg" /> {error}
        </div>
      )}

      {loading && campaigns.length === 0 ? (
        <div className="h-64 flex flex-col justify-center items-center bg-slate-900/40 border border-white/10 rounded-3xl backdrop-blur-xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400">Loading campaign stats...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-white/20">
          <MdHistory className="text-5xl text-slate-500 mb-4" />
          <p className="text-slate-400 font-medium">No campaign statistics found.</p>
        </div>
      ) : (
        <div className="relative z-10 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col h-full isolate will-change-transform">
          <div className="overflow-auto custom-scrollbar max-h-[60vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-200">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-4 font-bold text-center">S.No</th>
                  <th className="p-4 font-bold">Campaign</th>
                  <th className="p-4 font-bold">Message</th>
                  <th className="p-4 font-bold text-center">Action Link</th>
                  <th className="p-4 font-bold text-center">Sent / Received / Clicked</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentCampaigns.map((item, index) => (
                  <tr 
                    key={item.campaignId}
                    onClick={() => navigate(`/campaign-stats/${item.campaignId}`)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors"
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
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
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
                      <div className="truncate text-slate-300 font-medium" title={item.message}>
                        {item.message}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </div>
                    </td>

                    {/* Action Target Link */}
                    <td className="p-4 text-sm text-center">
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
                    </td>

                    {/* Progress details */}
                    <td className="p-4 text-sm text-center">
                      <div className="inline-flex flex-col items-stretch gap-1.5 min-w-[160px]">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Sent: <strong className="text-white font-bold">{item.totalSent || 0}</strong></span>
                          <span className="text-slate-400">Click Rate: <strong className="text-blue-400 font-bold">{item.clickRate || '0%'}</strong></span>
                        </div>
                        {/* Visual Delivery / Click bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full animate-pulse" 
                            style={{ width: `${parseFloat(item.deliveryRate) || 0}%` }}
                            title={`Delivery Rate: ${item.deliveryRate || '0%'}`}
                          ></div>
                          <div 
                            className="bg-blue-500 h-full border-l border-black/40" 
                            style={{ width: `${parseFloat(item.clickRate) || 0}%` }}
                            title={`Click Rate: ${item.clickRate || '0%'}`}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Recv: <strong className="text-emerald-400">{item.totalReceived || 0} ({item.deliveryRate || '0%'})</strong></span>
                          <span>Clicks: <strong className="text-blue-400">{item.totalClicked || 0}</strong></span>
                        </div>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/campaign-stats/${item.campaignId}`);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent border-t border-white/10 p-4 rounded-b-3xl">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-white">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-white">{Math.min(indexOfLastItem, filteredCampaigns.length)}</span> of <span className="font-semibold text-white">{filteredCampaigns.length}</span> campaigns
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
        </div>
      )}
    </div>
  );
};

export default CampaignStats;
