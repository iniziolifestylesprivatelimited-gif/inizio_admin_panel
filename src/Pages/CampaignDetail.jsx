import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const fromPath = location.state?.from || '/campaign-stats';
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table search, filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Sent' | 'Received' | 'Clicked'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
            onClick={() => navigate(fromPath)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-md"
          >
            <FiArrowLeft size={14} /> Back to List
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
          onClick={() => navigate(fromPath)} 
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> Back to List
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
          onClick={() => navigate(fromPath)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-md"
        >
          <FiArrowLeft size={14} /> Back to List
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
                  className="bg-white max-h-56 w-auto object-cover rounded-xl shadow-lg border border-white/5"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Total Sent",
                value: campaignDetail.totalSent ?? campaignDetail.stats?.totalSent ?? 0,
                icon: FiSend,
                color: "text-indigo-400",
                bg: "bg-indigo-500/20",
                fromColor: "from-indigo-500/25",
                hoverBorder: "hover:border-indigo-500/30"
              },
              {
                title: "Total Delivered",
                value: campaignDetail.totalReceived ?? campaignDetail.stats?.totalReceived ?? 0,
                subText: campaignDetail.deliveryRate ?? campaignDetail.stats?.deliveryRate ?? '0%',
                icon: FiCheckCircle,
                color: "text-emerald-400",
                bg: "bg-emerald-500/20",
                fromColor: "from-emerald-500/25",
                hoverBorder: "hover:border-emerald-500/30"
              },
              {
                title: "Total Clicked",
                value: campaignDetail.totalClicked ?? campaignDetail.stats?.totalClicked ?? 0,
                subText: campaignDetail.clickRate ?? campaignDetail.stats?.clickRate ?? '0%',
                icon: FiActivity,
                color: "text-blue-400",
                bg: "bg-blue-500/20",
                fromColor: "from-blue-500/25",
                hoverBorder: "hover:border-blue-500/30"
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
                    {metric.subText && (
                      <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                        ({metric.subText})
                      </span>
                    )}
                  </div>
                  <div className={`p-3 sm:p-3.5 rounded-xl ${metric.bg} shrink-0`}>
                    <metric.icon className={`text-lg sm:text-xl ${metric.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recipient Activity Table Card */}
          <div className="border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col">
            
            {/* Table Search & Tab Filters */}
            <div className="p-5 sm:p-6 border-b border-white/10 space-y-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                <thead className="sticky top-0 z-20 bg-white/[0.03] backdrop-blur-md shadow-md border-b border-white/10">
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
            {!loading && filteredRecipients.length > 0 && (
              <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.02] backdrop-blur-md">
                <span className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                  Showing <span className="font-bold text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-white">{Math.min(indexOfLastItem, filteredRecipients.length)}</span> of <span className="font-bold text-white">{filteredRecipients.length}</span> recipients
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                            if (page !== '...') setCurrentPage(page);
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 sm:px-4 py-2 bg-slate-950/20 hover:bg-white/10 text-slate-300 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold border border-white/10 transform-gpu cursor-pointer"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
            )}  
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
