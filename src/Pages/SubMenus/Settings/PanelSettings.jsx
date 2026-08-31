import { useState, useEffect } from 'react';
import { 
  FiBell, FiBellOff, FiVolume2, FiVolumeX, FiCheckCircle, 
  FiAlertTriangle, FiSliders, FiShoppingCart, FiFileText, 
  FiUsers, FiMessageCircle, FiImage, FiSend, FiRefreshCw, FiExternalLink,
  FiServer, FiClock, FiZap
} from 'react-icons/fi';
import PageHeader from '../../../Components/PageHeader';
import Card from '../../../Components/Card';
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

const PanelSettings = () => {
  const [settings, setSettings] = useState(() => getNotificationSettings());
  const [browserPermission, setBrowserPermission] = useState(() => getNotificationPermission());
  const [savedMessage, setSavedMessage] = useState('');
  const isSupported = isBrowserNotificationSupported();
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext ?? true) : true;

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
    const updated = saveNotificationSettings(partial);
    setSettings(updated);
    setSavedMessage('Settings updated successfully');
    setTimeout(() => setSavedMessage(''), 2500);
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
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      activeBorder: 'border-blue-500/30',
      activeBg: 'bg-blue-500/10',
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
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      activeBorder: 'border-amber-500/30',
      activeBg: 'bg-amber-500/10',
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
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-500/30',
      activeBg: 'bg-emerald-500/10',
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
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
      activeBorder: 'border-indigo-500/30',
      activeBg: 'bg-indigo-500/10',
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
      color: 'text-rose-400',
      bg: 'bg-rose-500/20',
      activeBorder: 'border-rose-500/30',
      activeBg: 'bg-rose-500/10',
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
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      activeBorder: 'border-cyan-500/30',
      activeBg: 'bg-cyan-500/10',
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
          savedMessage ? (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <FiCheckCircle size={14} />
              {savedMessage}
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Desktop Browser Notifications Card */}
        <Card className="p-5 sm:p-6 space-y-5 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400">
                  <FiBell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Desktop Push Alerts</h3>
                  <p className="text-xs text-slate-400">System notifications outside the browser window.</p>
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
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Permission Status Information */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Browser Permission Status:</span>
                {browserPermission === 'granted' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    GRANTED
                  </span>
                ) : browserPermission === 'denied' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <FiBellOff size={11} />
                    BLOCKED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    NOT YET REQUESTED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {browserPermission === 'granted'
                  ? settings.browserAlertsEnabled
                    ? 'Desktop alerts are active. You will receive notifications when new orders, quotes, or chat messages arrive even if the browser tab is minimized.'
                    : 'Browser permission is granted, but desktop alerts are turned off in-app. Toggle the switch above to resume.'
                  : browserPermission === 'denied'
                  ? 'Notifications are blocked in your browser site settings. Click the tune/padlock icon in the URL bar to allow notifications.'
                  : 'Click the button below to grant permission and activate background desktop notifications.'}
              </p>

              {!isSecure && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <FiAlertTriangle className="shrink-0 mt-0.5 text-amber-400" size={15} />
                  <span>
                    <strong>HTTP Insecure Context Detected:</strong> Chrome blocks native desktop notifications over non-HTTPS connections. Access this panel via <strong>HTTPS</strong> (e.g. <code>https://...</code>) or rely on the In-App Floating Toasts & Audio Chimes below.
                  </span>
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
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20'
                      : 'bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <FiSend size={14} /> Test Browser Notification
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ browserAlertsEnabled: !settings.browserAlertsEnabled })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.browserAlertsEnabled
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  {settings.browserAlertsEnabled ? 'Turn Off Alerts' : 'Turn On Alerts'}
                </button>
              </>
            )}
          </div>
        </Card>

        {/* 2. In-App Floating Toast & Sound Alerts */}
        <Card className="p-5 sm:p-6 space-y-5 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                  <FiSliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">In-App Toast & Audio Chimes</h3>
                  <p className="text-xs text-slate-400">Floating popup notifications inside the panel.</p>
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
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.soundEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {settings.soundEnabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Audio Chime Sound</p>
                  <p className="text-[11px] text-slate-400">Play pleasant sound on new alert arrivals</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.soundEnabled}
                  onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Auto Dismiss Duration */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <div>
                <p className="text-xs font-bold text-white">Toast Auto-Dismiss Duration</p>
                <p className="text-[11px] text-slate-400">Time toast stays visible on screen</p>
              </div>
              <select
                value={settings.toastDuration || 6000}
                onChange={(e) => handleUpdate({ toastDuration: Number(e.target.value) })}
                className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value={4000}>4 Seconds</option>
                <option value={6000}>6 Seconds (Default)</option>
                <option value={8000}>8 Seconds</option>
                <option value={10000}>10 Seconds</option>
              </select>
            </div>
          </div>

          {/* Test button */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={handleTestSound}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <FiVolume2 size={14} /> Test Audio Chime
            </button>
          </div>
        </Card>

        {/* 3. Granular Category Subscriptions & Polling Control Card */}
        <Card className="p-5 sm:p-6 space-y-5 bg-slate-900/60 border border-white/10 rounded-2xl lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white">Category Subscriptions & Polling Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <FiClock size={11} /> Live Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Toggle notification triggers and independently configure the background polling refresh frequency for each worker.</p>
            </div>

            {/* Quick Polling Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('turbo')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Chat 5s, Orders 10s, Quotes 10s, Users 15s"
              >
                <FiZap size={13} className="text-amber-400" /> Turbo (Fast)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('standard')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Chat 15s, Orders 30s, Quotes 30s, Users 30s"
              >
                <FiRefreshCw size={12} className="text-blue-400" /> Standard (30s)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('eco')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Chat 60s, Orders 2m, Quotes 2m, Users 2m"
              >
                <FiClock size={12} className="text-emerald-400" /> Eco (Low Bandwidth)
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
                      : 'bg-slate-950/40 border-white/5 opacity-65'
                  }`}
                >
                  {/* Card Header & Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.color} shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-snug">{cat.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{cat.desc}</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={() => handleToggleCategory(cat.key)} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Polling Interval Selector Bar */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                      <FiClock size={12} className="text-slate-400" />
                      <span>Polling:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={currentInterval}
                        onChange={(e) => handleUpdatePolling(cat.key, e.target.value)}
                        className="bg-slate-900/90 border border-white/10 hover:border-white/20 text-white text-[11px] font-bold rounded-xl px-2.5 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                      >
                        {cat.options.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-800 text-slate-300 border border-white/10 min-w-[34px] text-center">
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
    </div>
  );
};

export default PanelSettings;

