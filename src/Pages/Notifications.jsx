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
  FiChevronLeft, FiChevronRight, FiBarChart2, FiEdit3, FiSmartphone, FiMaximize2, FiMinimize2, FiCheckCircle
} from 'react-icons/fi';
import { DiAndroid, DiApple } from "react-icons/di";
import axios from 'axios';
import { api, BASE_URL } from '../api/axios';
import CustomDropdown from '../Components/CustomDropdown';
import Card from '../Components/Card';
import PageHeader from '../Components/PageHeader';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/dateUtils';
import { TableRowSkeleton } from '../Components/Skeleton';
import Pagination from '../Components/Pagination';
import { useConfirm } from '../Context/ConfirmationContext';
import appIconImg from '../assets/app_icon.png';
import { showBrowserNotification, requestBrowserNotificationPermission, isBrowserNotificationSupported } from '../utils/browserNotifications';

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

  // Phone simulator & Table copy states
  const [previewPlatform, setPreviewPlatform] = useState('ios');
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
  const historyItemsPerPage = 10;

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
        <div className="flex items-center gap-1 py-1">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-slate-900" />
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-slate-900" />
          </div>
        </div>
      );
    }

    if (!recipients || recipients.length === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs shadow-xs">
          <FiGlobe size={12} className="shrink-0 text-blue-500" /> All Registered Users
        </span>
      );
    }

    const maxVisible = 3;
    const visible = recipients.slice(0, maxVisible);
    const overflow = recipients.length - maxVisible;
    const popoverPosition = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

    return (
      <div className="relative group/stack inline-flex items-center py-1">
        {/* Overlapping Avatar Stack */}
        <div className="flex items-center -space-x-2 hover:space-x-0.5 transition-all duration-200 cursor-pointer">
          {visible.map((rec, idx) => {
            const name = rec.user?.name || rec.user?.email || rec.user?.phone || 'User';
            const initials = getInitials(name);
            const colorClass = getAvatarColor(name);
            return (
              <div
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black uppercase ring-2 ring-white dark:ring-slate-900 shadow-sm transition-transform hover:scale-110 hover:z-20 ${colorClass}`}
                title={name}
              >
                {initials}
              </div>
            );
          })}
          {overflow > 0 && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 ring-2 ring-white dark:ring-slate-900 shadow-sm transition-transform hover:scale-110 hover:z-20">
              +{overflow}
            </div>
          )}
        </div>

        {/* Hover Popover */}
        <div className={`absolute ${popoverPosition} left-0 w-64 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl opacity-0 invisible group-hover/stack:opacity-100 group-hover/stack:visible transition-all duration-200 z-50 pointer-events-none group-hover/stack:pointer-events-auto text-left`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FiUsers className="text-blue-500 text-xs" /> Recipients ({recipients.length})
            </span>
            <span className="text-[9px] font-semibold text-slate-400">Preview</span>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
            {recipients.slice(0, 5).map((rec, rIdx) => {
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
          {recipients.length > 5 && (
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold text-center mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5">
              +{recipients.length - 5} more in campaign details
            </p>
          )}
        </div>
      </div>
    );
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
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-white/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdSend className="text-blue-600 dark:text-blue-400" /> Send Push Notification
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/10">
              Studio Mode
            </span>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-6">
            
            {/* Step 1: Notification Message Content */}
            <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Message Content</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Lockscreen visible</span>
              </div>

              <div className="space-y-3">
                {/* Title input & Counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Title *</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      title.length > 65 ? 'text-rose-500 font-black' : title.length > 50 ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {title.length} / 65 {title.length > 65 && '(Truncates)'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Flash Sale is Live! ⚡"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-xs text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium transition-all"
                  />
                </div>

                {/* Description input & Counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Message Description *</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      description.length > 160 ? 'text-rose-500 font-black' : description.length > 120 ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                      {description.length} / 160 {description.length > 160 && '(Truncates)'}
                    </span>
                  </div>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Pick up right where you left off and grab your favorite gear before stock runs out!"
                    rows="2.5"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-xs text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium transition-all resize-none leading-relaxed"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Step 2: Audience & Delivery Targeting */}
            <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Targeting & Audience</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Device routing</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform Targeting */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Target Platform</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPlatform('all');
                        setPreviewPlatform('ios');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${platform === 'all'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/30 dark:bg-blue-600/30 dark:border-blue-500/50 dark:text-blue-300'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <FiGlobe className="text-sm shrink-0" />
                      <span>All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlatform('android');
                        setPreviewPlatform('android');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${platform === 'android'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/30 dark:bg-emerald-600/25 dark:border-emerald-500/50 dark:text-emerald-300'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <DiAndroid className="text-base shrink-0 text-emerald-500" />
                      <span>Android</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlatform('ios');
                        setPreviewPlatform('ios');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${platform === 'ios'
                          ? 'bg-slate-900 border-slate-700 text-white ring-2 ring-slate-800 dark:bg-white dark:border-slate-300 dark:text-black'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      <DiApple className="text-base shrink-0" />
                      <span>iOS</span>
                    </button>
                  </div>
                </div>

                {/* Audience Dropdown */}
                <div ref={audienceDropdownRef} className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Select Target Audience</label>
                  <div className="relative">
                    <div
                      onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                      className={`w-full px-3.5 py-2.5 bg-white dark:bg-black/30 border ${isAudienceDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-white/10'} rounded-xl text-slate-900 dark:text-white transition-all text-xs font-bold capitalize flex justify-between items-center cursor-pointer select-none`}
                    >
                      <div className="flex items-center gap-2">
                        {getAudienceIcon(targetType)}
                        <span>{targetType}</span>
                      </div>
                      <MdKeyboardArrowDown className={`text-lg text-slate-400 transition-transform duration-300 ${isAudienceDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </div>

                    {isAudienceDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-2500 animate-in fade-in slide-in-from-top-2">
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
                            className={`px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors flex items-center gap-2.5 ${targetType === type ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500 dark:bg-blue-600/30 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {targetType === 'Single User' ? 'Select Customer' : 'Select Customers'}
                    </label>

                    {selectedCustomerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedCustomerIds.map(id => {
                          const cust = customers.find(c => c._id === id);
                          if (!cust) return null;
                          const hasAndroid = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android');
                          const hasIos = cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios');
                          return (
                            <span key={id} className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-600/30 dark:text-blue-300 dark:border-blue-500/20 text-xs font-semibold rounded-xl gap-1.5 animate-in fade-in">
                              <span>{cust.name || cust.email}</span>
                              {hasAndroid && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold" title="Android Registered"><DiAndroid /></span>}
                              {hasIos && <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold" title="iOS Registered"><DiApple /></span>}
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerIds(prev => prev.filter(x => x !== id))}
                                className="hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm font-bold focus:outline-none ml-0.5 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

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
                          className="w-full px-3.5 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium"
                        />
                        {customerSearchTerm && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerSearchTerm('');
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}

                    {isCustomerDropdownOpen && (
                      <div className="absolute z-40 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-48">
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
                              return <div className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500 text-center">No matching customers found</div>;
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
                                className="px-3.5 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left flex justify-between items-center border-b border-slate-100 dark:border-white/5 last:border-b-0"
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white block truncate">{cust.name || 'No Name'}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{cust.email || 'No Email'}</span>
                                </div>
                                <div className="flex gap-1 shrink-0 ml-2">
                                  {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android') && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 uppercase">Android</span>
                                  )}
                                  {cust.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios') && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-white dark:text-black uppercase font-mono">iOS</span>
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

                {/* Audience Reach Meter */}
                {(() => {
                  const androidCusts = customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'android')).length;
                  const iosCusts = customers.filter(c => c.devices?.some(d => d.devicePlatform?.toLowerCase() === 'ios')).length;
                  const totalCusts = customers.length;
                  const effectiveTargetCount = targetType === 'All Users'
                    ? (platform === 'all' ? totalCusts : platform === 'android' ? androidCusts : iosCusts)
                    : selectedCustomerIds.length;

                  return (
                    <div className="md:col-span-2 p-3.5 bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <FiTrendingUp className="text-blue-500" /> Estimated Audience Reach
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {effectiveTargetCount.toLocaleString()} {effectiveTargetCount === 1 ? 'Customer' : 'Customers'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${totalCusts > 0 ? (androidCusts / totalCusts) * 100 : 50}%` }}
                          title={`Android: ${androidCusts}`}
                        />
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${totalCusts > 0 ? (iosCusts / totalCusts) * 100 : 50}%` }}
                          title={`iOS: ${iosCusts}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Android: {androidCusts}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                          iOS: {iosCusts}
                        </span>
                        <span>
                          Target: <strong className="text-slate-700 dark:text-slate-300">{targetType === 'All Users' ? (platform === 'all' ? 'All Devices' : platform.toUpperCase()) : `${selectedCustomerIds.length} Picked`}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Step 3: Destination & Rich Media */}
            <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">3</span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Destination & Rich Media</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Optional</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image URL */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Rich Image Banner URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/banner.png"
                      className="w-full pl-9 pr-8 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium"
                    />
                    <MdImage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-base" />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <FiX size={13} />
                      </button>
                    )}
                  </div>
                  {imageUrl.trim() && (
                    <div className="mt-2.5 relative w-full max-w-xs h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center shadow-xs">
                      <img src={imageUrl.trim()} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => e.target.src = 'https://placehold.co/300x150?text=Invalid+Image+URL'} />
                    </div>
                  )}
                </div>

                {/* Click Action Dropdown */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Click Action Target</label>
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
                      statusColor="pl-9 py-2 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-medium rounded-xl shadow-xs"
                    />
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                  </div>
                </div>

                {/* Dynamic Click Action Details */}
                {clickAction !== 'none' && clickAction !== 'home' && (
                  <div className="md:col-span-2 p-3 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl animate-in slide-in-from-bottom-2 space-y-3">
                    {clickAction === 'external' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">External URL</label>
                        <input
                          type="url"
                          required
                          value={actionId}
                          onChange={(e) => setActionId(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white text-xs font-medium"
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {clickAction === 'category' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Select Category</label>
                        <div className="relative">
                          <CustomDropdown
                            value={actionId}
                            onChange={(val) => setActionId(val)}
                            options={[
                              { value: '', label: '-- Select Category --' },
                              ...categories.map(cat => ({ value: cat._id, label: cat.name }))
                            ]}
                            statusColor="pl-9 py-2 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium rounded-xl shadow-xs"
                          />
                          <FiLayers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                        </div>
                      </div>
                    )}

                    {clickAction === 'brand' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Select Brand</label>
                        <div className="relative">
                          <CustomDropdown
                            value={actionId}
                            onChange={(val) => setActionId(val)}
                            options={[
                              { value: '', label: '-- Select Brand --' },
                              ...brands.map(brand => ({ value: brand._id, label: brand.name }))
                            ]}
                            statusColor="pl-9 py-2 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium rounded-xl shadow-xs"
                          />
                          <FiTrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10" />
                        </div>
                      </div>
                    )}

                    {clickAction === 'product' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">Select Product</label>
                          <div
                            onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer flex justify-between items-center text-slate-900 dark:text-white text-xs font-medium shadow-xs"
                          >
                            <span className={actionId ? "text-slate-900 dark:text-white font-medium truncate" : "text-slate-400 dark:text-slate-500"}>
                              {actionId
                                ? (products.find(p => p._id === actionId)?.name || 'Select a Product')
                                : 'Select a Product'}
                            </span>
                            <span className="text-slate-400 text-xs">▼</span>
                          </div>

                          {isActionDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-52">
                              <div className="p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  placeholder="Type to search product..."
                                  className="w-full px-3 py-1.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
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
                                        className={`px-3.5 py-1.5 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-600/30 hover:text-blue-600 dark:hover:text-white transition-colors ${actionId === prod._id ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/50 dark:text-white font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                      >
                                        {prod.name}
                                      </div>
                                    ))
                                ) : (
                                  <div className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500 text-center">No products found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {actionId && (() => {
                          const selectedProduct = products.find(p => p._id === actionId);
                          if (!selectedProduct || !Array.isArray(selectedProduct.images) || selectedProduct.images.length === 0) return null;
                          return (
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/80 dark:border-white/5">
                              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Select Product Image</label>
                              <div className="flex flex-wrap gap-2">
                                {selectedProduct.images.map((img, idx) => {
                                  const isSelected = imageUrl === img;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => setImageUrl(img)}
                                      className={`w-11 h-11 rounded-lg overflow-hidden border cursor-pointer bg-white flex items-center justify-center p-0.5 transition-all hover:scale-105 shadow-xs ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 dark:border-white/10 hover:border-slate-300'}`}
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
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSending}
                className="w-full text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/25 text-sm active:scale-98"
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Notification...</span>
                  </div>
                ) : (
                  <>
                    <MdSend /> Dispatch Push Notification
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>

        {/* Right Side: Phone simulator container */}
        <Card className="xl:col-span-4 sm:p-6 h-fit flex flex-col items-center justify-start gap-4">
          <div className="flex items-center justify-between w-full">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Device Preview</label>
            
            {/* iOS vs Android Toggle Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setPreviewPlatform('ios')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  previewPlatform === 'ios'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <DiApple className="text-sm" /> iOS
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform('android')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  previewPlatform === 'android'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <DiAndroid className="text-sm text-emerald-500" /> Android
              </button>
            </div>
          </div>

          {/* Interactive Mobile Device Frame */}
          <div className="w-full max-w-[270px] aspect-[9/18.5] bg-gradient-to-b from-slate-900 via-slate-950 to-black border-[6px] border-slate-800 rounded-[38px] shadow-2xl relative overflow-hidden flex flex-col select-none group/device">
            
            {/* Top Cutout / Dynamic Island */}
            {previewPlatform === 'ios' ? (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-22 h-4 bg-black rounded-full z-30 flex items-center justify-center shadow-sm">
                <div className="w-2 h-2 rounded-full bg-slate-900 absolute right-2.5"></div>
              </div>
            ) : (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black border border-slate-800 z-30 shadow-xs"></div>
            )}

            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 px-4 flex justify-between items-center text-[10px] text-white/90 z-20 font-semibold pt-1">
              <span>9:41</span>
              <div className="flex items-center gap-1.5 text-[9px]">
                {previewPlatform === 'android' ? <span>5G</span> : <span>📶</span>}
                <span>🔋</span>
              </div>
            </div>

            {/* Wallpaper background content */}
            <div className="flex-1 p-3.5 pt-12 relative flex flex-col justify-start">
              {/* Lockscreen date/time info */}
              <div className="text-center text-white/80 mb-4 font-light">
                <div className="text-3xl font-semibold tracking-tight">{previewPlatform === 'ios' ? '9:41' : '09:41'}</div>
                <div className="text-[10px] tracking-wide mt-0.5 font-medium text-slate-300">
                  {previewPlatform === 'ios' ? 'Thursday, August 13' : 'Thu, Aug 13'}
                </div>
              </div>

              {/* Push Notification Card (Clickable to toggle expand) */}
              <div 
                onClick={() => setIsExpandedPreview(!isExpandedPreview)}
                className={`p-3.5 rounded-2xl shadow-2xl space-y-2 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
                  previewPlatform === 'ios'
                    ? 'bg-slate-900/85 backdrop-blur-xl border border-white/15'
                    : 'bg-slate-800/95 backdrop-blur-md border border-white/10'
                }`}
                title="Click to toggle expanded rich view"
              >
                {/* Header */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[8px] text-white font-black overflow-hidden shadow-xs">
                      <img src={appIconImg} alt="I" className="w-full h-full object-cover" />
                    </span>
                    <span className="tracking-wide text-white">{previewPlatform === 'ios' ? 'INIZIO' : 'Inizio'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <span>now</span>
                    {previewPlatform === 'android' && <span className="text-[8px]">▼</span>}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-white leading-tight break-words">{title || 'Notification Title'}</h4>
                  <p className="text-[11px] text-slate-300 leading-snug break-words line-clamp-3">{description || 'Notification message preview content...'}</p>
                </div>

                {/* Rich Banner (Expands on click or when present) */}
                {imageUrl && (
                  <div className="mt-2 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center shadow-inner">
                    <img 
                      src={imageUrl} 
                      alt="Notification preview" 
                      className={`w-full object-cover transition-all duration-300 ${isExpandedPreview ? 'max-h-auto' : 'max-h-24'}`} 
                      onError={(e) => e.target.src = 'https://placehold.co/300x150?text=Invalid+Image+URL'} 
                    />
                  </div>
                )}

                {/* Interactive Action buttons when expanded */}
                {isExpandedPreview && (
                  <div className="pt-1.5 border-t border-white/10 flex gap-1.5 animate-in fade-in">
                    <div className="flex-1 py-1 text-center text-[9px] font-bold bg-white/10 rounded-lg text-white">
                      {clickAction === 'product' ? 'View Product' : 'Open App'}
                    </div>
                    <div className="py-1 px-2.5 text-center text-[9px] font-bold bg-white/5 rounded-lg text-slate-400">
                      Dismiss
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-slate-400/80 font-medium text-center mt-2">
                {isExpandedPreview ? '▲ Tap card to collapse' : '▼ Tap card to expand rich view'}
              </span>
            </div>

            {/* Home indicator bar */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/40 rounded-full"></div>
          </div>

          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">
            Simulating {previewPlatform === 'ios' ? 'iOS Lock Screen' : 'Android Notification'}
          </p>

          {/* Test Browser Notification Button */}
          {isBrowserNotificationSupported() && (
            <button
              type="button"
              onClick={async () => {
                const perm = await requestBrowserNotificationPermission();
                if (perm === 'granted') {
                  showBrowserNotification({
                    title: title || 'Inizio Preview Notification',
                    body: description || 'This is a live test preview of your browser push notification.',
                    path: '/notifications',
                    navigate
                  });
                }
              }}
              className="w-full max-w-[270px] py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <MdNotificationsActive className="text-blue-600 dark:text-blue-400" size={15} />
              Test on this Browser
            </button>
          )}
        </Card>

        {/* Bottom Section: Notification History */}
        <Card className="xl:col-span-12 !p-0 overflow-hidden flex flex-col">
          {/* Table Header & Controls */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
                <MdHistory size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Notification History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  View and manage previously sent push notification campaigns
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search History Bar */}
              <div className="relative flex-1 sm:w-72">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="Search by title, message or ID..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 shadow-inner backdrop-blur-md text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs font-medium transition-all"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={fetchCampaignHistory}
                disabled={loadingHistory}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                title="Refresh History"
              >
                <MdRefresh size={18} className={loadingHistory ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {errorHistory && (
            <div className="m-4 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 flex items-center">
              <FiAlertCircle className="mr-2 text-lg shrink-0" /> {errorHistory}
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-white/[0.03] backdrop-blur-md shadow-xs border-b border-slate-200/80 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-bold text-center w-14">S.No</th>
                  <th className="p-4 font-bold">Campaign</th>
                  <th className="p-4 font-bold">Message & Destination</th>
                  <th className="p-4 font-bold">Sent To</th>
                  <th className="p-4 font-bold text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {loadingHistory && campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <TableRowSkeleton columns={5} rows={5} />
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <MdHistory className="text-4xl text-slate-400 dark:text-slate-500 mb-2" />
                        <p className="font-medium text-sm">No notification history found.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <FiSearch className="text-4xl text-slate-400 dark:text-slate-500 mb-2" />
                        <p className="font-medium text-sm">No matching notifications found.</p>
                        <button
                          onClick={() => setHistorySearchQuery('')}
                          className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 dark:text-blue-400 font-bold rounded-lg border border-blue-200 dark:border-blue-500/30 text-xs transition-colors cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentHistoryCampaigns.map((item, index) => {
                    const rowNumber = indexOfFirstHistoryItem + index + 1;
                    const plat = (item.platform || 'all').toLowerCase();
                    const isTopRow = index < 2;
                    const targetName = getActionTargetName(item.clickAction, item.actionId);

                    return (
                      <tr
                        key={item.campaignId || index}
                        onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/notifications' } })}
                        className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] cursor-pointer transition-colors group"
                      >
                        {/* S.No */}
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                          {rowNumber}
                        </td>

                        {/* Campaign (Thumbnail + Title + ID + Platform Badge) */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt="Notification media"
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-xs"
                                onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=Img'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-500/20 shrink-0 shadow-xs">
                                <MdImage className="text-lg" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 max-w-[220px]">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={item.title}>
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider truncate" title={item.campaignId}>
                                  ID: {item.campaignId}
                                </span>
                                {plat === 'android' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                    <DiAndroid className="text-[10px]" /> Android
                                  </span>
                                )}
                                {plat === 'ios' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                                    <DiApple className="text-[10px]" /> iOS
                                  </span>
                                )}
                                {plat === 'all' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                    <FiGlobe className="text-[9px]" /> All
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Message & Date & Destination */}
                        <td className="p-4 max-w-[280px]">
                          <p className="text-xs text-slate-700 dark:text-slate-300 truncate whitespace-normal line-clamp-2 leading-relaxed" title={item.message}>
                            {item.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                              {item.createdAt ? formatDateTimeDDMMYYYY(item.createdAt) : '-'}
                            </span>
                            {item.clickAction && item.clickAction !== 'none' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 truncate max-w-[150px]">
                                <FiLink size={9} /> {item.clickAction === 'home' ? 'Home Page' : targetName || item.clickAction}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sent To (Avatar Stack) */}
                        <td className="p-4">
                          {renderAvatarStack(recipientsMap[item.campaignId], recipientsMap[item.campaignId] === undefined, isTopRow)}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Copy Campaign ID */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(e, item.campaignId)}
                              title="Copy Campaign ID"
                              className="relative p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              {copiedId === item.campaignId ? (
                                <FiCheck size={12} className="text-emerald-500" />
                              ) : (
                                <FiCopy size={12} />
                              )}
                              {copiedId === item.campaignId && (
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded shadow-md whitespace-nowrap z-30">
                                  Copied!
                                </span>
                              )}
                            </button>

                            {/* Reuse */}
                            <button
                              type="button"
                              onClick={() => handleReuse(item)}
                              className="p-1.5 sm:px-2 sm:py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-600/15 dark:hover:bg-blue-600 dark:text-blue-400 dark:hover:text-white rounded-lg border border-blue-200 dark:border-blue-500/20 transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                              title="Reuse Notification Content"
                            >
                              <FiCopy size={11} />
                              <span className="hidden md:inline text-[11px]">Reuse</span>
                            </button>

                            {/* Stats */}
                            <button
                              type="button"
                              onClick={() => navigate(`/campaign-stats/${item.campaignId}`, { state: { from: '/notifications' } })}
                              className="p-1.5 sm:px-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/10 transition-all text-xs font-semibold cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                              title="View Campaign Statistics"
                            >
                              <FiBarChart2 size={12} className="text-indigo-500 dark:text-indigo-400" />
                              <span className="hidden md:inline text-[11px]">Stats</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loadingHistory && filteredCampaigns.length > 0 && (
            <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/80 dark:bg-white/[0.02] backdrop-blur-md">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Showing <span className="font-bold text-slate-900 dark:text-white">{indexOfFirstHistoryItem + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(indexOfLastHistoryItem, filteredCampaigns.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredCampaigns.length}</span> notifications
              </span>
              <Pagination
                currentPage={currentHistoryPage}
                totalPages={totalHistoryPages}
                onPageChange={setCurrentHistoryPage}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Notifications;