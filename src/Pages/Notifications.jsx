import React, { useState, useRef, useEffect } from 'react';
import { MdDelete, MdSend, MdNotificationsActive, MdHistory, MdKeyboardArrowDown } from 'react-icons/md';

const Notifications = () => {
  // State for the notification form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState('All Users'); // 'All Users', 'Single User', 'Selected Users'
  const [targetUsers, setTargetUsers] = useState(''); // Stores user IDs if 'single' or 'selected'

  // State for the custom dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State for the notification history
  const [history, setHistory] = useState([
    {
      id: 1,
      title: 'System Update',
      description: 'The system will be down for maintenance at 2 AM UTC.',
      targetType: 'All Users',
      date: new Date().toLocaleString(),
    },
  ]);

  // Handle form submission
  const handleSendNotification = (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description.');
      return;
    }

    const newNotification = {
      id: Date.now(),
      title,
      description,
      targetType,
      targetUsers: targetType !== 'All Users' ? targetUsers : null,
      date: new Date().toLocaleString(),
    };

    // Prepend the new notification to the history
    setHistory([newNotification, ...history]);

    // Reset the form
    setTitle('');
    setDescription('');
    setTargetType('All Users');
    setTargetUsers('');
  };

  // Handle deleting a notification
  const handleDelete = (id) => {
    setHistory(history.filter((notification) => notification.id !== id));
  };

  return (
    <div className="relative space-y-6 min-h-full z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none -z-10 transform-gpu"></div>
      {/* <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none -z-10 transform-gpu"></div> */}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <MdNotificationsActive className="text-blue-400" />
            Notifications Management
          </h1>
          <p className="text-slate-400 font-medium mt-1">Send and track system alerts, updates, and messages to users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECTION 1: Compose Notification */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MdSend className="text-blue-400" /> Send Notification
          </h2>
          
          <form onSubmit={handleSendNotification} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification Title"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notification message..."
                rows="4"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium resize-none"
              ></textarea>
            </div>

            <div ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Users</label>
              
              {/* Custom Select Trigger */}
              <div className="relative">
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-4 py-3 bg-black/20 border ${isDropdownOpen ? 'border-blue-500/50 bg-black/40 ring-2 ring-blue-500/50' : 'border-white/10'} rounded-xl shadow-inner backdrop-blur-md text-white transition-all text-sm font-medium capitalize flex justify-between items-center cursor-pointer select-none`}
                >
                  {targetType}
                  <MdKeyboardArrowDown className={`text-xl text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </div>

                {/* Custom Select Options Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    {['All Users', 'Single User', 'Selected Users'].map((type) => (
                      <div
                        key={type}
                        onClick={() => { setTargetType(type); setIsDropdownOpen(false); }}
                        className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${targetType === type ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {targetType !== 'All Users' && (
                <input
                  type="text"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  placeholder={targetType === 'Single User' ? "Enter User Name" : "Enter Users Names (comma separated)"}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/40 shadow-inner backdrop-blur-md text-white placeholder-slate-500 transition-all text-sm font-medium mt-3"
                />
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600/50 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <MdSend /> Send Message
            </button>
          </form>
        </div>

        {/* SECTION 2: Notification History */}
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 sm:p-8 flex flex-col max-h-[85vh]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 shrink-0">
            <MdHistory className="text-blue-400" /> Notification History
          </h2>
          
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {history.length === 0 ? (
              <p className="text-slate-400 italic text-center py-12">No notifications sent yet.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-5 border border-white/10 rounded-2xl bg-transparent hover:bg-white/10 transition-all relative group">
                  <div className="pr-8">
                    <h3 className="font-bold text-white tracking-tight">{item.title}</h3>
                    <p className="text-sm text-slate-300 mt-1.5">{item.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-400 font-medium">
                      <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md capitalize font-bold tracking-wide">
                        To: {item.targetType} {item.targetUsers && `(${item.targetUsers})`}
                      </span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete Notification"
                  >
                    <MdDelete size={20} />
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

export default Notifications;