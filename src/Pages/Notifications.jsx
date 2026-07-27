import React, { useState, useRef, useEffect } from 'react';
import { 
  MdSend, MdNotificationsActive, MdKeyboardArrowDown, MdImage, 
  MdHistory, MdRefresh, MdPhoneAndroid, MdPhoneIphone, MdPeople, 
  MdPerson, MdGroupAdd 
} from 'react-icons/md';
import { 
  FiAlertCircle, FiCopy, FiGlobe, FiUsers, FiUser, 
  FiUserCheck, FiLayers, FiBox, FiTrendingUp, FiLink, FiCheck, FiX, FiSearch
} from 'react-icons/fi';
import { DiAndroid, DiApple } from "react-icons/di";
import axios from 'axios';
import { api, BASE_URL } from '../api/axios';
import CustomDropdown from '../Components/CustomDropdown';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { TableRowSkeleton } from '../Components/Skeleton';

const Notifications = () => {
  const getAudienceIcon = (type) => {
    if (type === 'All Users') return <FiUsers className="text-blue-400 text-lg shrink-0" />;
    if (type === 'Single User') return <FiUser className="text-amber-400 text-lg shrink-0" />;
    if (type === 'Selected Users') return <FiUserCheck className="text-emerald-400 text-lg shrink-0" />;
    return null;
  };

  // State for the notification form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [platform, setPlatform] = useState('all'); // 'all', 'android', 'ios'
  const [targetType, setTargetType] = useState('All Users'); // 'All Users', 'Single User', 'Selected Users'
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [clickAction, setClickAction] = useState('none');
  const [actionId, setActionId] = useState('');
  const [isSending, setIsSending] = useState(false);

  // States for target list data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Refs
  const customerDropdownRef = useRef(null);
  
  // Searchable select state
  const [searchTerm, setSearchTerm] = useState('');
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);

  // State for the custom target audience dropdown
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const audienceDropdownRef = useRef(null);

  // State for campaign history list
  const [campaigns, setCampaigns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Fetch history of campaigns
  const fetchCampaignHistory = async () => {
    setLoadingHistory(true);
    setErrorHistory('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await api.get('/admin/campaign-stats', { headers });
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch campaign history:', err);
      setErrorHistory('Failed to load notification history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch products, categories, brands, and customers for selection
  useEffect(() => {
    const fetchSelectionData = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [prodRes, catRes, brandRes, custRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/products/`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE_URL}/api/categories/`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE_URL}/api/brands/`, { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] }))
        ]);
        
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        setBrands(Array.isArray(brandRes.data) ? brandRes.data : []);
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      } catch (err) {
        console.error("Failed to load selection data for notifications", err);
      }
    };
    
    fetchSelectionData();
    fetchCampaignHistory();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (audienceDropdownRef.current && !audienceDropdownRef.current.contains(event.target)) {
        setIsAudienceDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to look up names for products/categories/brands
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

  // Handle form submission
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description.');
      return;
    }

    if (clickAction === 'home' && !imageUrl.trim()) {
      alert('Please provide an Image URL when linking to the Home Page.');
      return;
    }

    if (targetType !== 'All Users' && selectedCustomerIds.length === 0) {
      alert('Please select at least one customer.');
      return;
    }

    setIsSending(true);
    try {
      const ids = targetType === 'All Users' ? ['all'] : selectedCustomerIds;
      let successCount = 0;
      let lastCampaignId = '';
      let errorMsgs = [];

      for (const id of ids) {
        try {
          const payload = {
            customerId: id,
            title: title.trim(),
            message: description.trim(),
            imageUrl: imageUrl.trim() || undefined,
            clickAction: clickAction,
            actionId: clickAction === 'home' ? (imageUrl.trim() || undefined) : (clickAction !== 'none' ? actionId : undefined),
            platform: platform !== 'all' ? platform : undefined
          };

          const response = await api.post('/admin/notify', payload);
          if (response.data?.success) {
            successCount++;
            lastCampaignId = response.data.campaignId;
          }
        } catch (err) {
          console.error(`Failed to send to customer ${id}:`, err);
          const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
          errorMsgs.push(`Customer ID ${id}: ${errMsg}`);
        }
      }

      if (successCount > 0) {
        if (targetType === 'Selected Users') {
          alert(`Notifications sent successfully to ${successCount} of ${ids.length} customers!`);
        } else {
          alert(`Notification sent successfully! Campaign ID: ${lastCampaignId}`);
        }
        if (errorMsgs.length > 0) {
          alert(`Some errors occurred:\n${errorMsgs.join('\n')}`);
        }

        // Reset the form
        setTitle('');
        setDescription('');
        setImageUrl('');
        setTargetType('All Users');
        setSelectedCustomerIds([]);
        setCustomerSearchTerm('');
        setClickAction('none');
        setActionId('');
        setSearchTerm('');
        setPlatform('all');
        setIsActionDropdownOpen(false);

        // Instant refresh of campaign history stats
        fetchCampaignHistory();
      } else {
        const aggregatedError = errorMsgs.length > 0 
          ? `Errors:\n${errorMsgs.join('\n')}` 
          : 'Failed to send notification.';
        alert(aggregatedError);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to send notification.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReuse = (item) => {
    setTitle(item.title || '');
    setDescription(item.message || '');
    setImageUrl(item.imageUrl || '');
    
    const cAction = item.clickAction || 'none';
    setClickAction(cAction);
    
    setActionId(cAction === 'home' ? '' : (item.actionId || ''));
    
    if (item.customerId === 'all') {
      setTargetType('All Users');
      setSelectedCustomerIds([]);
    } else if (item.customerId) {
      const ids = item.customerId.split(',');
      setSelectedCustomerIds(ids);
      if (ids.length === 1) {
        setTargetType('Single User');
      } else {
        setTargetType('Selected Users');
      }
    }
    setCustomerSearchTerm('');
    setSearchTerm('');
    setPlatform(item.platform || 'all');
    setIsActionDropdownOpen(false);
    
    // Smooth scroll to top of compose form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clickActionOptions = [
    { value: 'none', label: 'No Action' },
    { value: 'home', label: 'Link to Home Page' },
    { value: 'category', label: 'Link to Category' },
    { value: 'product', label: 'Link to Specific Product' },
    { value: 'brand', label: 'Link to Brand' },
    { value: 'external', label: 'Link to External Website' }
  ];

  const filteredCampaigns = campaigns.filter(c => {
    if (!historySearchQuery) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(query) ||
      (c.message || '').toLowerCase().includes(query) ||
      (c.campaignId || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative space-y-4 min-h-full z-0 w-full">
      {/* Header Section */}
      <PageHeader
        title="Notifications Management"
        icon={MdNotificationsActive}
        description="Compose, send, and view notification audit histories."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Compose Notification */}
        <Card className="sm:p-8 h-fit !overflow-visible">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MdSend className="text-blue-400" /> Send Notification
          </h2>
          
          <form onSubmit={handleSendNotification} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification Title"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notification message..."
                rows="4"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Image URL (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                />
                <MdImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg" />
              </div>
              {imageUrl.trim() && (
                <div className="mt-3 relative w-full max-w-xs h-32 rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex items-center justify-center">
                  <img src={imageUrl.trim()} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => e.target.src='https://placehold.co/300x150?text=Invalid+Image+URL'} />
                </div>
              )}
            </div>

            {/* Platform Targeting */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Target Platform</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('all')}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    platform === 'all'
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <FiGlobe className="text-xl" />
                  <span>All Platforms</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('android')}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    platform === 'android'
                      ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <DiAndroid className='text-xl'/>
                  <span>Android Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('ios')}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    platform === 'ios'
                      ? 'bg-slate-500/25 border-slate-400/50 text-slate-200 ring-1 ring-slate-400/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <DiApple className="text-xl" />
                  <span>iOS Only</span>
                </button>
              </div>
              {platform !== 'all' && (
                <p className="text-[10px] text-slate-500 mt-2 font-medium">
                  ⚠ Only users with a registered <strong className="text-slate-300">{platform === 'android' ? 'Android' : 'iOS'}</strong> device token will receive this notification.
                </p>
              )}
            </div>

            <div ref={audienceDropdownRef}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Target Audience</label>
              
              {/* Custom Select Trigger */}
              <div className="relative">
                <div
                  onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                  className={`w-full px-4 py-3 bg-black/20 border ${isAudienceDropdownOpen ? 'border-blue-500/50 bg-black/40 ring-2 ring-blue-500/50' : 'border-white/10'} rounded-xl shadow-inner backdrop-blur-md text-white transition-all text-sm font-medium capitalize flex justify-between items-center cursor-pointer select-none`}
                >
                  <div className="flex items-center gap-2">
                    {getAudienceIcon(targetType)}
                    <span>{targetType}</span>
                  </div>
                  <MdKeyboardArrowDown className={`text-xl text-slate-400 transition-transform duration-300 ${isAudienceDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </div>

                {/* Custom Select Options Dropdown */}
                {isAudienceDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    {['All Users', 'Single User', 'Selected Users'].map((type) => (
                      <div
                        key={type}
                        onClick={() => { 
                          setTargetType(type); 
                          setIsAudienceDropdownOpen(false); 
                          setSelectedCustomerIds([]);
                          setCustomerSearchTerm('');
                          setIsCustomerDropdownOpen(false);
                        }}
                        className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${targetType === type ? 'bg-blue-600/35 text-blue-200 border-l-2 border-blue-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                      >
                        {getAudienceIcon(type)}
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2.5 text-xs font-bold text-slate-400">
                <FiCheck className="text-emerald-500" />
                <span>
                  Targeting:{' '}
                  <strong className="text-white">
                    {targetType === 'All Users' ? (
                      platform === 'all' ? customers.length :
                      platform === 'android' ? customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android')).length :
                      customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios')).length
                    ) : selectedCustomerIds.length}
                  </strong>{' '}
                  {targetType === 'All Users' 
                    ? `user(s) matching ${platform === 'all' ? 'All Platforms' : platform === 'android' ? 'Android Only' : 'iOS Only'}`
                    : `selected user(s)`
                  }
                </span>
              </div>

              {targetType !== 'All Users' && (
                <div ref={customerDropdownRef} className="relative mt-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    {targetType === 'Single User' ? 'Select Customer' : 'Select Customers'}
                  </label>
                  
                  {/* Selected Users Tags Area */}
                  {selectedCustomerIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedCustomerIds.map(id => {
                        const cust = customers.find(c => c._id === id);
                        if (!cust) return null;
                        const hasAndroid = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android');
                        const hasIos = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios');
                        return (
                          <span key={id} className="inline-flex items-center px-3 py-1.5 bg-blue-600/30 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full gap-1.5 animate-in fade-in">
                            {cust.name || cust.email}
                            {hasAndroid && <span className="text-[9px] text-emerald-400 font-bold" title="Android Registered Device">🤖</span>}
                            {hasIos && <span className="text-[9px] text-indigo-300 font-bold" title="iOS Registered Device">🍎</span>}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerIds(prev => prev.filter(x => x !== id))}
                              className="hover:text-red-400 transition-colors text-sm font-bold focus:outline-none ml-1"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Select Input Box */}
                  {(targetType === 'Selected Users' || selectedCustomerIds.length === 0) && (
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder={targetType === 'Single User' ? "Search customer name or email..." : "Search and add customers..."}
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                      />
                      {customerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchTerm('');
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}

                  {/* Dropdown Menu */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute z-40 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-60">
                      <div className="overflow-y-auto max-h-56 custom-scrollbar">
                        {(() => {
                          const filtered = customers.filter(c => {
                            const matchesSearch = ((c.name || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                                                   (c.email || '').toLowerCase().includes(customerSearchTerm.toLowerCase()));
                            const matchesNotSelected = !selectedCustomerIds.includes(c._id);
                            if (platform === 'android') {
                              return matchesSearch && matchesNotSelected && c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android');
                            }
                            if (platform === 'ios') {
                              return matchesSearch && matchesNotSelected && c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios');
                            }
                            return matchesSearch && matchesNotSelected;
                          });

                          if (filtered.length === 0) {
                            return <div className="px-4 py-3 text-xs text-slate-500 text-center">No matching customers found</div>;
                          }

                          return filtered.map(cust => (
                            <div
                              key={cust._id}
                              onClick={() => {
                                if (targetType === 'Single User') {
                                  setSelectedCustomerIds([cust._id]);
                                } else {
                                  setSelectedCustomerIds(prev => [...prev, cust._id]);
                                }
                                setCustomerSearchTerm('');
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-white/5 transition-colors text-left flex justify-between items-center border-b border-white/5 last:border-b-0"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-white block truncate">{cust.name || 'No Name'}</span>
                                <span className="text-[11px] text-slate-400 truncate">{cust.email || 'No Email'}</span>
                              </div>
                              <div className="flex gap-1 shrink-0 ml-2">
                                {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android') && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">Android</span>
                                )}
                                {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios') && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20 uppercase font-mono">iOS</span>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Click Action Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Click Action (Optional)</label>
              <div className="relative">
                <CustomDropdown 
                  value={clickAction}
                  onChange={(val) => {
                    setClickAction(val);
                    setActionId('');
                    setSearchTerm('');
                    setIsActionDropdownOpen(false);
                  }}
                  options={clickActionOptions}
                  statusColor="pl-10 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                />
                <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none z-10" />
              </div>
            </div>

            {/* Click Action Dynamic Fields */}
            {clickAction !== 'none' && clickAction !== 'home' && (
              <div>
                {clickAction === 'external' && (
                  <>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">External URL</label>
                    <input 
                      type="url" 
                      required
                      value={actionId}
                      onChange={(e) => setActionId(e.target.value)}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                      placeholder="https://..."
                    />
                  </>
                )}

                {clickAction === 'category' && (
                  <>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Category</label>
                    <div className="relative">
                      <CustomDropdown
                        value={actionId}
                        onChange={(val) => setActionId(val)}
                        options={[
                          { value: '', label: '-- Select Category --' },
                          ...categories.map(cat => ({ value: cat._id, label: cat.name }))
                        ]}
                        statusColor="pl-10 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                      />
                      <FiLayers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none z-10" />
                    </div>
                  </>
                )}

                {clickAction === 'brand' && (
                  <>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Brand</label>
                    <div className="relative">
                      <CustomDropdown
                        value={actionId}
                        onChange={(val) => setActionId(val)}
                        options={[
                          { value: '', label: '-- Select Brand --' },
                          ...brands.map(brand => ({ value: brand._id, label: brand.name }))
                        ]}
                        statusColor="pl-10 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                      />
                      <FiTrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none z-10" />
                    </div>
                  </>
                )}

                {clickAction === 'product' && (
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Product</label>
                    
                    {/* Dropdown Display Box */}
                    <div 
                      onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 cursor-pointer flex justify-between items-center shadow-inner backdrop-blur-md text-white transition-all text-sm font-medium"
                    >
                      <span className={actionId ? "text-white font-medium truncate" : "text-slate-500"}>
                        {actionId 
                          ? (products.find(p => p._id === actionId)?.name || 'Select a Product') 
                          : 'Select a Product'}
                      </span>
                      <span className="text-slate-400 text-xs">▼</span>
                    </div>

                    {/* Dropdown Menu */}
                    {isActionDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-60">
                        {/* Search Input Box */}
                        <div className="p-2 border-b border-white/10 bg-slate-800/50">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Type to search product..."
                            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                            autoFocus
                          />
                        </div>
                        
                        {/* Products List */}
                        <div className="overflow-y-auto max-h-48 custom-scrollbar">
                          {products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                            products
                              .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map(prod => (
                                <div
                                  key={prod._id}
                                  onClick={() => {
                                    setActionId(prod._id);
                                    setIsActionDropdownOpen(false);
                                    setSearchTerm('');
                                    if (Array.isArray(prod.images) && prod.images.length > 0) {
                                      setImageUrl(prod.images[0]);
                                    }
                                  }}
                                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-600/30 hover:text-white transition-colors ${actionId === prod._id ? 'bg-blue-600/50 text-white font-semibold' : 'text-slate-300'}`}
                                >
                                  {prod.name}
                                </div>
                              ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">No products found</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display Product Images Selector */}
                    {actionId && (() => {
                      const selectedProduct = products.find(p => p._id === actionId);
                      if (!selectedProduct || !Array.isArray(selectedProduct.images) || selectedProduct.images.length === 0) return null;
                      return (
                        <div className="mt-4 space-y-2">
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Product Image</label>
                          <div className="flex flex-wrap gap-3">
                            {selectedProduct.images.map((img, idx) => {
                              const isSelected = imageUrl === img;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setImageUrl(img)}
                                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer bg-white flex items-center justify-center p-1 transition-all hover:scale-105 ${
                                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white/10 hover:border-white/30'
                                  }`}
                                >
                                  <img src={img} alt={`Product ${idx}`} className="max-w-full max-h-full object-contain" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-blue-600/50 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : (
                <>
                  <MdSend /> Send Message
                </>
              )}
            </button>
          </form>
              </Card>
 
         {/* Right Side: Notification History */}
         <Card className="sm:p-8 flex flex-col max-h-[105vh] min-h-[70vh]">
           <div className="flex justify-between items-center mb-6 shrink-0">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <MdHistory className="text-blue-400" /> Notification History
             </h2>
             <button 
               onClick={fetchCampaignHistory} 
               disabled={loadingHistory}
               className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
               title="Refresh History"
             >
               <MdRefresh size={20} className={loadingHistory ? "animate-spin" : ""} />
             </button>
           </div>
 
           {/* Search History Bar */}
           <div className="relative mb-5 shrink-0">
             <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
             <input
               type="text"
               placeholder="Search history by title, description or ID..."
               value={historySearchQuery}
               onChange={(e) => setHistorySearchQuery(e.target.value)}
               className="w-full pl-11 pr-11 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 text-sm font-medium transition-all"
             />
             {historySearchQuery && (
               <button
                 type="button"
                 onClick={() => setHistorySearchQuery('')}
                 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
               >
                 <FiX className="w-4 h-4" />
               </button>
             )}
           </div>
 
           {errorHistory && (
             <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/30 flex items-center mb-4 shrink-0">
               <FiAlertCircle className="mr-2 text-lg" /> {errorHistory}
             </div>
           )}
 
           <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
             {loadingHistory && campaigns.length === 0 ? (
               <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => (
                   <div key={i} className="p-5 border border-white/10 rounded-2xl bg-white/[0.01] animate-pulse flex gap-4">
                     <div className="w-24 h-16 bg-white/5 rounded-xl shrink-0" />
                     <div className="flex-1 space-y-3">
                       <div className="h-4 bg-white/5 rounded-lg w-1/3" />
                       <div className="h-3 bg-white/5 rounded-lg w-3/4" />
                       <div className="h-3 bg-white/5 rounded-lg w-1/2" />
                     </div>
                   </div>
                 ))}
               </div>
             ) : campaigns.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No notification history found.</p>
            ) : filteredCampaigns.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No matching notifications found.</p>
            ) : (
              filteredCampaigns.map((item) => (
                <div key={item.campaignId} className="p-5 border border-white/10 rounded-2xl bg-slate-800/10 hover:bg-white/5 transition-all flex flex-col sm:flex-row gap-4 relative group">
                  {item.imageUrl && (
                    <div className="w-full sm:w-24 h-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex items-center justify-center">
                      <img src={item.imageUrl} alt="Notification media" className="max-w-full max-h-full object-contain" onError={(e) => e.target.src='https://placehold.co/100x100?text=Error'} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-1">
                        <h3 className="font-bold text-white tracking-tight text-sm leading-snug truncate">{item.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReuse(item)}
                            className="p-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/20 transition-all text-xs font-bold cursor-pointer flex items-center gap-1"
                            title="Reuse Notification Content"
                          >
                            <FiCopy size={12} /> Reuse
                          </button>
                          <span className="text-[9px] text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {item.createdAt ? formatDateDDMMYYYY(item.createdAt) : ''}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2" title={item.message}>{item.message}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                      {/* Platform badge */}
                      {item.platform && item.platform !== 'all' ? (
                        <div className="flex items-center gap-1">
                          {item.platform === 'android' 
                            ? <MdPhoneAndroid className="text-emerald-400" /> 
                            : <MdPhoneIphone className="text-slate-300" />}
                          <span className={`font-bold ${item.platform === 'android' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {item.platform === 'android' ? 'Android' : 'iOS'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-blue-400 font-bold">
                          <FiGlobe className="text-xs text-blue-400 shrink-0" /> All Platforms
                        </div>
                      )}
                      {item.customerId && (
                        <div>
                          Audience:{' '}
                          <span className="font-semibold text-slate-200">
                            {item.customerId === 'all'
                              ? 'All Users'
                              : (() => {
                                  const names = item.customerId.split(',').map(id => {
                                    const c = customers.find(cust => cust._id === id);
                                    return c ? (c.name || c.email) : id;
                                  });
                                  if (names.length > 3) {
                                    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
                                  }
                                  return names.join(', ');
                                })()}
                          </span>
                        </div>
                      )}
                      {item.clickAction && item.clickAction !== 'none' && (
                        <div className="flex items-center">
                          <span className="w-1 h-1 rounded-full bg-blue-400 mr-1"></span>
                          Action: <span className="font-semibold text-slate-200 capitalize">{item.clickAction}</span>
                          {item.actionId && (
                            <span className="ml-1 text-slate-400">
                              ({getActionTargetName(item.clickAction, item.actionId)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;