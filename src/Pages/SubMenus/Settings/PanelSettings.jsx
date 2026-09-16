import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBell, FiBellOff, FiVolume2, FiVolumeX, FiCheckCircle, 
  FiAlertTriangle, FiSliders, FiShoppingCart, FiFileText, 
  FiUsers, FiMessageCircle, FiImage, FiSend, FiRefreshCw, FiExternalLink,
  FiServer, FiClock, FiZap, FiChevronDown, FiChevronUp, FiCopy, FiInfo,
  FiShield, FiTerminal, FiHelpCircle, FiCheck, FiSave, FiRotateCcw,
  FiSun, FiMoon, FiLayers,
  FiAlertCircle, FiGrid, FiList, FiPackage
} from 'react-icons/fi';
import PageHeader from '../../../Components/PageHeader';
import Card from '../../../Components/Card';
import CustomDropdown from '../../../Components/CustomDropdown';
import CopyButton from '../../../Components/CopyButton';
import Pagination from '../../../Components/Pagination';
import { useConfirm } from '../../../Context/ConfirmationContext';
import { useTheme } from '../../../Context/ThemeContext';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  getNotificationPermission, 
  requestBrowserNotificationPermission, 
  showBrowserNotification, 
  playNotificationSound,
  isBrowserNotificationSupported,
  DEFAULT_NOTIFICATION_SETTINGS
} from '../../../utils/browserNotifications';
import { RiCheckLine, RiInformationLine } from 'react-icons/ri';

const TOAST_DURATION_OPTIONS = [
  { value: 4000, label: '4 Seconds' },
  { value: 6000, label: '6 Seconds (Default)' },
  { value: 8000, label: '8 Seconds' },
  { value: 10000, label: '10 Seconds' }
];

const PAGINATION_LIMIT_OPTIONS = [
  { value: 1, label: 'Always Show (1+ Pages)' },
  { value: 3, label: '3 Pages' },
  { value: 5, label: '5 Pages (Compact)' },
  { value: 7, label: '7 Pages (Standard / Default)' },
  { value: 10, label: '10 Pages' },
  { value: 15, label: '15 Pages' },
  { value: 20, label: '20 Pages' },
  { value: 25, label: '25 Pages' },
  { value: 50, label: '50 Pages' }
];

