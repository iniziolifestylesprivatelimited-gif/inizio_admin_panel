import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, FiLoader, FiAlertCircle, FiSearch, 
  FiMail, FiPhone, FiUser, FiInfo, FiLink, FiActivity 
} from 'react-icons/fi';
import axios from 'axios';
import { api, BASE_URL } from '../api/axios';

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
  
  // Table search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Sent' | 'Received' | 'Clicked'

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

  if (loading) {
    return (
      <div className="h-96 flex flex-col justify-center items-center">
        <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
        <p className="text-slate-400">Loading campaign statistics detail...</p>
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

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

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
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{campaignDetail.title}</h2>
            <span className="inline-block text-xs text-slate-400 font-semibold bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
              {campaignDetail.createdAt ? new Date(campaignDetail.createdAt).toLocaleString() : 'N/A'}
            </span>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{campaignDetail.message}</p>
            
            {campaignDetail.imageUrl && (
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white flex items-center justify-center p-2">
                <img 
                  src={getImageUrl(campaignDetail.imageUrl)} 
                  alt="Campaign media" 
                  className="max-h-56 w-auto object-cover rounded-xl"
                  onError={(e) => e.target.src='https://placehold.co/300x150?text=Error+Loading+Image'} 
                />
              </div>
            )}

            {/* Click Action Target Summary */}
            {campaignDetail.clickAction && campaignDetail.clickAction !== 'none' && (
              <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign Link Action</p>
                <div className="text-sm space-y-1">
                  <div className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                    <FiLink className="text-blue-400 animate-pulse" /> {campaignDetail.clickAction}
                  </div>
                  {campaignDetail.actionId && (
                    <div className="text-xs text-slate-400">
                      Target: <span className="font-semibold text-slate-200">{getActionTargetName(campaignDetail.clickAction, campaignDetail.actionId)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Performance Summary and Recipient Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Stats Performance Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 p-5 rounded-3xl text-center shadow-lg">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sent</p>
              <p className="text-3xl font-bold text-white mt-1.5">{campaignDetail.totalSent ?? campaignDetail.stats?.totalSent ?? 0}</p>
            </div>
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 p-5 rounded-3xl text-center shadow-lg">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Delivered</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1.5">
                {campaignDetail.totalReceived ?? campaignDetail.stats?.totalReceived ?? 0}
                <span className="text-[11px] font-bold text-slate-500 block mt-0.5">({campaignDetail.deliveryRate ?? campaignDetail.stats?.deliveryRate ?? '0%'})</span>
              </p>
            </div>
            <div className="bg-transparent backdrop-blur-2xl border border-white/10 p-5 rounded-3xl text-center shadow-lg">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clicked</p>
              <p className="text-3xl font-bold text-blue-400 mt-1.5">
                {campaignDetail.totalClicked ?? campaignDetail.stats?.totalClicked ?? 0}
                <span className="text-[11px] font-bold text-slate-500 block mt-0.5">({campaignDetail.clickRate ?? campaignDetail.stats?.clickRate ?? '0%'})</span>
              </p>
            </div>
          </div>

          {/* Recipient Activity Table Card */}
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl overflow-hidden flex flex-col">
            
            {/* Table Search & Tab Filters */}
            <div className="p-6 border-b border-white/10 bg-slate-900/40 space-y-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'Sent', 'Received', 'Clicked'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      statusFilter === status 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                        : 'bg-transparent text-slate-400 border-white/5 hover:text-slate-200'
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
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search recipients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs placeholder-slate-500"
                />
              </div>
            </div>

            {/* Recipients Data Table */}
            <div className="overflow-auto custom-scrollbar max-h-[60vh]">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-125">
                <thead className="bg-slate-900/60 border-b border-white/10 text-slate-300">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider w-16">S.No.</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Recipient Details</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Activity Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((rec, index) => {
                      const status = getRecipientStatus(rec);
                      let badgeClass = 'bg-slate-700/50 text-slate-300 border-slate-600/30';
                      let activityDate = 'N/A';

                      if (status === 'Clicked') {
                        badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        activityDate = rec.clickedAt ? new Date(rec.clickedAt).toLocaleString() : 'N/A';
                      } else if (status === 'Received') {
                        badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        activityDate = rec.receivedAt ? new Date(rec.receivedAt).toLocaleString() : 'N/A';
                      } else {
                        activityDate = campaignDetail.createdAt ? new Date(campaignDetail.createdAt).toLocaleString() : 'N/A';
                      }

                      return (
                        <tr key={index} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-400">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-white">{rec.user?.name || 'Unknown User'}</span>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 mt-0.5">
                                {rec.user?.email && <span>{rec.user.email}</span>}
                                {rec.user?.email && rec.user?.phone && <span>•</span>}
                                {rec.user?.phone && <span>{rec.user.phone}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-300">
                            {rec.user?.userId || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-300 font-medium">
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

          </div>

        </div>

      </div>
    </div>
  );
};

export default CampaignDetail;
