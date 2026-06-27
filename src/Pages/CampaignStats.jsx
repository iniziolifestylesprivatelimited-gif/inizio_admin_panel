import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdHistory, MdRefresh, MdImage, MdLink } from 'react-icons/md';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
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

  // console.log(campaignDetail)

  return (
    <div className="relative space-y-4 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <MdHistory className="text-blue-400" />
            Campaign Statistics
          </h1>
          <p className="text-slate-400 font-medium mt-1">Review notification histories, check delivery status, and analyze click-through rates.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center px-4 py-2.5 bg-blue-600/50 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
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
        <div className="h-64 flex flex-col justify-center items-center bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl">
          <FiLoader className="animate-spin text-3xl text-blue-400 mb-4" />
          <p className="text-slate-400">Loading campaign stats...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-transparent backdrop-blur-2xl rounded-3xl border border-dashed border-white/20">
          <MdHistory className="text-5xl text-slate-500 mb-4" />
          <p className="text-slate-400 font-medium">No campaign statistics found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((item) => (
            <div 
              key={item.campaignId} 
              onClick={() => navigate(`/campaign-stats/${item.campaignId}`)}
              className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 hover:bg-white/5 hover:border-blue-500/50 hover:shadow-blue-500/5 cursor-pointer transition-all flex flex-col group"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <h3 className="font-bold text-white tracking-tight text-lg leading-snug group-hover:text-blue-400 transition-colors">{item.title}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.campaignId}</p>
                </div>
                <span className="text-xs text-slate-400 font-semibold shrink-0 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </span>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap flex-1 mb-4">{item.message}</p>
              
              {item.imageUrl && (
                <div className="mb-4 relative max-w-xs rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex items-center justify-center">
                  <img src={item.imageUrl} alt="Campaign media" className="max-h-32 w-auto object-cover" onError={(e) => e.target.src='https://placehold.co/150x150?text=Error'} />
                </div>
              )}

              {/* Action Info if set */}
              {item.clickAction && item.clickAction !== 'none' && (
                <div className="mb-4 p-3 bg-black/20 border border-white/5 rounded-xl text-xs space-y-1">
                  <div className="text-slate-400 flex items-center">
                    <MdLink className="mr-1.5 text-blue-400" />
                    Action: <span className="ml-1 font-bold uppercase text-slate-200">{item.clickAction}</span>
                  </div>
                  {item.actionId && (
                    <div className="text-slate-400">
                      Target: <span className="font-semibold text-slate-200">{getActionTargetName(item.clickAction, item.actionId)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5 text-center mt-auto">
                <div className="bg-black/25 p-3 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sent</p>
                  <p className="text-lg font-bold text-white mt-0.5">{item.totalSent || 0}</p>
                </div>
                <div className="bg-black/25 p-3 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Received</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {item.totalReceived || 0}
                    <span className="text-[10px] font-semibold text-slate-500 block">({item.deliveryRate || '0%'})</span>
                  </p>
                </div>
                <div className="bg-black/25 p-3 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clicked</p>
                  <p className="text-lg font-bold text-blue-400 mt-0.5">
                    {item.totalClicked || 0}
                    <span className="text-[10px] font-semibold text-slate-500 block">({item.clickRate || '0%'})</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

 chang    </div>
  );
};

export default CampaignStats;