const PanelSettings = () => {
  const navigate = useNavigate();
  const { confirm, showAlert } = useConfirm();
  const { theme, setTheme, isDark } = useTheme();
  const [settings, setSettings] = useState(() => getNotificationSettings());
  const [savedSettings, setSavedSettings] = useState(() => getNotificationSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(() => getNotificationPermission());
  const isSupported = isBrowserNotificationSupported();
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;
  const isHttp = typeof window !== 'undefined' ? (window.location.protocol === 'http:') : false;
  const isLocalhost = typeof window !== 'undefined' ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') : false;
  const currentOrigin = 'http://213.210.36.19:3002';
  const [showHttpGuide, setShowHttpGuide] = useState(false);
  const [selectedBrowserTab, setSelectedBrowserTab] = useState('chrome');
  const [activeTab, setActiveTab] = useState('notifications');
  const [demoTotalPages, setDemoTotalPages] = useState(12);
  const [demoCurrentPage, setDemoCurrentPage] = useState(1);

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  useEffect(() => {
    const handleViewModeSync = () => {
      setSettings(prev => ({
        ...prev,
        productViewMode: localStorage.getItem('product_view_mode') || prev.productViewMode || 'grid',
        quotesViewMode: localStorage.getItem('quotes_view_mode') || prev.quotesViewMode || 'grid'
      }));
    };
    window.addEventListener('panel_view_mode_changed', handleViewModeSync);
    return () => window.removeEventListener('panel_view_mode_changed', handleViewModeSync);
  }, []);

  useEffect(() => {
    const updatePerm = () => {
      setBrowserPermission(getNotificationPermission());
    };

    updatePerm();
    window.addEventListener('focus', updatePerm);

    let permStatus = null;
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' })
        .then(status => {
          permStatus = status;
          status.onchange = () => {
            setBrowserPermission(status.state || getNotificationPermission());
          };
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('focus', updatePerm);
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  const handleUpdate = (partial) => {
    setSettings(prev => ({
      ...prev,
      ...partial,
      categories: {
        ...(prev.categories || {}),
        ...(partial.categories || {})
      },
      pollingIntervals: {
        ...(prev.pollingIntervals || {}),
        ...(partial.pollingIntervals || {})
      }
    }));
  };

  const handleSave = async () => {
    const isConfirmed = await confirm('Are you sure you want to save these panel settings?');
    if (!isConfirmed) return;

    setIsSaving(true);
    try {
      const updated = saveNotificationSettings(settings);
      setSettings(updated);
      setSavedSettings(updated);
      showAlert('Panel settings have been saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showAlert('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!hasChanges) return;
    const isConfirmed = await confirm('Discard all unsaved changes and reload previous settings?');
    if (!isConfirmed) return;
    setSettings(savedSettings);
  };

  const handleToggleCategory = (key) => {
    const updatedCategories = {
      ...settings.categories,
      [key]: !settings.categories[key]
    };
    handleUpdate({ categories: updatedCategories });
  };

  const handleUpdatePolling = (categoryKey, seconds) => {
    const updatedIntervals = {
      ...settings.pollingIntervals,
      [categoryKey]: Number(seconds)
    };
    handleUpdate({ pollingIntervals: updatedIntervals });
  };

  const handleApplyPreset = (presetType) => {
    if (presetType === 'turbo') {
      handleUpdate({
        pollingIntervals: {
          chat: 5,
          orders: 10,
          quotes: 10,
          users: 15,
          apiRequests: 15,
          brokenImages: 60
        }
      });
    } else if (presetType === 'standard') {
      handleUpdate({
        pollingIntervals: { ...DEFAULT_NOTIFICATION_SETTINGS.pollingIntervals }
      });
    } else if (presetType === 'eco') {
      handleUpdate({
        pollingIntervals: {
          chat: 60,
          orders: 120,
          quotes: 120,
          users: 120,
          apiRequests: 120,
          brokenImages: 600
        }
      });
    }
  };

  const handleToggleBrowserAlerts = async () => {
    const nextState = !settings.browserAlertsEnabled;
    if (nextState && browserPermission !== 'granted') {
      const res = await requestBrowserNotificationPermission();
      setBrowserPermission(res);
      handleUpdate({ browserAlertsEnabled: res === 'granted' });
    } else {
      handleUpdate({ browserAlertsEnabled: nextState });
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setBrowserPermission(res);
    if (res === 'granted') {
      handleUpdate({ browserAlertsEnabled: true });
    }
  };

  const handleTestBrowser = () => {
    showBrowserNotification({
      title: 'Inizio Admin Push Alert',
      body: 'Desktop notifications are configured and active! You will be alerted when new orders or requests arrive.',
      path: '/orders/all',
      tag: `test-settings-${Date.now()}`
    });
  };

  const handleTestSound = () => {
    playNotificationSound('chime');
  };

  const categoryConfigs = [
    {
      key: 'orders',
      title: 'Orders & Status',
      desc: 'New incoming orders & order status changes',
      icon: FiShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/15 dark:bg-blue-500/20',
      activeBorder: 'border-blue-300/80 dark:border-blue-500/30',
      activeBg: 'bg-blue-50/80 dark:bg-blue-500/10',
      checkboxColor: 'text-blue-600 focus:ring-blue-500',
      defaultInterval: 30,
      options: [
        { label: '5 Seconds (Realtime)', value: 5 },
        { label: '10 Seconds (Fast)', value: 10 },
        { label: '15 Seconds', value: 15 },
        { label: '30 Seconds (Default)', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 },
        { label: '5 Minutes (300s)', value: 300 }
      ]
    },
    {
      key: 'quotes',
      title: 'Quotes Requests',
      desc: 'Customer quotation inquiries & reviews',
      icon: FiFileText,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/15 dark:bg-amber-500/20',
      activeBorder: 'border-amber-300/80 dark:border-amber-500/30',
      activeBg: 'bg-amber-50/80 dark:bg-amber-500/10',
      checkboxColor: 'text-amber-600 focus:ring-amber-500',
      defaultInterval: 30,
      options: [
        { label: '5 Seconds (Realtime)', value: 5 },
        { label: '10 Seconds (Fast)', value: 10 },
        { label: '15 Seconds', value: 15 },
        { label: '30 Seconds (Default)', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 },
        { label: '5 Minutes (300s)', value: 300 }
      ]
    },
    {
      key: 'users',
      title: 'User Accounts',
      desc: 'Signups, KYC verifications & deletions',
      icon: FiUsers,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
      activeBorder: 'border-emerald-300/80 dark:border-emerald-500/30',
      activeBg: 'bg-emerald-50/80 dark:bg-emerald-500/10',
      checkboxColor: 'text-emerald-600 focus:ring-emerald-500',
      defaultInterval: 30,
      options: [
        { label: '5 Seconds (Realtime)', value: 5 },
        { label: '10 Seconds (Fast)', value: 10 },
        { label: '15 Seconds', value: 15 },
        { label: '30 Seconds (Default)', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 },
        { label: '5 Minutes (300s)', value: 300 }
      ]
    },
    {
      key: 'chat',
      title: 'Live Chat Messages',
      desc: 'Real-time customer chats & unread badge',
      icon: FiMessageCircle,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
      activeBorder: 'border-indigo-300/80 dark:border-indigo-500/30',
      activeBg: 'bg-indigo-50/80 dark:bg-indigo-500/10',
      checkboxColor: 'text-indigo-600 focus:ring-indigo-500',
      defaultInterval: 15,
      options: [
        { label: '5 Seconds (Realtime)', value: 5 },
        { label: '10 Seconds (Fast)', value: 10 },
        { label: '15 Seconds (Default)', value: 15 },
        { label: '30 Seconds', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 }
      ]
    },
    {
      key: 'brokenImages',
      title: 'Broken Images & Health',
      desc: 'Proactive catalog image audits & health',
      icon: FiImage,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/15 dark:bg-rose-500/20',
      activeBorder: 'border-rose-300/80 dark:border-rose-500/30',
      activeBg: 'bg-rose-50/80 dark:bg-rose-500/10',
      checkboxColor: 'text-rose-600 focus:ring-rose-500',
      defaultInterval: 180,
      options: [
        { label: '30 Seconds (Fast Audit)', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 },
        { label: '3 Minutes (Default)', value: 180 },
        { label: '5 Minutes (300s)', value: 300 },
        { label: '10 Minutes (600s)', value: 600 }
      ]
    },
    {
      key: 'apiRequests',
      title: 'API & Dashboard Stats',
      desc: 'Live dashboard metrics, carts & telemetry',
      icon: FiServer,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
      activeBorder: 'border-cyan-300/80 dark:border-cyan-500/30',
      activeBg: 'bg-cyan-50/80 dark:bg-cyan-500/10',
      checkboxColor: 'text-cyan-600 focus:ring-cyan-500',
      defaultInterval: 30,
      options: [
        { label: '5 Seconds (Realtime)', value: 5 },
        { label: '10 Seconds (Fast)', value: 10 },
        { label: '15 Seconds', value: 15 },
        { label: '30 Seconds (Default)', value: 30 },
        { label: '1 Minute (60s)', value: 60 },
        { label: '2 Minutes (120s)', value: 120 },
        { label: '5 Minutes (300s)', value: 300 }
      ]
    }
  ];

  const formatIntervalDisplay = (seconds) => {
    if (!seconds) return '30s';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  return (
    <div className="space-y-6 min-h-full pb-10">
      <PageHeader
        title="Panel Settings"
        icon={FiSliders}
        description="Configure desktop push alerts, floating in-app toast banners, sound chimes, and background polling frequencies."
        action={
          <div className="flex items-center gap-2.5">
            {hasChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <FiRotateCcw size={13} /> Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 active:scale-95'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-500 dark:border-white/5 cursor-not-allowed'
              }`}
            >
              <FiSave size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              {hasChanges && !isSaving && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
          </div>
        }
      />

      {/* Navigation Tab & Theme Bar at Top */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/80 dark:border-white/10 pb-4">
        <div className="flex bg-white/30 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl w-full sm:w-auto gap-1.5 shadow-sm dark:shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <FiBell size={14} />
            <span>Notification Alerts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('polling')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'polling'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <FiClock size={14} />
            <span>Polling Engine</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pagination')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'pagination'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <FiLayers size={14} />
            <span>Display & Pagination</span>
          </button>
        </div>

        {/* Global Theme Mode Toggle Switcher */}
        <div className="flex items-center gap-1.5 bg-white/30 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm dark:shadow-lg">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Theme:</span>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              theme === 'dark'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <FiMoon size={13} />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              theme === 'light'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <FiSun size={13} />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* 1. Notification Alerts Section */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. Desktop Browser Notifications Card */}
            <Card className="p-5 sm:p-6 space-y-5 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl flex flex-col justify-between shadow-xs dark:shadow-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <FiBell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Desktop Push Alerts</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">System notifications outside the browser window.</p>
                </div>
              </div>

              {/* Master Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.browserAlertsEnabled && browserPermission === 'granted'}
                  onChange={handleToggleBrowserAlerts}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Permission Status Information */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Browser Permission Status:</span>
                {browserPermission === 'granted' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    GRANTED
                  </span>
                ) : browserPermission === 'denied' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <FiBellOff size={11} />
                    BLOCKED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    NOT YET REQUESTED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {browserPermission === 'granted'
                  ? settings.browserAlertsEnabled
                    ? 'Desktop alerts are active. You will receive notifications when new orders, quotes, or chat messages arrive even if the browser tab is minimized.'
                    : 'Browser permission is granted, but desktop alerts are turned off in-app. Toggle the switch above to resume.'
                  : browserPermission === 'denied'
                  ? 'Notifications are blocked in your browser site settings. Click the tune/padlock icon in the URL bar to allow notifications.'
                  : 'Click the button below to grant permission and activate background desktop notifications.'}
              </p>

              {!isSecure ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <FiAlertTriangle className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={16} />
                    <div className="space-y-1">
                      <strong className="text-amber-900 dark:text-amber-200 block">HTTP Insecure Context Detected:</strong>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Browsers restrict native desktop notifications over non-HTTPS connections. You can easily enable them for this HTTP server in 2 minutes using browser flags.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowHttpGuide(!showHttpGuide)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/30 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <FiHelpCircle size={13} />
                      {showHttpGuide ? 'Hide HTTP Guide' : 'Open HTTP Activation Guide'}
                      {showHttpGuide ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                    </button>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400/80 font-mono">Origin: {currentOrigin}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    <FiShield size={12} /> Secure Context Active (HTTPS/Localhost)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHttpGuide(!showHttpGuide)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FiHelpCircle size={13} />
                    {showHttpGuide ? 'Hide HTTP Guide' : 'HTTP Setup Guide'}
                    {showHttpGuide ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            {browserPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <FiBell size={14} /> Request Browser Permission
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTestBrowser}
                  disabled={!settings.browserAlertsEnabled}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    settings.browserAlertsEnabled
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-white/10'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:border-white/5 cursor-not-allowed'
                  }`}
                >
                  <FiSend size={14} /> Test Browser Notification
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ browserAlertsEnabled: !settings.browserAlertsEnabled })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.browserAlertsEnabled
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/20'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/20'
                  }`}
                >
                  {settings.browserAlertsEnabled ? 'Turn Off Alerts' : 'Turn On Alerts'}
                </button>
              </>
            )}
          </div>
        </Card>

        {/* 2. In-App Floating Toast & Sound Alerts */}
        <Card className="p-5 sm:p-6 space-y-5 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl flex flex-col justify-between shadow-xs dark:shadow-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <FiSliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">In-App Toast & Audio Chimes</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Floating popup notifications inside the panel.</p>
                </div>
              </div>

              {/* Toast Master Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.toastAlertsEnabled}
                  onChange={(e) => handleUpdate({ toastAlertsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.soundEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                  {settings.soundEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Audio Chime Sound</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Play pleasant sound on new alert arrivals</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.soundEnabled}
                  onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Auto Dismiss Duration */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 gap-3">
              <div className="shrink-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Toast Auto-Dismiss Duration</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Time toast stays visible on screen</p>
              </div>
              <div className="w-44 sm:w-48">
                <CustomDropdown
                  value={settings.toastDuration || 6000}
                  onChange={(val) => handleUpdate({ toastDuration: Number(val) })}
                  options={TOAST_DURATION_OPTIONS}
                  statusColor="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-white text-xs font-bold !py-1.5 !px-3 !rounded-xl focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Test button */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={handleTestSound}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <FiVolume2 size={14} /> Test Audio Chime
            </button>
          </div>
        </Card>

        {/* HTTP Server Browser Notification Activation Guide */}
        {showHttpGuide && (
          <Card className="p-5 sm:p-6 space-y-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-500/10 dark:via-slate-900/90 dark:to-slate-950/95 border border-amber-500/30 rounded-2xl lg:col-span-2 shadow-2xl relative overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20 dark:border-white/10">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  <FiTerminal size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">HTTP Server Browser Notification Guide</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      HTTP Whitelist Setup
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Modern Chromium browsers (Chrome, Edge, Brave) disable Push Notifications on plain HTTP connections by default. Follow this 2-minute setup to whitelist this server origin.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHttpGuide(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/10 dark:border-white/5 transition-all cursor-pointer"
                >
                  Dismiss Guide
                </button>
              </div>
            </div>

            {/* Target Origin Quick Copy Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-slate-950/80 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  Your Server Origin
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold text-xs sm:text-sm select-all">{currentOrigin}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Copy origin:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-600/20 border border-blue-400/30 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-mono">
                  <span>{currentOrigin}</span>
                  <CopyButton text={currentOrigin} size={13} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" />
                </div>
              </div>
            </div>

            {/* Browser Selector Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Choose Browser:</span>
                {[
                  { id: 'chrome', name: 'Google Chrome', flag: 'chrome://flags/#unsafely-treat-insecure-origin-as-secure' },
                  { id: 'edge', name: 'Microsoft Edge', flag: 'edge://flags/#unsafely-treat-insecure-origin-as-secure' },
                  { id: 'brave', name: 'Brave Browser', flag: 'brave://flags/#unsafely-treat-insecure-origin-as-secure' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrowserTab(b.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedBrowserTab === b.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500/40'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:border-white/5'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>

              {/* Step by step cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs dark:shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-400/40 font-black text-xs flex items-center justify-center shrink-0">1</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Open Browser Flags</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Copy the flag address below, paste it into the address bar of a <strong>new browser tab</strong>, and press Enter:
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-white/10 flex items-center justify-between gap-1 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                    <span className="truncate">
                      {selectedBrowserTab === 'edge'
                        ? 'edge://flags/#unsafely-treat-insecure-origin-as-secure'
                        : selectedBrowserTab === 'brave'
                        ? 'brave://flags/#unsafely-treat-insecure-origin-as-secure'
                        : 'chrome://flags/#unsafely-treat-insecure-origin-as-secure'}
                    </span>
                    <CopyButton
                      text={
                        selectedBrowserTab === 'edge'
                          ? 'edge://flags/#unsafely-treat-insecure-origin-as-secure'
                          : selectedBrowserTab === 'brave'
                          ? 'brave://flags/#unsafely-treat-insecure-origin-as-secure'
                          : 'chrome://flags/#unsafely-treat-insecure-origin-as-secure'
                      }
                      size={13}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                    />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs dark:shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-400/40 font-black text-xs flex items-center justify-center shrink-0">2</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Enable the Flag</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Locate the highlighted flag <strong>"Insecure origins treated as secure"</strong>. Change its setting from <span className="text-rose-500 font-semibold">"Disabled"</span> to <span className="text-emerald-600 dark:text-emerald-400 font-bold">"Enabled"</span>.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-slate-900/80 border border-emerald-300 dark:border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <FiCheckCircle size={14} className="shrink-0" />
                    <span>Set dropdown: <strong>Enabled</strong></span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs dark:shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-400/40 font-black text-xs flex items-center justify-center shrink-0">3</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Paste Origin & Relaunch</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      In the text input box that appears under the flag, paste your server origin. Then click the blue <strong>"Relaunch"</strong> button in the bottom corner.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-white/10 flex items-center justify-between gap-1 text-[11px] font-mono text-blue-800 dark:text-blue-300">
                    <span className="truncate">{currentOrigin}</span>
                    <CopyButton text={currentOrigin} size={13} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" />
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3 shadow-xs dark:shadow-none">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-400/40 font-black text-xs flex items-center justify-center shrink-0">4</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Grant Permission</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      After the browser restarts, return here and click <strong>"Request Browser Permission"</strong>. The browser will now prompt you and enable desktop push alerts!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 !text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95"
                  >
                    <FiBell size={13} /> Grant Permission
                  </button>
                </div>
              </div>
            </div>

            {/* Note & Alternative */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <FiInfo className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
                <span>
                  <strong>Zero Setup Alternative:</strong> In-App Floating Toast Banners and Audio Chime Sounds work out of the box on all HTTP servers without configuring any browser flags.
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Multiple origins can be separated by commas in flags (e.g. <code>{currentOrigin}, http:&#47;&#47;192.168.1.100:5173</code>)
              </div>
            </div>
          </Card>
        )}
          </div>
        </div>
      )}

      {/* 2. Polling Engine Section */}
      {activeTab === 'polling' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Granular Category Subscriptions & Polling Control Card */}
          <Card className="p-5 sm:p-6 space-y-5 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl w-full shadow-xs dark:shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Category Subscriptions & Polling Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-400/30 dark:border-blue-500/30 flex items-center gap-1">
                  <FiClock size={11} /> Live Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toggle notification triggers and independently configure the background polling refresh frequency for each worker.</p>
            </div>

            {/* Quick Polling Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('turbo')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:text-amber-300 dark:border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Chat 5s, Orders 10s, Quotes 10s, Users 15s"
              >
                <FiZap size={13} className="text-amber-500" /> Turbo (Fast)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('standard')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-300 dark:border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Chat 15s, Orders 30s, Quotes 30s, Users 30s"
              >
                <FiRefreshCw size={12} className="text-blue-500" /> Standard (30s)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('eco')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Chat 60s, Orders 2m, Quotes 2m, Users 2m"
              >
                <FiClock size={12} className="text-emerald-500" /> Eco (Low Bandwidth)
              </button>
            </div>
          </div>

          {/* Grid of Category Cards with Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
            {categoryConfigs.map((cat) => {
              const isEnabled = settings.categories?.[cat.key] !== false;
              const currentInterval = settings.pollingIntervals?.[cat.key] || cat.defaultInterval;
              const Icon = cat.icon;

              return (
                <div 
                  key={cat.key}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                    isEnabled
                      ? `${cat.activeBg} ${cat.activeBorder}`
                      : 'bg-slate-100/70 border-slate-200 dark:bg-slate-950/40 dark:border-white/5 opacity-65'
                  }`}
                >
                  {/* Card Header & Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.color} shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{cat.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{cat.desc}</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={() => handleToggleCategory(cat.key)} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Polling Interval Selector Bar */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                      <FiClock size={12} className="text-slate-400" />
                      <span>Polling:</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <div className="w-40 sm:w-44">
                        <CustomDropdown
                          value={currentInterval}
                          onChange={(val) => handleUpdatePolling(cat.key, Number(val))}
                          options={cat.options}
                          statusColor="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-white text-[11px] font-bold !py-1 !px-2.5 !rounded-xl focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 min-w-[34px] text-center shrink-0">
                        {formatIntervalDisplay(currentInterval)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        </div>
      )}

      {/* 3. Pagination & Display Section */}
      {activeTab === 'pagination' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Default Page View Modes (ProductList & Quotes) */}
          <Card className="p-5 sm:p-6 space-y-6 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl w-full shadow-xs dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FiGrid size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Default Page View Modes</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-400/30 dark:border-indigo-500/30">
                      Table & Grid Layouts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure whether the Product List and Quotes pages open in Table View or Grid / Cards View by default.
                  </p>
                </div>
              </div>

              {/* Reset to default button */}
              <button
                type="button"
                onClick={() => {
                  handleUpdate({ productViewMode: 'grid', quotesViewMode: 'grid' });
                  try {
                    localStorage.setItem('product_view_mode', 'grid');
                    localStorage.setItem('quotes_view_mode', 'grid');
                    window.dispatchEvent(new Event('panel_view_mode_changed'));
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Reset to Defaults (Grid)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Product List View Card */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <FiPackage size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Product List</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">/products/list</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/products/list')}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Open Product List"
                    >
                      <span className="hidden sm:inline">Open</span>
                      <FiExternalLink size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    Choose whether your catalog opens in an app-style visual card grid with variant previews or in a spreadsheet-style tabular data view.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current View:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      {(settings.productViewMode ?? 'grid') === 'grid' ? 'Grid (Cards)' : 'Table (Rows)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdate({ productViewMode: 'grid' });
                        try {
                          localStorage.setItem('product_view_mode', 'grid');
                          window.dispatchEvent(new Event('panel_view_mode_changed'));
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.productViewMode ?? 'grid') === 'grid'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <FiGrid size={14} />
                      <span>Grid View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdate({ productViewMode: 'table' });
                        try {
                          localStorage.setItem('product_view_mode', 'table');
                          window.dispatchEvent(new Event('panel_view_mode_changed'));
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.productViewMode ?? 'grid') === 'table'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <FiList size={14} />
                      <span>Table View</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quotes View Card */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <FiFileText size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Quotes</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">/quotes</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/quotes')}
                      className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Open Quotes"
                    >
                      <span className="hidden sm:inline">Open</span>
                      <FiExternalLink size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    Choose whether quotation inquiries show as interactive visual cards with user contacts or as a streamlined table for fast scanning and status updates.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current View:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                      {(settings.quotesViewMode ?? 'grid') === 'grid' ? 'Cards (Grid)' : 'Table (Rows)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdate({ quotesViewMode: 'grid' });
                        try {
                          localStorage.setItem('quotes_view_mode', 'grid');
                          window.dispatchEvent(new Event('panel_view_mode_changed'));
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.quotesViewMode ?? 'grid') === 'grid'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <FiGrid size={14} />
                      <span>Cards View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdate({ quotesViewMode: 'table' });
                        try {
                          localStorage.setItem('quotes_view_mode', 'table');
                          window.dispatchEvent(new Event('panel_view_mode_changed'));
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (settings.quotesViewMode ?? 'grid') === 'table'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <FiList size={14} />
                      <span>Table View</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Threshold Configuration Card */}
          <Card className="p-5 sm:p-6 space-y-6 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl w-full shadow-xs dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                  <FiLayers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Page Selection Dropdown Threshold</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-400/30 dark:border-blue-500/30">
                      Active: {settings.paginationDropdownLimit ?? 7} Pages Limit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Automatically display a quick page navigation dropdown on all paginated tables and lists when the total page count exceeds this limit.
                  </p>
                </div>
              </div>

              {/* Reset to default button */}
              <button
                type="button"
                onClick={() => handleUpdate({ paginationDropdownLimit: 7 })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Reset to Default (7)
              </button>
            </div>

            {/* Controls Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Preset Buttons and Dropdown */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Quick Presets:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Always Show (1)', value: 1 },
                      { label: '3 Pages', value: 3 },
                      { label: '5 Pages (Compact)', value: 5 },
                      { label: '7 Pages (Default)', value: 7 },
                      { label: '10 Pages', value: 10 },
                      { label: '15 Pages', value: 15 },
                      { label: '20 Pages', value: 20 }
                    ].map((preset) => {
                      const isSelected = (settings.paginationDropdownLimit ?? 7) === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleUpdate({ paginationDropdownLimit: preset.value })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40'
                              : 'bg-white dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Choose Threshold From Dropdown</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Select standard limit presets</p>
                    </div>
                    <div className="w-48 sm:w-56">
                      <CustomDropdown
                        value={settings.paginationDropdownLimit ?? 7}
                        onChange={(val) => handleUpdate({ paginationDropdownLimit: Number(val) })}
                        options={PAGINATION_LIMIT_OPTIONS}
                        statusColor="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-800 dark:text-white text-xs font-bold !py-1.5 !px-3 !rounded-xl focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Exact Number Input */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Custom Threshold Limit</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Enter any custom number of pages</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate({ paginationDropdownLimit: Math.max(1, (settings.paginationDropdownLimit ?? 7) - 1) })}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center justify-center text-sm"
                      title="Decrease by 1"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.paginationDropdownLimit ?? 7}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          handleUpdate({ paginationDropdownLimit: val });
                        }
                      }}
                      className="w-16 text-center py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate({ paginationDropdownLimit: (settings.paginationDropdownLimit ?? 7) + 1 })}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center justify-center text-sm"
                      title="Increase by 1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: How it works & Status info */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/5 via-slate-50 to-slate-100 dark:from-blue-500/10 dark:via-slate-950/60 dark:to-slate-900/40 border border-blue-500/20 space-y-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm">
                  <FiInfo size={16} />
                  <span>How It Operates Across the Admin Panel</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5"><RiCheckLine/></span>
                    <div>
                      <strong className="text-slate-800 dark:text-white">When Total Pages &gt; {settings.paginationDropdownLimit ?? 7}:</strong>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        A page selection dropdown <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono">"Go to: [Page X]"</code> will be visible, allowing admins to instantly jump to any page in 1 click.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[12px] flex items-center justify-center shrink-0 mt-0.5"><RiInformationLine/></span>
                    <div>
                      <strong className="text-slate-800 dark:text-white">When Total Pages &le; {settings.paginationDropdownLimit ?? 7}:</strong>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Only standard page number buttons are displayed without cluttering the interface with an extra dropdown.
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Applied automatically to: <strong>Orders, Quotes, Ledgers, Notifications, User Accounts, Products, Catalog, and Reports</strong>.
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Live Demonstration & Playground Card */}
          <Card className="p-5 sm:p-6 space-y-5 bg-white/30 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 rounded-2xl w-full shadow-xs dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                  <FiSliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Interactive Live Preview & Demonstration</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Test how pagination behaves with different total page counts against your threshold.</p>
                </div>
              </div>

              {/* Status pill indicating whether dropdown is visible in preview */}
              <div className="shrink-0">
                {demoTotalPages > (settings.paginationDropdownLimit ?? 7) ? (
                  <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Dropdown Visible ({demoTotalPages} &gt; {settings.paginationDropdownLimit ?? 7})
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-white/40 dark:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-white/10 flex items-center gap-1.5">
                    Dropdown Hidden ({demoTotalPages} &le; {settings.paginationDropdownLimit ?? 7})
                  </span>
                )}
              </div>
            </div>

            {/* Playground Controls to simulate different page counts */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Simulate Total Pages:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '4 Pages (Below Limit)', value: 4 },
                    { label: '7 Pages (At Limit)', value: 7 },
                    { label: '8 Pages (Above Limit)', value: 8 },
                    { label: '15 Pages', value: 15 },
                    { label: '50 Pages', value: 50 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setDemoTotalPages(preset.value);
                        setDemoCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        demoTotalPages === preset.value
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Rendered Pagination Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Simulated Items: <span className="font-bold text-slate-900 dark:text-white">{demoCurrentPage * 10 - 9}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(demoCurrentPage * 10, demoTotalPages * 10)}</span> of <span className="font-bold text-slate-900 dark:text-white">{demoTotalPages * 10}</span> demo records
              </span>

              <Pagination
                currentPage={demoCurrentPage}
                totalPages={demoTotalPages}
                onPageChange={(page) => setDemoCurrentPage(page)}
                showDropdownThreshold={settings.paginationDropdownLimit ?? 7}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Floating Save Bar on Unsaved Changes */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md border border-blue-500/30 shadow-2xl shadow-blue-500/15 dark:shadow-blue-500/20 px-5 py-3 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <FiSave size={13} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelSettings;

