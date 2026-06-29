import React, { useState, useEffect } from 'react';
import { 
  FiSettings, FiPlay, FiSquare, FiClock, 
  FiCalendar, FiTrash2, FiAlertTriangle, FiRefreshCw,
  FiSmartphone, FiSave
} from 'react-icons/fi';
import { FaApple, FaAndroid } from 'react-icons/fa';
import { api } from '../../../api/axios';

const Maintenance = () => {
  // Maintenance State
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [timerLabel, setTimerLabel] = useState('Time Remaining');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // App Version & Update State (Platform Specific)
  const [androidConfig, setAndroidConfig] = useState({
    latestVersion: '2.0.2',
    forceUpdate: false,
    updateTitle: 'New Update Available',
    updateMessage: 'Critical security patches and payment flow enhancements are now live.',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.inizio.store'
  });
  
  const [iosConfig, setIosConfig] = useState({
    latestVersion: '2.0.2',
    forceUpdate: false,
    updateTitle: 'New Update Available',
    updateMessage: 'Critical security patches and payment flow enhancements are now live.',
    storeUrl: 'https://apps.apple.com/in/app/inizio/id6763986039'
  });
  
  const [updateLoading, setUpdateLoading] = useState(false);

  // 1. Fetch current live config from Backend on Mount
  useEffect(() => {
    const fetchBackendConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get('/app-config');
        
        const { 
          maintenanceMode, maintenanceMessage, updatedAt,
          android, ios
        } = response.data;
        
        // Populate Maintenance Data
        setIsActive(maintenanceMode);
        setMessage(maintenanceMessage || '');
        
        // Populate Platform Specific App Version Data
        if (android) setAndroidConfig(android);
        if (ios) setIosConfig(ios);
        
        if (maintenanceMode) {
          setTimerLabel('Live (No End Time Specified)');
          setHistory([
            {
              id: new Date(updatedAt).getTime(),
              message: maintenanceMessage || 'Active System Maintenance',
              startTime: new Date(updatedAt).toLocaleString(),
              endTime: 'Indefinite',
              status: 'Active'
            }
          ]);
        } else if (updatedAt) {
          setHistory([
            {
              id: new Date(updatedAt).getTime(),
              message: maintenanceMessage || 'Previous Maintenance',
              startTime: 'Unknown',
              endTime: new Date(updatedAt).toLocaleString(),
              status: 'Completed'
            }
          ]);
        }

      } catch (error) {
        console.error('Error fetching backend config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBackendConfig();
  }, []);

  // Countdown Timer Logic
  useEffect(() => {
    let interval;
    
    if (isActive && startTime && endTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        
        let distance;
        
        if (now < start) {
          distance = start - now;
          setTimerLabel('Starts In');
        } else if (now < end) {
          distance = end - now;
          setTimerLabel('Time Remaining');
        } else {
          distance = 0;
        }

        if (distance <= 0 && now >= end) {
          clearInterval(interval);
          setTimeLeft('00:00:00');
          setTimerLabel('Time Remaining');
          handleStop(true); 
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          
          if (days > 0) {
            setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          } else {
            setTimeLeft(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
          }
        }
      }, 1000);
    } else if (!isActive) {
      setTimeLeft('00:00:00');
      if (timerLabel !== 'Live (No End Time Specified)') {
        setTimerLabel('Time Remaining');
      }
    }

    return () => clearInterval(interval);
  }, [isActive, startTime, endTime]);

  // Handle Maintenance Form
  const handleStart = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      alert('Please provide a message.');
      return;
    }

    const start = startTime ? new Date(startTime).getTime() : new Date().getTime();
    const end = endTime ? new Date(endTime).getTime() : null;

    if (end && start >= end) {
      alert('End time must be after the start time.');
      return;
    }

    if (end && end <= new Date().getTime()) {
      alert('End time must be in the future.');
      return;
    }

    try {
      setLoading(true);
      await api.put('/app-config/update', {
        maintenanceMode: true,
        maintenanceMessage: message
      });

      setIsActive(true);
      
      const newRecord = {
        id: Date.now(),
        message,
        startTime: startTime ? new Date(startTime).toLocaleString() : new Date().toLocaleString(),
        endTime: endTime ? new Date(endTime).toLocaleString() : 'Indefinite',
        status: startTime && new Date().getTime() < start ? 'Scheduled' : 'Active'
      };
      setHistory([newRecord, ...history]);
    } catch (error) {
      alert('Failed to update maintenance mode: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (autoStopped = false) => {
    try {
      setLoading(true);
      await api.put('/app-config/update', {
        maintenanceMode: false
      });

      setIsActive(false);
      
      setHistory(prev => {
        const updated = [...prev];
        if (updated[0] && (updated[0].status === 'Active' || updated[0].status === 'Scheduled')) {
          updated[0].status = autoStopped ? 'Completed' : 'Stopped Manually';
          updated[0].endTime = new Date().toLocaleString();
        }
        return updated;
      });
      
      setMessage('');
      setStartTime('');
      setEndTime('');
      setTimerLabel('Time Remaining');
    } catch (error) {
      alert('Failed to disable maintenance mode: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  // Handle App Version Form Updates
  const handleConfigChange = (platform, field, value) => {
    if (platform === 'android') {
      setAndroidConfig(prev => ({ ...prev, [field]: value }));
    } else {
      setIosConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveAppVersion = async (e) => {
    e.preventDefault();
    try {
      setUpdateLoading(true);
      // Pushing the nested structure back to the backend
      await api.put('/app-config/update', {
        android: androidConfig,
        ios: iosConfig
      });
      alert('App version configuration saved successfully.');
    } catch (error) {
      alert('Failed to save app version: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative p-4 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiSettings className="text-blue-400" />
            System Configuration
          </h1>
          <p className="text-slate-400 font-medium mt-1">Manage application downtime and platform-specific updates.</p>
        </div>
        <div className="flex gap-3 items-center">
          {(loading || updateLoading) && <FiRefreshCw className="text-blue-400 animate-spin" size={20} />}
          {isActive && (
            <div className="flex items-center px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 font-bold animate-pulse shadow-lg shadow-red-500/20">
              <FiAlertTriangle className="mr-2" /> Maintenance Active
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 1: Configure Downtime */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FiClock className="text-blue-400" /> Configure Downtime
          </h2>
          
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Display Message to Users</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isActive || loading}
                placeholder="e.g. We are currently undergoing scheduled maintenance."
                rows="3"
                className={`w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium resize-none ${(isActive || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isActive || loading}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm font-medium ${(isActive || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">End Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isActive || loading}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm font-medium ${(isActive || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="my-6 py-6 bg-slate-950/60 rounded-2xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{timerLabel}</p>
              <div className={`text-4xl font-mono font-bold tracking-widest ${isActive ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-slate-600'}`}>
                {timeLeft}
              </div>
            </div>

            {!isActive ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <FiPlay /> {loading ? 'Updating...' : 'Start Maintenance'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStop(false)}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <FiSquare /> {loading ? 'Updating...' : 'Stop Maintenance'}
              </button>
            )}
          </form>
        </div>

        {/* SECTION 2: Maintenance History */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 shrink-0">
            <FiCalendar className="text-blue-400" /> Maintenance Logs
          </h2>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-125">
            {history.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No maintenance history available.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-5 border border-white/5 rounded-2xl bg-slate-950/20 hover:bg-white/5 transition-all relative group">
                  <div className="pr-8">
                    <h3 className="font-bold text-white tracking-tight leading-tight">{item.message}</h3>
                    
                    <div className="flex flex-col gap-1 mt-3 text-xs text-slate-300 font-medium">
                      <span><span className="text-slate-500">Started:</span> {item.startTime}</span>
                      <span><span className="text-slate-500">Ended:</span> {item.endTime}</span>
                    </div>
                    
                    <div className="mt-4 flex items-center">
                      <span className={`px-2.5 py-1 rounded-md capitalize font-bold tracking-wide text-[10px]
                        ${item.status === 'Active' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                          item.status === 'Scheduled' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 
                          item.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Log"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: App Version & Updates (Platform Split) */}
      <form onSubmit={handleSaveAppVersion} className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiSmartphone className="text-blue-400" /> App Version & Updates
          </h2>
          <button
            type="submit"
            disabled={updateLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/30 text-sm"
          >
            <FiSave /> {updateLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* ANDROID CONFIG */}
          <div className="bg-slate-950/30 p-5 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold text-green-400 mb-5 flex items-center gap-2">
              <FaAndroid size={20} /> Android Configuration
            </h3>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Latest Version</label>
                  <input
                    type="text"
                    value={androidConfig.latestVersion}
                    onChange={(e) => handleConfigChange('android', 'latestVersion', e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-white transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col justify-center items-center bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Force Update</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={androidConfig.forceUpdate}
                      onChange={(e) => handleConfigChange('android', 'forceUpdate', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Update Title</label>
                <input
                  type="text"
                  value={androidConfig.updateTitle}
                  onChange={(e) => handleConfigChange('android', 'updateTitle', e.target.value)}
                  placeholder="Update Available"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Update Message</label>
                <textarea
                  value={androidConfig.updateMessage}
                  onChange={(e) => handleConfigChange('android', 'updateMessage', e.target.value)}
                  placeholder="A newer version is available."
                  rows="2"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-white transition-all text-sm resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Play Store URL</label>
                <input
                  type="text"
                  value={androidConfig.storeUrl}
                  onChange={(e) => handleConfigChange('android', 'storeUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-white transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* IOS CONFIG */}
          <div className="bg-slate-950/30 p-5 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold text-blue-400 mb-5 flex items-center gap-2">
              <FaApple size={22} className="mb-0.5" /> iOS Configuration
            </h3>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Latest Version</label>
                  <input
                    type="text"
                    value={iosConfig.latestVersion}
                    onChange={(e) => handleConfigChange('ios', 'latestVersion', e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col justify-center items-center bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Force Update</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={iosConfig.forceUpdate}
                      onChange={(e) => handleConfigChange('ios', 'forceUpdate', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Update Title</label>
                <input
                  type="text"
                  value={iosConfig.updateTitle}
                  onChange={(e) => handleConfigChange('ios', 'updateTitle', e.target.value)}
                  placeholder="Update Available"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Update Message</label>
                <textarea
                  value={iosConfig.updateMessage}
                  onChange={(e) => handleConfigChange('ios', 'updateMessage', e.target.value)}
                  placeholder="A newer version is available."
                  rows="2"
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">App Store URL</label>
                <input
                  type="text"
                  value={iosConfig.storeUrl}
                  onChange={(e) => handleConfigChange('ios', 'storeUrl', e.target.value)}
                  placeholder="https://apps.apple.com/app/id..."
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm"
                />
              </div>
            </div>
          </div>
          
        </div>
      </form>
    </div>
  );
};

export default Maintenance;