import React, { useState, useEffect } from 'react';
import {
  FiSettings, FiPlay, FiSquare, FiClock,
  FiCalendar, FiTrash2, FiAlertTriangle, FiRefreshCw,
  FiSmartphone, FiSave, FiGlobe
} from 'react-icons/fi';
import { FaApple, FaAndroid } from 'react-icons/fa';
import { api } from '../../../api/axios';
import CustomDatePicker from '../../../Components/CustomDatePicker';
import CustomTimePicker from '../../../Components/CustomTimePicker';

const Maintenance = () => {
  // Maintenance State
  const [activeTab, setActiveTab] = useState('global'); // 'global', 'android', 'ios'
  const [globalMessage, setGlobalMessage] = useState('');
  const [globalActive, setGlobalActive] = useState(false);

  const [androidMessage, setAndroidMessage] = useState('');
  const [androidActive, setAndroidActive] = useState(false);

  const [iosMessage, setIosMessage] = useState('');
  const [iosActive, setIosActive] = useState(false);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
          maintenanceMode, maintenanceMessage,
          androidMaintenanceMode, androidMaintenanceMessage,
          iosMaintenanceMode, iosMaintenanceMessage,
          updatedAt, android, ios
        } = response.data;

        // Populate Maintenance Data
        setGlobalActive(!!maintenanceMode);
        setGlobalMessage(maintenanceMessage || '');

        setAndroidActive(!!androidMaintenanceMode);
        setAndroidMessage(androidMaintenanceMessage || '');

        setIosActive(!!iosMaintenanceMode);
        setIosMessage(iosMaintenanceMessage || '');

        // Populate Platform Specific App Version Data
        if (android) setAndroidConfig(android);
        if (ios) setIosConfig(ios);

        // Build log history based on active states
        const activeLogs = [];
        if (maintenanceMode) {
          activeLogs.push({
            id: new Date(updatedAt).getTime() + 1,
            message: `[GLOBAL] ${maintenanceMessage || 'Active System Maintenance'}`,
            startTime: new Date(updatedAt).toLocaleString(),
            endTime: 'Indefinite',
            status: 'Active'
          });
        }
        if (androidMaintenanceMode) {
          activeLogs.push({
            id: new Date(updatedAt).getTime() + 2,
            message: `[ANDROID] ${androidMaintenanceMessage || 'Active Android Maintenance'}`,
            startTime: new Date(updatedAt).toLocaleString(),
            endTime: 'Indefinite',
            status: 'Active'
          });
        }
        if (iosMaintenanceMode) {
          activeLogs.push({
            id: new Date(updatedAt).getTime() + 3,
            message: `[IOS] ${iosMaintenanceMessage || 'Active iOS Maintenance'}`,
            startTime: new Date(updatedAt).toLocaleString(),
            endTime: 'Indefinite',
            status: 'Active'
          });
        }

        if (activeLogs.length > 0) {
          setHistory(activeLogs);
        } else if (updatedAt) {
          setHistory([
            {
              id: new Date(updatedAt).getTime(),
              message: 'Previous Maintenance session completed',
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
    const tabActive = activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive;

    if (tabActive && startTime && endTime) {
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
    } else if (tabActive && (!startTime || !endTime)) {
      setTimerLabel('Live (No End Time Specified)');
      setTimeLeft('--:--:--');
    } else if (!tabActive) {
      setTimeLeft('00:00:00');
      if (timerLabel !== 'Live (No End Time Specified)') {
        setTimerLabel('Time Remaining');
      }
    }

    return () => clearInterval(interval);
  }, [activeTab, globalActive, androidActive, iosActive, startTime, endTime]);

  // Handle Maintenance Form
  const handleStart = async (e) => {
    e.preventDefault();

    const targetMessage = activeTab === 'global' ? globalMessage : activeTab === 'android' ? androidMessage : iosMessage;

    if (!targetMessage.trim()) {
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

      let payload = {};
      if (activeTab === 'global') {
        payload = {
          maintenanceMode: true,
          maintenanceMessage: targetMessage
        };
      } else if (activeTab === 'android') {
        payload = {
          androidMaintenanceMode: true,
          androidMaintenanceMessage: targetMessage
        };
      } else {
        payload = {
          iosMaintenanceMode: true,
          iosMaintenanceMessage: targetMessage
        };
      }

      await api.put('/app-config/update', payload);

      if (activeTab === 'global') setGlobalActive(true);
      else if (activeTab === 'android') setAndroidActive(true);
      else setIosActive(true);

      const newRecord = {
        id: Date.now(),
        message: `[${activeTab.toUpperCase()}] ${targetMessage}`,
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

      let payload = {};
      if (activeTab === 'global') {
        payload = {
          maintenanceMode: false
        };
      } else if (activeTab === 'android') {
        payload = {
          androidMaintenanceMode: false
        };
      } else {
        payload = {
          iosMaintenanceMode: false
        };
      }

      await api.put('/app-config/update', payload);

      if (activeTab === 'global') setGlobalActive(false);
      else if (activeTab === 'android') setAndroidActive(false);
      else setIosActive(false);

      setHistory(prev => {
        const updated = [...prev];
        if (updated[0] && (updated[0].status === 'Active' || updated[0].status === 'Scheduled')) {
          updated[0].status = autoStopped ? 'Completed' : 'Stopped Manually';
          updated[0].endTime = new Date().toLocaleString();
        }
        return updated;
      });

      if (activeTab === 'global') setGlobalMessage('');
      else if (activeTab === 'android') setAndroidMessage('');
      else setIosMessage('');

      setStartTime('');
      setEndTime('');
      setTimerLabel('Time Remaining');
    } catch (error) {
      alert('Failed to disable maintenance mode: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    try {
      setLoading(true);
      await api.put('/app-config/update', {
        maintenanceMode: false,
        androidMaintenanceMode: false,
        iosMaintenanceMode: false
      });

      setGlobalActive(false);
      setAndroidActive(false);
      setIosActive(false);

      setGlobalMessage('');
      setAndroidMessage('');
      setIosMessage('');

      setStartTime('');
      setEndTime('');
      setTimerLabel('Time Remaining');
      alert('Maintenance turned off for all platforms successfully.');
    } catch (error) {
      alert('Failed to disable maintenance mode: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const handleDateChange = (type, dateStr) => {
    if (type === 'start') {
      let timePart = startTime ? startTime.split('T')[1] : '';
      if (!timePart && dateStr) {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        timePart = `${hrs}:${mins}`;
      } else if (!timePart) {
        timePart = '00:00';
      }
      setStartTime(dateStr ? `${dateStr}T${timePart}` : '');
    } else {
      let timePart = endTime ? endTime.split('T')[1] : '';
      if (!timePart && dateStr) {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        timePart = `${hrs}:${mins}`;
      } else if (!timePart) {
        timePart = '00:00';
      }
      setEndTime(dateStr ? `${dateStr}T${timePart}` : '');
    }
  };

  const handleTimeChange = (type, timeStr) => {
    if (type === 'start') {
      const datePart = startTime ? startTime.split('T')[0] : new Date().toISOString().split('T')[0];
      setStartTime(timeStr ? `${datePart}T${timeStr}` : '');
    } else {
      const datePart = endTime ? endTime.split('T')[0] : new Date().toISOString().split('T')[0];
      setEndTime(timeStr ? `${datePart}T${timeStr}` : '');
    }
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
          <div className="flex flex-wrap gap-2 items-center">
            {globalActive && (
              <span className="flex items-center px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold animate-pulse shadow-lg shadow-red-500/10">
                <FiAlertTriangle className="mr-1.5" /> Global Active
              </span>
            )}
            {androidActive && (
              <span className="flex items-center px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-xs font-bold animate-pulse shadow-lg shadow-green-500/10">
                <FaAndroid className="mr-1.5" /> Android Active
              </span>
            )}
            {iosActive && (
              <span className="flex items-center px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-bold animate-pulse shadow-lg shadow-blue-500/10">
                <FaApple className="mr-1.5" /> iOS Active
              </span>
            )}
            {(!globalActive && !androidActive && !iosActive) && (
              <span className="flex items-center px-3 py-1.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400 text-xs font-bold">
                No Active Maintenance
              </span>
            )}
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* SECTION 1: Configure Downtime */}
        <div className="bg-slate-950/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FiClock className="text-blue-400" /> Configure Downtime
          </h2>

          {/* Tab Selector */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('global')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'global' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FiGlobe size={14} /> Global
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'android' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FaAndroid size={14} /> Android
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'ios' ? 'bg-white text-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FaApple size={14} /> iOS
            </button>
          </div>

          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Display Message to {activeTab === 'global' ? 'All' : activeTab === 'android' ? 'Android' : 'iOS'} Users
              </label>
              <textarea
                value={activeTab === 'global' ? globalMessage : activeTab === 'android' ? androidMessage : iosMessage}
                onChange={(e) => {
                  if (activeTab === 'global') setGlobalMessage(e.target.value);
                  else if (activeTab === 'android') setAndroidMessage(e.target.value);
                  else setIosMessage(e.target.value);
                }}
                disabled={(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading}
                placeholder={`e.g. Inizio ${activeTab === 'global' ? 'App' : activeTab === 'android' ? 'Android' : 'iOS'} is currently under maintenance.`}
                rows="3"
                className={`w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium resize-none ${((activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Date (Optional)</label>
                <div className={(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading ? 'pointer-events-none opacity-50' : ''}>
                  <CustomDatePicker
                    label="Date"
                    value={startTime ? startTime.split('T')[0] : ''}
                    onChange={(date) => handleDateChange('start', date)}
                    min={new Date().toISOString().split('T')[0]}
                    align="left"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Time (Optional)</label>
                <div className={(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading ? 'pointer-events-none opacity-50' : ''}>
                  <CustomTimePicker
                    label="Time"
                    value={startTime ? startTime.split('T')[1] : ''}
                    onChange={(time) => handleTimeChange('start', time)}
                    align="left"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">End Date (Optional)</label>
                <div className={(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading ? 'pointer-events-none opacity-50' : ''}>
                  <CustomDatePicker
                    label="Date"
                    value={endTime ? endTime.split('T')[0] : ''}
                    onChange={(date) => handleDateChange('end', date)}
                    min={startTime ? startTime.split('T')[0] : new Date().toISOString().split('T')[0]}
                    align="left"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">End Time (Optional)</label>
                <div className={(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) || loading ? 'pointer-events-none opacity-50' : ''}>
                  <CustomTimePicker
                    label="Time"
                    value={endTime ? endTime.split('T')[1] : ''}
                    onChange={(time) => handleTimeChange('end', time)}
                    align="left"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="my-6 py-6 bg-slate-950/60 rounded-2xl border border-white/5 flex flex-col items-center justify-center shadow-inner">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{timerLabel}</p>
              <div className={`text-4xl font-mono font-bold tracking-widest ${(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 'text-slate-600'}`}>
                {timeLeft}
              </div>
            </div>

            {!(activeTab === 'global' ? globalActive : activeTab === 'android' ? androidActive : iosActive) ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <FiPlay /> {loading ? 'Updating...' : `Start ${activeTab === 'global' ? 'Global' : activeTab === 'android' ? 'Android' : 'iOS'} Maintenance`}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => handleStop(false)}
                  disabled={loading}
                  className="flex-1 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700"
                >
                  <FiSquare /> {loading ? 'Updating...' : 'Stop Maintenance'}
                </button>
                {(globalActive || androidActive || iosActive) && (
                  <button
                    type="button"
                    onClick={handleStopAll}
                    disabled={loading}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-slate-300 hover:text-white font-medium py-3.5 px-4 rounded-xl border border-white/10 transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <FiTrash2 /> Stop All Maintenance
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* SECTION 2: Maintenance History */}
        <div className="bg-slate-950/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col h-full">
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
      <form onSubmit={handleSaveAppVersion} className="bg-slate-950/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiSmartphone className="text-blue-400" /> App Version & Updates
          </h2>
          <button
            type="submit"
            disabled={updateLoading}
            className="disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 text-sm bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
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