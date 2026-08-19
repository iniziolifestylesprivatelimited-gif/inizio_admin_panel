import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdSend, MdNotificationsActive, MdKeyboardArrowDown, MdImage,
  MdHistory, MdRefresh, MdPhoneAndroid, MdPhoneIphone, MdPeople,
  MdPerson, MdGroupAdd
} from 'react-icons/md';
import {
  FiAlertCircle, FiCopy, FiGlobe, FiUsers, FiUser,
  FiUserCheck, FiLayers, FiBox, FiTrendingUp, FiLink, FiCheck, FiX, FiSearch,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { DiAndroid, DiApple } from "react-icons/di";
import axios from 'axios';
import { api, BASE_URL } from '../api/axios';
import CustomDropdown from '../Components/CustomDropdown';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { TableRowSkeleton } from '../Components/Skeleton';
import { useConfirm } from '../Context/ConfirmationContext';
import appIconImg from '../assets/app_icon.png';

const Notifications = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
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
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const [recipientsMap, setRecipientsMap] = useState({});
  const historyItemsPerPage = 5;

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

    const targetCount = targetType === 'All Users'
      ? (platform === 'all' ? customers.length : platform === 'android' ? customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android')).length : customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios')).length)
      : selectedCustomerIds.length;

    const isConfirmed = await confirm(
      `Are you sure you want to send this notification to ${targetType === 'All Users' ? 'all' : targetCount} user(s) on ${platform === 'all' ? 'all platforms' : platform}?`
    );
    if (!isConfirmed) return;

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
        setCurrentHistoryPage(1);
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

  // Reset pagination when searching
  useEffect(() => {
    setCurrentHistoryPage(1);
  }, [historySearchQuery]);

  const filteredCampaigns = campaigns.filter(c => {
    if (!historySearchQuery) return true;
    const query = historySearchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(query) ||
      (c.message || '').toLowerCase().includes(query) ||
      (c.campaignId || '').toLowerCase().includes(query)
    );
  });

  // Calculate paginated campaigns
  const indexOfLastHistoryItem = currentHistoryPage * historyItemsPerPage;
  const indexOfFirstHistoryItem = indexOfLastHistoryItem - historyItemsPerPage;
  const currentHistoryCampaigns = filteredCampaigns.slice(indexOfFirstHistoryItem, indexOfLastHistoryItem);
  const totalHistoryPages = Math.ceil(filteredCampaigns.length / historyItemsPerPage);

  const getHistoryPaginationRange = () => {
    const range = [];
    const delta = 1;

    for (let i = 1; i <= totalHistoryPages; i++) {
      if (
        i === 1 ||
        i === totalHistoryPages ||
        (i >= currentHistoryPage - delta && i <= currentHistoryPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  useEffect(() => {
    const fetchRecipientsForNotifications = async () => {
      const ids = [];
      currentHistoryCampaigns.forEach(item => {
        if (item.campaignId && recipientsMap[item.campaignId] === undefined && !ids.includes(item.campaignId)) {
          ids.push(item.campaignId);
        }
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
              console.error(`Failed to fetch recipients for notification ${id}`, e);
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
        console.error('Error fetching campaign details in notifications:', err);
      }
    };

    if (currentHistoryCampaigns && currentHistoryCampaigns.length > 0) {
      fetchRecipientsForNotifications();
    }
  }, [currentHistoryCampaigns]);

  return (
    <div className="relative space-y-4 min-h-full z-0 w-full">
      {/* Header Section */}
      <PageHeader
        title="Notifications Management"
        icon={MdNotificationsActive}
        description="Compose, send, and view notification audit histories."
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Side: Compose Notification */}
        <Card className="xl:col-span-8 sm:p-8 h-fit !overflow-visible z-10">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MdSend className="text-blue-400" /> Send Notification
          </h2>

          <form onSubmit={handleSendNotification} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification Title"
                className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notification message..."
                rows="2.5"
                className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium resize-none"
              ></textarea>
            </div>

            {/* Platform Targeting */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Target Platform</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlatform('all')}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${platform === 'all'
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 ring-1 ring-blue-500/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <FiGlobe className="text-sm shrink-0" />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('android')}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${platform === 'android'
                      ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <DiAndroid className='text-sm shrink-0' />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('ios')}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${platform === 'ios'
                      ? 'bg-white border-slate-400/50 text-black ring-1 ring-slate-400/40'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <DiApple className="text-sm shrink-0" />
                  <span>iOS</span>
                </button>
              </div>
            </div>

            <div ref={audienceDropdownRef} className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Target Audience</label>

              {/* Custom Select Trigger */}
              <div className="relative">
                <div
                  onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                  className={`w-full px-3.5 py-2 bg-black/20 border ${isAudienceDropdownOpen ? 'border-blue-500/50 bg-black/40 ring-2 ring-blue-500/50' : 'border-white/10'} rounded-xl shadow-inner backdrop-blur-md text-white transition-all text-sm font-medium capitalize flex justify-between items-center cursor-pointer select-none`}
                >
                  <div className="flex items-center gap-2">
                    {getAudienceIcon(targetType)}
                    <span>{targetType}</span>
                  </div>
                  <MdKeyboardArrowDown className={`text-xl text-slate-400 transition-transform duration-300 ${isAudienceDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </div>

                {/* Custom Select Options Dropdown */}
                {isAudienceDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-2500 animate-in fade-in slide-in-from-top-2">
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
                        className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center gap-2.5 ${targetType === type ? 'bg-blue-600/35 text-blue-200 border-l-2 border-blue-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                      >
                        {getAudienceIcon(type)}
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Target Customers selector inline */}
            {targetType !== 'All Users' && (
              <div ref={customerDropdownRef} className="md:col-span-2 relative">
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {targetType === 'Single User' ? 'Select Customer' : 'Select Customers'}
                </label>

                {/* Selected Users Tags Area */}
                {selectedCustomerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedCustomerIds.map(id => {
                      const cust = customers.find(c => c._id === id);
                      if (!cust) return null;
                      const hasAndroid = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android');
                      const hasIos = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios');
                      return (
                        <span key={id} className="inline-flex items-center px-2.5 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full gap-1 animate-in fade-in">
                          {cust.name || cust.email}
                          {hasAndroid && <span className="text-[9px] text-emerald-400 font-bold" title="Android Registered Device"><DiAndroid /></span>}
                          {hasIos && <span className="text-[9px] text-indigo-300 font-bold" title="iOS Registered Device"><DiApple /></span>}
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
                      className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
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
                  <div className="absolute z-40 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-48">
                    <div className="overflow-y-auto max-h-44 custom-scrollbar">
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
                          return <div className="px-4 py-2.5 text-xs text-slate-500 text-center">No matching customers found</div>;
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
                            className="px-3.5 py-2 text-xs cursor-pointer hover:bg-white/5 transition-colors text-left flex justify-between items-center border-b border-white/5 last:border-b-0"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white block truncate">{cust.name || 'No Name'}</span>
                              <span className="text-[10px] text-slate-400 truncate">{cust.email || 'No Email'}</span>
                            </div>
                            <div className="flex gap-1 shrink-0 ml-2">
                              {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android') && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase">Android</span>
                              )}
                              {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios') && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white text-black border border-slate-500/20 uppercase font-mono">iOS</span>
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

            {/* Target users summary warning label */}
            <div className="md:col-span-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 select-none">
              <FiCheck className="text-emerald-500 shrink-0" />
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
                  ? `user(s) matching ${platform === 'all' ? 'All Platforms' : platform === 'android' ? 'Android' : 'iOS'}`
                  : `selected user(s)`
                }
              </span>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Image URL (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                />
                <MdImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-base" />
              </div>
              {imageUrl.trim() && (
                <div className="mt-2.5 relative w-full max-w-xs h-24 rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex items-center justify-center">
                  <img src={imageUrl.trim()} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => e.target.src = 'https://placehold.co/300x150?text=Invalid+Image+URL'} />
                </div>
              )}
            </div>

            {/* Click Action Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Click Action (Optional)</label>
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
                  statusColor="pl-9 py-2 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                />
                <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
              </div>
            </div>



            {/* Click Action Dynamic Fields */}
            {clickAction !== 'none' && clickAction !== 'home' && (
              <div className="md:col-span-2 p-3 bg-black/25 border border-white/5 rounded-xl animate-in slide-in-from-bottom-2">
                {clickAction === 'external' && (
                  <>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">External URL</label>
                    <input
                      type="url"
                      required
                      value={actionId}
                      onChange={(e) => setActionId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
                      placeholder="https://..."
                    />
                  </>
                )}

                {clickAction === 'category' && (
                  <>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Category</label>
                    <div className="relative">
                      <CustomDropdown
                        value={actionId}
                        onChange={(val) => setActionId(val)}
                        options={[
                          { value: '', label: '-- Select Category --' },
                          ...categories.map(cat => ({ value: cat._id, label: cat.name }))
                        ]}
                        statusColor="pl-9 py-2 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                      />
                      <FiLayers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                    </div>
                  </>
                )}

                {clickAction === 'brand' && (
                  <>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Brand</label>
                    <div className="relative">
                      <CustomDropdown
                        value={actionId}
                        onChange={(val) => setActionId(val)}
                        options={[
                          { value: '', label: '-- Select Brand --' },
                          ...brands.map(brand => ({ value: brand._id, label: brand.name }))
                        ]}
                        statusColor="pl-9 py-2 text-white border-white/10 bg-black/20 text-sm font-medium rounded-xl"
                      />
                      <FiTrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                    </div>
                  </>
                )}

                {clickAction === 'product' && (
                  <div className="relative space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Product</label>

                      {/* Dropdown Display Box */}
                      <div
                        onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                        className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 cursor-pointer flex justify-between items-center shadow-inner backdrop-blur-md text-white transition-all text-sm font-medium"
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
                        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-52">
                          <div className="p-2 border-b border-white/10 bg-slate-800/50">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Type to search product..."
                              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>

                          <div className="overflow-y-auto max-h-36 custom-scrollbar">
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
                                    className={`px-3.5 py-1.5 text-xs cursor-pointer hover:bg-blue-600/30 hover:text-white transition-colors ${actionId === prod._id ? 'bg-blue-600/50 text-white font-semibold' : 'text-slate-300'}`}
                                  >
                                    {prod.name}
                                  </div>
                                ))
                            ) : (
                              <div className="px-4 py-2 text-xs text-slate-500 text-center">No products found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Display Product Images Selector */}
                    {actionId && (() => {
                      const selectedProduct = products.find(p => p._id === actionId);
                      if (!selectedProduct || !Array.isArray(selectedProduct.images) || selectedProduct.images.length === 0) return null;
                      return (
                        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Product Image</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.images.map((img, idx) => {
                              const isSelected = imageUrl === img;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setImageUrl(img)}
                                  className={`w-12 h-12 rounded-lg overflow-hidden border cursor-pointer bg-white flex items-center justify-center p-0.5 transition-all hover:scale-105 ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-white/10 hover:border-white/30'
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

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm"
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <>
                    <MdSend /> Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        {/* Right Side: Phone simulator container */}
        <Card className="xl:col-span-4 sm:p-8 h-fit flex flex-col items-center justify-start gap-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Live Preview</label>
          <div className="w-full max-w-[270px] aspect-[9/18.5] bg-gradient-to-b from-blue-900/60 via-slate-900 to-black border-[6px] border-slate-800 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col animate-in fade-in duration-300 select-none">
            {/* Notch / Dynamic Island */}
            {platform === 'ios' ? (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900 absolute right-3"></div>
              </div>
            ) : (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-black border border-slate-800 z-30"></div>
            )}

            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 px-4 flex justify-between items-center text-[10px] text-white/95 z-20 font-semibold pt-1.5">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Wallpaper background content */}
            <div className="flex-1 p-3.5 pt-12 relative flex flex-col justify-start">
              {/* Lockscreen date/time info */}
              <div className="text-center text-white/80 mb-5 font-light">
                <div className="text-2xl font-normal">9:41</div>
                <div className="text-[10px]">Thursday, August 13</div>
              </div>

              {/* Push Notification Card */}
              <div className="bg-slate-900/80 backdrop-blur-lg border border-white/10 p-3.5 rounded-2xl shadow-xl space-y-1.5 transition-all duration-300 transform hover:scale-[1.02]">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-sm bg-blue-600 flex items-center justify-center text-[8px] text-white font-black overflow-hidden"><img src={appIconImg} alt="I" /></span>
                    <span>INIZIO</span>
                  </div>
                  <span>now</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white leading-tight break-words">{title || 'Notification Title'}</h4>
                  <p className="text-[11px] text-slate-300 leading-snug break-words">{description || 'Notification message preview content...'}</p>
                </div>
                {imageUrl && (
                  <div className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-white/5 bg-black/25 flex items-center justify-center">
                    <img src={imageUrl} alt="Notification preview" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/300x150?text=Invalid+Image+URL'} />
                  </div>
                )}
              </div>
            </div>

            {/* Home indicator bar */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full"></div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">Live Preview ({platform === 'all' ? 'All Platforms' : platform})</p>
        </Card>

        {/* Bottom Section: Notification History */}
        <Card className="xl:col-span-12 sm:p-8 flex flex-col max-h-[105vh] min-h-[70vh]">
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
              currentHistoryCampaigns.map((item) => (
                <div
                  key={item.campaignId}
                  onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/notifications' } })}
                  className="p-5 border border-white/10 rounded-2xl bg-slate-800/10 hover:bg-white/5 transition-all flex flex-col sm:flex-row gap-4 relative group cursor-pointer"
                >
                  {item.imageUrl && (
                    <div className="w-full sm:w-24 h-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-slate-800/50 flex items-center justify-center">
                      <img src={item.imageUrl} alt="Notification media" className="max-w-full max-h-full object-contain" onError={(e) => e.target.src = 'https://placehold.co/100x100?text=Error'} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-1">
                        <h3 className="font-bold text-white tracking-tight text-sm leading-snug truncate">{item.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReuse(item);
                            }}
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
                      {item.campaignId && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Sent To:</span>
                          {(() => {
                            const recipients = recipientsMap[item.campaignId];
                            if (recipients === undefined) {
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <span className="w-2.5 h-2.5 border border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                                  Loading...
                                </span>
                              );
                            }
                            if (recipients.length === 0) {
                              return <span className="text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">All Users</span>;
                            }
                            const names = recipients.map(r => r.user?.name || r.user?.email || r.user?.phone || 'N/A');
                            const limit = 5;
                            const displayedNames = names.slice(0, limit);
                            const remaining = names.length - limit;

                            return (
                              <div className="flex flex-wrap gap-1 items-center">
                                {displayedNames.map((name, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 font-semibold text-[9px]"
                                    title={name}
                                  >
                                    {name}
                                  </span>
                                ))}
                                {remaining > 0 && (
                                  <span
                                    className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 font-bold text-[9px]"
                                    title={names.slice(limit).join(', ')}
                                  >
                                    +{remaining} more
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {item.clickAction && item.clickAction !== 'none' && (
                        <div className="flex items-center ml-auto">
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

          {/* Pagination Controls */}
          {totalHistoryPages > 1 && (
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-transparent border-t border-white/10 pt-4 mt-4 shrink-0">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-white">{indexOfFirstHistoryItem + 1}</span> to <span className="font-semibold text-white">{Math.min(indexOfLastHistoryItem, filteredCampaigns.length)}</span> of <span className="font-semibold text-white">{filteredCampaigns.length}</span> entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentHistoryPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentHistoryPage === 1}
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <FiChevronLeft className="text-sm" />
                </button>

                {getHistoryPaginationRange().map((page, index) => {
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
                      onClick={() => setCurrentHistoryPage(page)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${currentHistoryPage === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                  disabled={currentHistoryPage === totalHistoryPages}
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
  );
};

export default Notifications;