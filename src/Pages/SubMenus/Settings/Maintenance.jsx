import React, { useState, useEffect } from 'react';
import { 
  FiSettings, FiPlay, FiSquare, FiClock, 
  FiCalendar, FiTrash2, FiAlertTriangle 
} from 'react-icons/fi';

const Maintenance = () => {
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [timerLabel, setTimerLabel] = useState('Time Remaining');
  
  // Mock maintenance history
  const [history, setHistory] = useState([
    {
      id: 1,
      message: 'Database Migration & Routine Cleanup',
      startTime: '4/15/2026, 02:00:00 AM',
      endTime: '4/15/2026, 04:30:00 AM',
      status: 'Completed',
    }
  ]);

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
          handleStop(true); // Auto-stop when time is up
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
    } else {
      setTimeLeft('00:00:00');
      setTimerLabel('Time Remaining');
    }

    return () => clearInterval(interval);
  }, [isActive, startTime, endTime]);

  const handleStart = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !startTime || !endTime) {
      alert('Please provide a message, start time, and end time.');
      return;
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (start >= end) {
      alert('End time must be after the start time.');
      return;
    }

    if (end <= new Date().getTime()) {
      alert('End time must be in the future.');
      return;
    }

    setIsActive(true);
    
    // Prepend the new scheduled/active maintenance to history
    const newRecord = {
      id: Date.now(),
      message,
      startTime: new Date(startTime).toLocaleString(),
      endTime: new Date(endTime).toLocaleString(),
      status: new Date().getTime() < start ? 'Scheduled' : 'Active'
    };
    setHistory([newRecord, ...history]);
  };

  const handleStop = (autoStopped = false) => {
    setIsActive(false);
    
    // Update the most recent active record to Completed/Stopped
    setHistory(prev => {
      const updated = [...prev];
      if (updated[0] && (updated[0].status === 'Active' || updated[0].status === 'Scheduled')) {
        updated[0].status = autoStopped ? 'Completed' : 'Stopped Manually';
        updated[0].endTime = new Date().toLocaleString(); // Log actual stop time
      }
      return updated;
    });
    
    setMessage('');
    setStartTime('');
    setEndTime('');
  };

  const handleDelete = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiSettings className="text-blue-400" />
            System Maintenance
          </h1>
          <p className="text-slate-400 font-medium mt-1">Schedule and manage application downtime and maintenance periods.</p>
        </div>
        {isActive && (
          <div className="flex items-center px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 font-bold animate-pulse shadow-lg shadow-red-500/20">
            <FiAlertTriangle className="mr-2" /> Maintenance Active
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
        
        {/* SECTION 1: Control Panel */}
        <div className="bg-tranparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FiClock className="text-blue-400" /> Configure Downtime
          </h2>
          
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Display Message to Users</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isActive}
                placeholder="e.g. We are currently undergoing scheduled maintenance. We'll be back shortly."
                rows="3"
                className={`w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all text-sm font-medium resize-none ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isActive}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm font-medium ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isActive}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full px-4 py-3 bg-transparent border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white transition-all text-sm font-medium ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Digital Timer Display */}
            <div className="my-6 py-6 bg-slate-900/50 rounded-2xl border border-white/10 flex flex-col items-center justify-center shadow-inner">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{timerLabel}</p>
              <div className={`text-5xl font-mono font-bold tracking-widest ${isActive ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-slate-600'}`}>
                {timeLeft}
              </div>
            </div>

            {/* Controls */}
            {!isActive ? (
              <button
                type="submit"
                className="w-full bg-blue-600/50 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <FiPlay /> Start Maintenance
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStop(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-red-600/30 animate-pulse"
              >
                <FiSquare /> Stop Maintenance
              </button>
            )}
          </form>
        </div>

        {/* SECTION 2: Maintenance History */}
        <div className="bg-transparent backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col max-h-[85vh]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 shrink-0">
            <FiCalendar className="text-blue-400" /> Maintenance Logs
          </h2>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No maintenance history available.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-5 border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all relative group">
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
    </div>
  );
};

export default Maintenance;