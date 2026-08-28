import { useState, useEffect } from 'react';
import { 
  FiBell, FiBellOff, FiVolume2, FiVolumeX, FiCheckCircle, 
  FiAlertTriangle, FiSliders, FiShoppingCart, FiFileText, 
  FiUsers, FiMessageCircle, FiImage, FiSend, FiRefreshCw, FiExternalLink
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
  isBrowserNotificationSupported
} from '../../../utils/browserNotifications';

const NotificationSettings = () => {
  const [settings, setSettings] = useState(() => getNotificationSettings());
  const [browserPermission, setBrowserPermission] = useState(() => getNotificationPermission());
  const [savedMessage, setSavedMessage] = useState('');
  const isSupported = isBrowserNotificationSupported();

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

  return (
    <div className="space-y-6 min-h-full pb-10">
      <PageHeader
        title="Notification & Alert Settings"
        icon={FiBell}
        description="Configure desktop push alerts, floating in-app toast banners, sound chimes, and category filters."
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
                className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-purple-500"
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

        {/* 3. Granular Category Subscriptions Card */}
        <Card className="p-5 sm:p-6 space-y-4 bg-slate-900/60 border border-white/10 rounded-2xl lg:col-span-2">
          <div className="pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white">Category Subscriptions</h3>
            <p className="text-xs text-slate-400">Select which types of events trigger notification toasts and push alerts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
            {/* Orders */}
            <div 
              onClick={() => handleToggleCategory('orders')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.categories?.orders
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                  <FiShoppingCart size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Orders & Status</h4>
                  <p className="text-[10px] text-slate-400">New orders & status changes</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.categories?.orders} 
                onChange={() => {}} 
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-white/20 focus:ring-blue-500 cursor-pointer" 
              />
            </div>

            {/* Quotes */}
            <div 
              onClick={() => handleToggleCategory('quotes')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.categories?.quotes
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <FiFileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Quotes Requests</h4>
                  <p className="text-[10px] text-slate-400">Customer quotation inquiries</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.categories?.quotes} 
                onChange={() => {}} 
                className="w-4 h-4 rounded text-amber-600 bg-slate-800 border-white/20 focus:ring-amber-500 cursor-pointer" 
              />
            </div>

            {/* Users */}
            <div 
              onClick={() => handleToggleCategory('users')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.categories?.users
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <FiUsers size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">User Accounts</h4>
                  <p className="text-[10px] text-slate-400">Signups, verifications & deletions</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.categories?.users} 
                onChange={() => {}} 
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-white/20 focus:ring-emerald-500 cursor-pointer" 
              />
            </div>

            {/* Chat */}
            <div 
              onClick={() => handleToggleCategory('chat')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.categories?.chat
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FiMessageCircle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Live Chat Messages</h4>
                  <p className="text-[10px] text-slate-400">Real-time incoming customer chats</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.categories?.chat} 
                onChange={() => {}} 
                className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-white/20 focus:ring-indigo-500 cursor-pointer" 
              />
            </div>

            {/* Broken Images */}
            <div 
              onClick={() => handleToggleCategory('brokenImages')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.categories?.brokenImages
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                  <FiImage size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Broken Images</h4>
                  <p className="text-[10px] text-slate-400">Missing image detections in catalog</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.categories?.brokenImages} 
                onChange={() => {}} 
                className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-white/20 focus:ring-rose-500 cursor-pointer" 
              />
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default NotificationSettings;
