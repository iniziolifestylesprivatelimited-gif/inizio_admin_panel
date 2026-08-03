import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiAlertCircle, 
  FiSearch, 
  FiLink, 
  FiActivity, 
  FiX, 
  FiChevronLeft, 
  FiChevronRight, 
  FiSend, 
  FiCheckCircle 
} from 'react-icons/fi';
import axios from 'axios';
import { api, BASE_URL } from '../api/axios';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import { KPISkeleton, TableRowSkeleton } from '../Components/Skeleton';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const CampaignDetail = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table search, filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Sent' | 'Received' | 'Clicked'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selection list lookups to resolve action names
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const fetchCampaignDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch campaign details and resolve lists in parallel
      const [campaignRes, prodRes, catRes, brandRes] = await Promise.all([
        api.get(`/admin/campaign-stats/${campaignId}`, { headers }),
        axios.get(`${BASE_URL}/api/products/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] }))
      ]);

      setCampaignDetail(campaignRes.data);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
    } catch (err) {
      console.error('Failed to load campaign details:', err);
      setError(err.response?.data?.message || 'Failed to load campaign statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetail();
    }
  }, [campaignId]);

  // Reset pagination on filter or search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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

  // Truncated pagination logic
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

  if (loading) {
    return (
      <div className="relative space-y-6 min-h-full z-0 w-full pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button 
            onClick={() => navigate('/campaign-stats')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-md"
          >
            <FiArrowLeft size={14} /> Back to Stats List
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-96 animate-pulse flex flex-col gap-4">
              <div className="h-8 bg-white/5 rounded-xl w-3/4" />
              <div className="h-6 bg-white/5 rounded-xl w-1/2" />
              <div className="h-40 bg-white/5 rounded-xl w-full" />
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <KPISkeleton cards={3} />
            <Card className="p-6">
              <TableRowSkeleton columns={5} rows={6} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaignDetail) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/campaign-stats')} 
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> Back to Campaigns
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3 text-sm">
          <FiAlertCircle size={18} />
          <span>{error || 'Campaign details not found.'}</span>
        </div>
      </div>
    );
  }

  // Parse recipient list status
  const getRecipientStatus = (rec) => {
    if (rec.isClicked) return 'Clicked';
    if (rec.isReceived) return 'Received';
    return 'Sent';
  };

  // Filter recipient list based on search term and active status tab
  const filteredRecipients = (campaignDetail.recipients || []).filter(rec => {
    const userName = (rec.user?.name || '').toLowerCase();
    const userEmail = (rec.user?.email || '').toLowerCase();
    const userPhone = (rec.user?.phone || '').toLowerCase();
    const customId = (rec.user?.userId || '').toLowerCase();
    const matchesSearch = 
      userName.includes(searchTerm.toLowerCase()) || 
      userEmail.includes(searchTerm.toLowerCase()) || 
      userPhone.includes(searchTerm.toLowerCase()) ||
      customId.includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && getRecipientStatus(rec) === statusFilter;
  });

  // Paginated recipients list
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecipients = filteredRecipients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage);

  return (
    <div className="relative space-y-6 min-h-full z-0 w-full pb-8">
      {/* Back Button & Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button 
          onClick={() => navigate('/campaign-stats')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-md"
        >
          <FiArrowLeft size={14} /> Back to Stats List
        </button>
        <span className="text-[10px] text-slate-500 font-mono">Campaign ID: {campaignDetail.campaignId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Campaign Details Block */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{campaignDetail.title}</h2>
            <span className="inline-block text-xs text-slate-400 font-semibold bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              {campaignDetail.createdAt ? new Date(campaignDetail.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{campaignDetail.message}</p>
            
            {campaignDetail.imageUrl && (
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 flex items-center justify-center p-2">
                <img 
                  src={getImageUrl(campaignDetail.imageUrl)} 
                  alt="Campaign media" 
                  className="max-h-56 w-auto object-cover rounded-xl shadow-lg border border-white/5"
                  onError={(e) => e.target.src='https://placehold.co/300x150?text=Error+Loading+Image'} 
                />
              </div>
            )}

            {/* Click Action Target Summary */}
            {campaignDetail.clickAction && campaignDetail.clickAction !== 'none' && (
              <div className="p-4 bg-black/25 border border-white/5 rounded-2xl space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campaign Link Action</p>
                <div className="text-sm space-y-1.5">
                  <div className="text-slate-300 font-bold uppercase flex items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-extrabold border border-blue-500/20 uppercase tracking-wide">
                      {campaignDetail.clickAction}
                    </span>
                  </div>
                  {campaignDetail.actionId && (
                    <div className="text-xs text-slate-400">
                      Target Name: <span className="font-semibold text-slate-200">{getActionTargetName(campaignDetail.clickAction, campaignDetail.actionId)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Performance Summary and Recipient Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Stats Performance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* KPI 1: Sent */}
            <Card hoverable className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sent</p>
                <p className="text-2xl font-black text-white mt-1">
                  {campaignDetail.totalSent ?? campaignDetail.stats?.totalSent ?? 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <FiSend className="text-xl" />
              </div>
            </Card>

            {/* KPI 2: Delivered */}
            <Card hoverable className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Delivered</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {campaignDetail.totalReceived ?? campaignDetail.stats?.totalReceived ?? 0}
                  <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                    ({campaignDetail.deliveryRate ?? campaignDetail.stats?.deliveryRate ?? '0%'})
                  </span>
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <FiCheckCircle className="text-xl" />
              </div>
            </Card>

            {/* KPI 3: Clicked */}
            <Card hoverable className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clicked</p>
                <p className="text-2xl font-black text-blue-400 mt-1">
                  {campaignDetail.totalClicked ?? campaignDetail.stats?.totalClicked ?? 0}
                  <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                    ({campaignDetail.clickRate ?? campaignDetail.stats?.clickRate ?? '0%'})
                  </span>
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <FiActivity className="text-xl" />
              </div>
            </Card>
          </div>

          {/* Recipient Activity Table Card */}
          <Card className="overflow-hidden flex flex-col !p-0">
            
            {/* Table Search & Tab Filters */}
            <div className="p-6 border-b border-white/10 bg-slate-900/40 space-y-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'Sent', 'Received', 'Clicked'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      statusFilter === status 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-md shadow-blue-500/5' 
                        : 'bg-transparent text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-200'
                    }`}
                  >
                    {status === 'all' ? 'All Logs' : status} ({
                      status === 'all' 
                        ? (campaignDetail.recipients || []).length
                        : (campaignDetail.recipients || []).filter(r => getRecipientStatus(r) === status).length
                    })
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div className="relative w-full md:w-64">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="Search recipients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner text-xs text-white placeholder-slate-500 font-medium transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Recipients Data Table */}
            <div className="overflow-auto custom-scrollbar max-h-[60vh]">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-125">
                <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-md">
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4 font-bold w-16 text-center">S.No.</th>
                    <th className="px-6 py-4 font-bold">Recipient Details</th>
                    <th className="px-6 py-4 font-bold">User ID</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-center">Activity Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentRecipients.length > 0 ? (
                    currentRecipients.map((rec, index) => {
                      const status = getRecipientStatus(rec);
                      let badgeClass = 'bg-slate-700/10 text-slate-400 border-slate-600/20';
                      let activityDate = 'N/A';

                      if (status === 'Clicked') {
                        badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        activityDate = rec.clickedAt ? new Date(rec.clickedAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                      } else if (status === 'Received') {
                        badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        activityDate = rec.receivedAt ? new Date(rec.receivedAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                      } else {
                        activityDate = campaignDetail.createdAt ? new Date(campaignDetail.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                      }

                      return (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-400 text-center">{indexOfFirstItem + index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-white">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-white">{rec.user?.name || 'Unknown User'}</span>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                                {rec.user?.email && <span>{rec.user.email}</span>}
                                {rec.user?.email && rec.user?.phone && <span>•</span>}
                                {rec.user?.phone && <span>{rec.user.phone}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-300">
                            {rec.user?.userId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${badgeClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-300 font-medium text-center">
                            {activityDate}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                        No recipient records match the active search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-transparent border-t border-white/10 p-4 rounded-b-3xl">
                <p className="text-xs text-slate-400">
                  Showing <span className="font-semibold text-white">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-white">{Math.min(indexOfLastItem, filteredRecipients.length)}</span> of <span className="font-semibold text-white">{filteredRecipients.length}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <FiChevronLeft className="text-sm" />
                  </button>
                  
                  {getPaginationRange().map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`dots-${index}`} className="px-2 py-1 text-xs text-slate-500 font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                    <FiChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
            )}  
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
