import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../../../api/axios';
import { 
  FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw, 
  FiSearch, FiExternalLink, FiCopy, FiCheck, FiFilter,
  FiChevronLeft, FiChevronRight, FiEye, FiPackage, FiClock,
  FiSliders, FiArrowUpRight, FiLayers, FiInfo, FiTrash2
} from 'react-icons/fi';
import { formatDateTimeDDMMYYYY } from '../../../utils/dateUtils';
import { TableRowSkeleton, KPISkeleton } from '../../../Components/Skeleton';
import CopyButton from '../../../Components/CopyButton';

// Format image URLs safely
const formatImageUrl = (path) => {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('//')) return path;
  const cleanPath = path.replace(/\\/g, '/');
  return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

export default function BrokenImages() {
  const navigate = useNavigate();

  // Data states
  const [brokenImages, setBrokenImages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filter & tab states
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'RESOLVED' | 'IGNORED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch all products for URL / filename matching
  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/products/');
      const prodList = Array.isArray(res.data) ? res.data : (res.data?.products || []);
      setProducts(prodList);
    } catch (err) {
      console.error('Failed to load products for broken image matching:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Build lookup maps for rapid URL/filename matching to products
  const productLookups = useMemo(() => {
    const urlMap = new Map();
    const filenameMap = new Map();
    const idMap = new Map();

    const registerImage = (imgUrl, product, variant = null) => {
      if (!imgUrl || typeof imgUrl !== 'string') return;
      const raw = imgUrl.trim();
      const lower = raw.toLowerCase();
      const withoutQuery = lower.split('?')[0].split('#')[0];
      const filename = withoutQuery.split('/').pop();

      const matchData = { product, variant, originalUrl: raw };

      urlMap.set(lower, matchData);
      urlMap.set(withoutQuery, matchData);

      // Store cleaned relative path if contains /uploads/ or /wp-content/
      const wpIdx = lower.indexOf('/wp-content/');
      if (wpIdx !== -1) {
        urlMap.set(lower.substring(wpIdx), matchData);
      }
      const upIdx = lower.indexOf('/uploads/');
      if (upIdx !== -1) {
        urlMap.set(lower.substring(upIdx), matchData);
      }

      if (filename && filename.length > 3) {
        filenameMap.set(filename, matchData);
      }
    };

    products.forEach(p => {
      if (p._id) idMap.set(String(p._id), p);
      if (p.id) idMap.set(String(p.id), p);

      if (Array.isArray(p.images)) {
        p.images.forEach(img => registerImage(img, p, null));
      }

      if (Array.isArray(p.variants)) {
        p.variants.forEach(v => {
          if (Array.isArray(v.images)) {
            v.images.forEach(img => registerImage(img, p, v));
          }
        });
      }
    });

    return { urlMap, filenameMap, idMap };
  }, [products]);

  // Helper to find matching product for a broken image item
  const getMatchedProduct = useCallback((item) => {
    if (!item) return null;

    // 1. Match by entityId if provided
    if (item.entityId) {
      const p = productLookups.idMap.get(String(item.entityId));
      if (p) return { product: p, variant: null, matchType: 'entityId' };
    }

    const rawUrl = item.imageUrl || item.url || item.image || '';
    if (!rawUrl) return null;

    const lower = rawUrl.toLowerCase().trim();
    const withoutQuery = lower.split('?')[0].split('#')[0];
    const filename = withoutQuery.split('/').pop();

    // 2. Match exact URL or without query
    if (productLookups.urlMap.has(lower)) {
      return productLookups.urlMap.get(lower);
    }
    if (productLookups.urlMap.has(withoutQuery)) {
      return productLookups.urlMap.get(withoutQuery);
    }

    // 3. Match relative paths
    const wpIdx = lower.indexOf('/wp-content/');
    if (wpIdx !== -1 && productLookups.urlMap.has(lower.substring(wpIdx))) {
      return productLookups.urlMap.get(lower.substring(wpIdx));
    }
    const upIdx = lower.indexOf('/uploads/');
    if (upIdx !== -1 && productLookups.urlMap.has(lower.substring(upIdx))) {
      return productLookups.urlMap.get(lower.substring(upIdx));
    }

    // 4. Match by filename
    if (filename && filename.length > 3 && productLookups.filenameMap.has(filename)) {
      return productLookups.filenameMap.get(filename);
    }

    return null;
  }, [productLookups]);

  // Fetch broken images
  const fetchBrokenImages = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    try {
      // Build query string
      let endpoint = '/analytics/admin/broken-images';
      if (activeTab !== 'ALL') {
        endpoint += `?status=${encodeURIComponent(activeTab)}`;
      }

      const res = await api.get(endpoint);
      let data = [];
      if (Array.isArray(res.data?.logs)) {
        data = res.data.logs;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else if (Array.isArray(res.data?.brokenImages)) {
        data = res.data.brokenImages;
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data;
      } else if (Array.isArray(res.data?.items)) {
        data = res.data.items;
      }

      setBrokenImages(data);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch broken images:', err);
      showToast(err.response?.data?.message || 'Failed to load broken images list.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  // Fetch broken images and poll every 15s
  useEffect(() => {
    fetchBrokenImages();
    const pollInterval = setInterval(() => {
      fetchBrokenImages(true);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchBrokenImages]);

  // Update status of single broken image
  const handleUpdateStatus = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    setActionLoadingId(id);
    try {
      await api.patch(`/analytics/admin/broken-images/${id}`, {
        status: newStatus
      });

      // Update state locally
      setBrokenImages(prev => prev.map(item => {
        const itemId = item._id || item.id;
        if (itemId === id) {
          return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return item;
      }));

      // If activeTab is filtered and not 'ALL', filter it out smoothly
      if (activeTab !== 'ALL' && activeTab !== newStatus) {
        setBrokenImages(prev => prev.filter(item => (item._id || item.id) !== id));
      }

      showToast(`Marked as ${newStatus.toLowerCase()} successfully.`);
      if (previewItem && (previewItem._id === id || previewItem.id === id)) {
        setPreviewItem(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error(`Failed to update status to ${newStatus}:`, err);
      showToast(err.response?.data?.message || `Failed to update status. Please try again.`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk update status
  const handleBulkUpdateStatus = async (newStatus) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;

    try {
      await Promise.all(ids.map(async (id) => {
        try {
          await api.patch(`/analytics/admin/broken-images/${id}`, { status: newStatus });
          successCount++;
        } catch (e) {
          console.error(`Bulk patch failed for ID ${id}:`, e);
        }
      }));

      // Refresh list
      await fetchBrokenImages(true);
      setSelectedIds(new Set());
      showToast(`${successCount} items updated to ${newStatus.toLowerCase()}.`);
    } catch (err) {
      console.error('Bulk update error:', err);
      showToast('Error occurred while performing bulk update.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url, e) => {
    if (e) e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
    showToast('Image URL copied to clipboard.');
  };

  // Selection handlers
  const handleToggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return brokenImages;
    const q = searchQuery.toLowerCase().trim();
    return brokenImages.filter(item => {
      const match = getMatchedProduct(item);
      const matchedProductName = match?.product?.name || '';
      const matchedVariantName = match?.variant?.name || '';
      const matchedProductId = match?.product?._id || '';

      const imgUrl = item.imageUrl || item.url || item.image || '';
      const screen = item.screenName || '';
      const entityType = item.entityType || '';
      const entityId = item.entityId ? String(item.entityId) : '';
      const errorDetails = item.errorDetails || item.reason || item.errorMessage || item.error || '';
      const id = item._id || item.id || '';
      const user = typeof item.user === 'object' ? (item.user?.name || item.user?.email || item.user?.phone || '') : (item.user || '');

      return (
        imgUrl.toLowerCase().includes(q) ||
        screen.toLowerCase().includes(q) ||
        entityType.toLowerCase().includes(q) ||
        entityId.toLowerCase().includes(q) ||
        errorDetails.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        matchedProductName.toLowerCase().includes(q) ||
        matchedVariantName.toLowerCase().includes(q) ||
        matchedProductId.toLowerCase().includes(q) ||
        user.toLowerCase().includes(q)
      );
    });
  }, [brokenImages, searchQuery, getMatchedProduct]);

  // Statistics
  const stats = useMemo(() => {
    const total = brokenImages.length;
    const pending = brokenImages.filter(i => (i.status || 'PENDING').toUpperCase() === 'PENDING').length;
    const resolved = brokenImages.filter(i => (i.status || '').toUpperCase() === 'RESOLVED').length;
    const ignored = brokenImages.filter(i => (i.status || '').toUpperCase() === 'IGNORED').length;
    return { total, pending, resolved, ignored };
  }, [brokenImages]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const isAllCurrentSelected = currentItems.length > 0 && currentItems.every(item => selectedIds.has(item._id || item.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentItems.forEach(item => next.delete(item._id || item.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentItems.forEach(item => next.add(item._id || item.id));
        return next;
      });
    }
  };

  return (
    <div className="relative space-y-6 min-h-full w-full z-0 isolate pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-in slide-in-from-bottom-5 ${
          toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/30 text-rose-300 shadow-rose-950/50'
            : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-emerald-950/50'
        }`}>
          {toastMessage.type === 'error' ? <FiAlertTriangle size={18} /> : <FiCheckCircle size={18} />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 relative">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 relative">
              <FiAlertTriangle size={24} />
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-slate-900"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Broken Images Center
                </h1>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Live Polling (15s)</span>
                </div>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Monitor, verify, resolve, and ignore catalog image loading failures reported by the mobile app & store.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => fetchBrokenImages(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Refresh broken images"
          >
            <FiRefreshCw className={`${refreshing ? 'animate-spin text-blue-400' : ''}`} size={14} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/products/list')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <FiPackage size={14} />
            <span>Product Catalog</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative">
        <div 
          onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl relative overflow-hidden ${
            activeTab === 'PENDING'
              ? 'bg-rose-500/15 border-rose-500/40 shadow-lg shadow-rose-500/10'
              : 'bg-slate-900/40 border-white/10 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Action</span>
              {stats.pending > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FiAlertTriangle size={16} />
            </div>
          </div>
          <span className="text-2xl font-black text-rose-400 mt-2 block font-mono">
            {stats.pending}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Unresolved broken links</span>
        </div>

        <div 
          onClick={() => { setActiveTab('RESOLVED'); setCurrentPage(1); }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/40 border-white/10 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FiCheckCircle size={16} />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-400 mt-2 block font-mono">
            {stats.resolved}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Fixed / Verified links</span>
        </div>

        <div 
          onClick={() => { setActiveTab('IGNORED'); setCurrentPage(1); }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl ${
            activeTab === 'IGNORED'
              ? 'bg-slate-700/30 border-slate-500/40 shadow-lg shadow-slate-700/10'
              : 'bg-slate-900/40 border-white/10 hover:border-slate-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ignored / Muted</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-white/10">
              <FiXCircle size={16} />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-300 mt-2 block font-mono">
            {stats.ignored}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Muted reports</span>
        </div>

        <div 
          onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl ${
            activeTab === 'ALL'
              ? 'bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/40 border-white/10 hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reports</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FiLayers size={16} />
            </div>
          </div>
          <span className="text-2xl font-black text-white mt-2 block font-mono">
            {stats.total}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">All logged incidents</span>
        </div>
      </div>

      {/* Control Bar: Status Tabs + Search + Bulk Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 z-10 relative">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl overflow-x-auto no-scrollbar">
          {[
            { id: 'PENDING', label: 'Pending', count: stats.pending, color: 'text-rose-400' },
            { id: 'RESOLVED', label: 'Resolved', count: stats.resolved, color: 'text-emerald-400' },
            { id: 'IGNORED', label: 'Ignored', count: stats.ignored, color: 'text-slate-400' },
            { id: 'ALL', label: 'All Reports', count: stats.total, color: 'text-blue-400' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.id === 'PENDING' && tab.count > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search by product, url, or error..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs text-slate-400 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkUpdateStatus('RESOLVED')}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <FiCheckCircle size={13} />
                <span>Resolve Selected</span>
              </button>
              <button
                onClick={() => handleBulkUpdateStatus('IGNORED')}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <FiXCircle size={13} />
                <span>Ignore Selected</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Table View */}
      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl overflow-hidden z-10 relative">
        {loading ? (
          <div className="p-6">
            <TableRowSkeleton columns={6} rows={6} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <FiCheckCircle className="text-emerald-400 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">No Broken Images Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No images match your search query "${searchQuery}".`
                : activeTab === 'PENDING'
                  ? 'All product images in the catalog are currently loading properly with zero pending issues.'
                  : `No records found under the ${activeTab.toLowerCase()} status.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="py-4 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                    />
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20">Preview</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Product / Screen</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Broken Image URL</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Error Details</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Reports</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Reported</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentItems.map((item, idx) => {
                  const itemId = item._id || item.id || `broken-img-${idx}`;
                  const isSelected = selectedIds.has(itemId);
                  const isUpdating = actionLoadingId === itemId;
                  const itemStatus = (item.status || 'PENDING').toUpperCase();
                  const rawUrl = item.imageUrl || item.url || item.image || '';
                  const formattedUrl = formatImageUrl(rawUrl);
                  const screen = item.screenName || 'AppScreen';
                  const entityType = item.entityType || 'general';
                  const entityId = item.entityId ? String(item.entityId) : null;
                  const reportCount = item.reportCount || 1;
                  const errorReason = item.errorDetails || item.reason || item.errorMessage || item.error || 'Failed to load (HTTP 404 / Network Error)';
                  const timestamp = item.lastReportedAt || item.createdAt || item.updatedAt;

                  // Matched product from catalog
                  const match = getMatchedProduct(item);
                  const matchedProduct = match?.product;
                  const matchedVariant = match?.variant;

                  return (
                    <tr
                      key={itemId}
                      className={`hover:bg-white/[0.02] transition-colors group ${
                        isSelected ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(itemId, e)}
                          className="rounded border-white/20 bg-slate-900 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Thumbnail Preview */}
                      <td className="py-4 px-4">
                        <div
                          onClick={() => setPreviewItem(item)}
                          className="w-14 h-14 rounded-xl bg-slate-800 border border-white/10 p-1 flex items-center justify-center relative overflow-hidden group-hover:border-rose-500/40 transition-colors cursor-pointer shrink-0 bg-white"
                          title="Click to zoom / inspect"
                        >
                          <img
                            src={formattedUrl}
                            alt={matchedProduct?.name || screen}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-slate-900/90 text-rose-400 flex-col items-center justify-center text-[9px] font-bold p-1 text-center">
                            <FiAlertTriangle size={14} className="mb-0.5" />
                            <span>Error</span>
                          </div>
                        </div>
                      </td>

                      {/* Product / Screen Details */}
                      <td className="py-4 px-5">
                        {matchedProduct ? (
                          <div className="flex flex-col max-w-xs">
                            <span 
                              onClick={() => navigate(`/products/list?viewProductId=${matchedProduct._id}`)}
                              className="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate cursor-pointer flex items-center gap-1.5"
                              title={`Product: ${matchedProduct.name} (Click to open)`}
                            >
                              <FiPackage className="text-blue-400 shrink-0 text-xs" />
                              <span className="truncate">{matchedProduct.name}</span>
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                Product Matched
                              </span>
                              {matchedVariant?.name && (
                                <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded truncate max-w-[120px]" title={`Variant: ${matchedVariant.name}`}>
                                  {matchedVariant.name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-medium">
                                on {screen}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col max-w-xs">
                            <span 
                              onClick={() => setPreviewItem(item)}
                              className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate cursor-pointer"
                              title={screen}
                            >
                              {screen}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                {entityType}
                              </span>
                              {entityId && (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (entityType === 'product') navigate(`/products/list?viewProductId=${entityId}`);
                                  }}
                                  className={`text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 ${entityType === 'product' ? 'hover:text-blue-300 cursor-pointer' : ''}`}
                                  title={`Entity ID: ${entityId}`}
                                >
                                  #{entityId.substring(Math.max(0, entityId.length - 8))}
                                </span>
                              )}
                              {item.user && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  by {typeof item.user === 'object' ? (item.user.name || item.user.email || 'User') : 'User'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Broken Image URL */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 max-w-xs sm:max-w-sm">
                          <span
                            className="text-xs font-mono text-slate-300 truncate select-all"
                            title={rawUrl}
                          >
                            {rawUrl || '-'}
                          </span>
                          {rawUrl && (
                            <button
                              onClick={(e) => handleCopyUrl(rawUrl, e)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Copy URL"
                            >
                              {copiedUrl === rawUrl ? <FiCheck className="text-emerald-400" size={12} /> : <FiCopy size={12} />}
                            </button>
                          )}
                          {formattedUrl && (
                            <a
                              href={formattedUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Open image in new tab"
                            >
                              <FiExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Error Details */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 max-w-xs truncate" title={errorReason}>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0 font-mono">
                            {errorReason.includes('404') ? '404' : errorReason.includes('500') ? '500' : 'Error'}
                          </span>
                          <span className="truncate text-slate-300 font-medium text-[11px]">{errorReason}</span>
                        </div>
                      </td>

                      {/* Report Count */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black font-mono ${
                          reportCount > 3 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/5 text-slate-300 border border-white/10'
                        }`}>
                          {reportCount}x
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-5 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FiClock className="text-slate-500" size={12} />
                          <span>{formatDateTimeDDMMYYYY(timestamp)}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          itemStatus === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : itemStatus === 'IGNORED'
                              ? 'bg-slate-800 text-slate-400 border-white/10'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {itemStatus === 'RESOLVED' && <FiCheckCircle size={11} />}
                          {itemStatus === 'IGNORED' && <FiXCircle size={11} />}
                          {itemStatus === 'PENDING' && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                          )}
                          {itemStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {itemStatus !== 'RESOLVED' && (
                            <button
                              onClick={(e) => handleUpdateStatus(itemId, 'RESOLVED', e)}
                              disabled={isUpdating}
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              title="Mark as Resolved"
                            >
                              <FiCheck size={12} />
                              <span>Resolve</span>
                            </button>
                          )}

                          {itemStatus !== 'IGNORED' && (
                            <button
                              onClick={(e) => handleUpdateStatus(itemId, 'IGNORED', e)}
                              disabled={isUpdating}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Ignore / Mute error"
                            >
                              <span>Ignore</span>
                            </button>
                          )}

                          {itemStatus !== 'PENDING' && (
                            <button
                              onClick={(e) => handleUpdateStatus(itemId, 'PENDING', e)}
                              disabled={isUpdating}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Reopen incident"
                            >
                              <span>Reopen</span>
                            </button>
                          )}

                          {matchedProduct && (
                            <button
                              onClick={() => navigate(`/products/variants/${matchedProduct._id}`)}
                              className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors cursor-pointer"
                              title="Edit product variants & images"
                            >
                              <FiSliders size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Inspect details"
                          >
                            <FiEye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredItems.length > 0 && (
          <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white font-mono">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-white font-mono">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="font-bold text-white font-mono">{filteredItems.length}</span> reports
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FiChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                .map((page, i, arr) => {
                  const prev = arr[i - 1];
                  return (
                    <React.Fragment key={page}>
                      {prev && page - prev > 1 && (
                        <span className="px-2 text-slate-600 text-xs">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detailed Image Inspector */}
      {previewItem && (() => {
        const modalMatch = getMatchedProduct(previewItem);
        const modalMatchedProduct = modalMatch?.product;
        const modalMatchedVariant = modalMatch?.variant;

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewItem(null)}
          >
            <div 
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl p-6 relative space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    <FiAlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Broken Image Inspector</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {modalMatchedProduct ? `Matched: ${modalMatchedProduct.name}` : (previewItem.screenName ? `Screen: ${previewItem.screenName}` : 'Image Incident Report')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Image Preview & Test Loader Box */}
              <div className="w-full h-56 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center p-4 relative overflow-hidden">
                <img
                  src={formatImageUrl(previewItem.imageUrl || previewItem.url || previewItem.image)}
                  alt="Test reload"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
                <div className="hidden absolute inset-0 bg-slate-950/95 flex-col items-center justify-center gap-2 text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <FiAlertTriangle size={22} />
                  </div>
                  <p className="text-sm font-bold text-white">Image Failed to Render</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    {previewItem.errorDetails || previewItem.reason || previewItem.errorMessage || 'HTTP request failed (404 / Network Error).'}
                  </p>
                </div>
              </div>

              {/* Info Fields */}
              <div className="space-y-2.5 text-xs">
                {modalMatchedProduct && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <FiPackage size={13} />
                        Matched Catalog Product
                      </span>
                      <button
                        onClick={() => {
                          setPreviewItem(null);
                          navigate(`/products/list?viewProductId=${modalMatchedProduct._id}`);
                        }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                      >
                        View in Catalog →
                      </button>
                    </div>
                    <p className="text-white font-bold text-sm">{modalMatchedProduct.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>ID: {modalMatchedProduct._id}</span>
                      <CopyButton text={modalMatchedProduct._id} size={11} className="text-slate-400 hover:text-white" />
                      {modalMatchedVariant?.name && (
                        <span className="text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded font-sans font-semibold">
                          Variant: {modalMatchedVariant.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Screen Name</span>
                  <span className="text-white font-semibold">{previewItem.screenName || 'AppScreen'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Entity Type & ID</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold uppercase text-[10px]">
                      {previewItem.entityType || 'general'}
                    </span>
                    {previewItem.entityId && (
                      <span className="font-mono text-slate-300">#{String(previewItem.entityId)}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Report Count</span>
                  <span className="font-bold text-white font-mono">{previewItem.reportCount || 1} times reported</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Status</span>
                  <span className={`font-bold uppercase ${
                    (previewItem.status || '').toUpperCase() === 'RESOLVED'
                      ? 'text-emerald-400'
                      : (previewItem.status || '').toUpperCase() === 'IGNORED'
                        ? 'text-slate-400'
                        : 'text-amber-400'
                  }`}>
                    {previewItem.status || 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Last Reported</span>
                  <span className="text-slate-300 font-mono">
                    {formatDateTimeDDMMYYYY(previewItem.lastReportedAt || previewItem.createdAt || previewItem.updatedAt)}
                  </span>
                </div>
                {previewItem.errorDetails && (
                  <div className="py-1.5 border-b border-white/5 space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider block">Error Details</span>
                    <p className="font-mono text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl break-all">
                      {previewItem.errorDetails}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-1 py-1.5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Image Source URL</span>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-slate-300 select-all break-all">
                    <span className="flex-1">{previewItem.imageUrl || previewItem.url || previewItem.image}</span>
                    <button
                      onClick={(e) => handleCopyUrl(previewItem.imageUrl || previewItem.url || previewItem.image, e)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      <FiCopy size={13} />
                    </button>
                    <a
                      href={formatImageUrl(previewItem.imageUrl || previewItem.url || previewItem.image)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-400"
                      title="Open in new tab"
                    >
                      <FiExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={(e) => handleUpdateStatus(previewItem._id || previewItem.id, 'IGNORED', e)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Ignore
                </button>
                <button
                  onClick={(e) => handleUpdateStatus(previewItem._id || previewItem.id, 'RESOLVED', e)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
