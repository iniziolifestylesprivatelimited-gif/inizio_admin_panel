import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { 
  FiLogOut, FiMenu, FiX, FiUser,
  FiBell, FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { getAccessibleMenus } from '../config/menus';
import HeaderSearch from './HeaderSearch';
import logoImg from '../assets/logos.png';
import { api } from '../api/axios';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const notificationsDropdownRef = useRef(null);
  const mobileNotificationsDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const mobileProfileDropdownRef = useRef(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [ordersUnreadCount, setOrdersUnreadCount] = useState(0);
  const [usersUnreadCount, setUsersUnreadCount] = useState(0);
  const [usersVerifyUnreadCount, setUsersVerifyUnreadCount] = useState(0);
  const [usersDeletionUnreadCount, setUsersDeletionUnreadCount] = useState(0);
  const navigation = useNavigate();
  const prevContactsRef = useRef([]);
  const isInitialLoad = useRef(true);
  const prevOrdersRef = useRef(null);
  const prevUsersRef = useRef(null);
  const prevPendingRef = useRef(null);
  const prevDeletionRef = useRef(null);
  const isInitialDataLoad = useRef(true);
  const [toastMsg, setToastMsg] = useState(null);

  const handleNotificationClick = (path) => {
    setIsNotificationsDropdownOpen(false);
    navigation(path);
  };

  const toggleSubMenu = (menuName) => {
    setOpenMenus(prev => {
      if (prev[menuName]) return {}; // Close if it's already open
      return { [menuName]: true }; // Open this menu, implicitly closing others
    });
  };

  // Close mobile menu automatically when a route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setIsNotificationsDropdownOpen(false);
  }, [location.pathname]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationsDropdownRef.current && 
        !notificationsDropdownRef.current.contains(event.target) &&
        (!mobileNotificationsDropdownRef.current || !mobileNotificationsDropdownRef.current.contains(event.target))
      ) {
        setIsNotificationsDropdownOpen(false);
      }
      if (
        profileDropdownRef.current && 
        !profileDropdownRef.current.contains(event.target) &&
        (!mobileProfileDropdownRef.current || !mobileProfileDropdownRef.current.contains(event.target))
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getNotificationsList = () => {
    const list = [];
    if (chatUnreadCount > 0) {
      list.push({
        id: 'chat',
        title: 'New Chat Messages',
        description: `You have ${chatUnreadCount} unread message${chatUnreadCount > 1 ? 's' : ''} from customers.`,
        path: '/chat',
        icon: '💬',
        color: 'text-blue-400 bg-blue-500/10'
      });
    }
    if (ordersUnreadCount > 0) {
      list.push({
        id: 'orders',
        title: 'New Orders Received',
        description: `You have ${ordersUnreadCount} new order${ordersUnreadCount > 1 ? 's' : ''} to process.`,
        path: '/orders/all',
        icon: '📦',
        color: 'text-emerald-400 bg-emerald-500/10'
      });
    }
    if (usersVerifyUnreadCount > 0) {
      list.push({
        id: 'verify',
        title: 'Pending Verifications',
        description: `${usersVerifyUnreadCount} user${usersVerifyUnreadCount > 1 ? 's are' : ' is'} pending verification.`,
        path: '/users/verify',
        icon: '👤',
        color: 'text-amber-400 bg-amber-500/10'
      });
    }
    if (usersDeletionUnreadCount > 0) {
      list.push({
        id: 'deletion',
        title: 'Deletion Requests',
        description: `${usersDeletionUnreadCount} account deletion request${usersDeletionUnreadCount > 1 ? 's' : ''} pending.`,
        path: '/users/deletion-requests',
        icon: '⚠️',
        color: 'text-red-400 bg-red-500/10'
      });
    }
    if (usersUnreadCount > 0) {
      list.push({
        id: 'users',
        title: 'New User Registrations',
        description: `${usersUnreadCount} new user${usersUnreadCount > 1 ? 's' : ''} registered recently.`,
        path: '/users/list',
        icon: '👥',
        color: 'text-indigo-400 bg-indigo-500/10'
      });
    }
    return list;
  };

  const notificationsList = getNotificationsList();
  const totalUnreadCount = chatUnreadCount + ordersUnreadCount + usersUnreadCount + usersVerifyUnreadCount + usersDeletionUnreadCount;

  // Request Browser Notification Permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll chat unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const token = sessionStorage.getItem('accessToken');
        const response = await api.get('/chat/users/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contacts = Array.isArray(response.data) ? response.data : [];

        // Check for new messages to trigger device notifications
        contacts.forEach(contact => {
          const prevContact = prevContactsRef.current.find(c => c.userId === contact.userId);
          const prevUnread = prevContact ? (Number(prevContact.unreadCount) || 0) : 0;
          const currentUnread = Number(contact.unreadCount) || 0;

          if (!isInitialLoad.current && currentUnread > prevUnread) {
            // 1. Vibrate & Play Sound (Supported across most mobile browsers)
            try {
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
              const AudioContext = window.AudioContext || window.webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
                osc.stop(ctx.currentTime + 0.5);
              }
            } catch (err) {
              console.log('Audio/Vibration failed', err);
            }

            const isNotOnChatPage = !window.location.pathname.includes('/chat');
            
            // 2. In-App Toast
            if (isNotOnChatPage) {
              setToastMsg(`New message from ${contact.name || 'Customer'}`);
              setTimeout(() => setToastMsg(null), 5000);
            }

            // 3. System Push Notification (Desktop / Supported Browsers)
            if ('Notification' in window && Notification.permission === 'granted' && (document.hidden || isNotOnChatPage)) {
              try {
                const notification = new Notification(`New message from ${contact.name || 'Customer'}`, {
                  body: contact.lastMessage || 'You received a new message.',
                  icon: logoImg
                });
                
                notification.onclick = () => {
                  window.focus();
                  navigation('/chat');
                };
              } catch (e) {
                console.log('System notification failed (often requires ServiceWorker on mobile):', e);
              }
            }
          }
        });
        
        prevContactsRef.current = contacts;
        isInitialLoad.current = false;

        const totalUnread = contacts.reduce((sum, contact) => sum + (Number(contact.unreadCount) || 0), 0);
        setChatUnreadCount(totalUnread);
      } catch (error) {
        console.error("Failed to fetch unread messages count", error);
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(intervalId);
  }, [user]);

  // Clear counts when visiting the page
  useEffect(() => {
    if (location.pathname.startsWith('/orders')) {
      setOrdersUnreadCount(0);
    }
    if (location.pathname === '/users/list') {
      setUsersUnreadCount(0);
    }
    if (location.pathname === '/users/verify') {
      setUsersVerifyUnreadCount(0);
    }
    if (location.pathname === '/users/deletion-requests') {
      setUsersDeletionUnreadCount(0);
    }
  }, [location.pathname]);

  // Poll orders and users
  useEffect(() => {
    const fetchOrdersAndUsers = async () => {
      if (!user) return;
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        const [ordersRes, usersRes, pendingRes, deletionRes] = await Promise.all([
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/pending', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/deletion-requests', { headers }).catch(() => ({ data: [] }))
        ]);

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.orders || [];
        const users = Array.isArray(usersRes.data) ? usersRes.data : [];
        const pendingUsers = Array.isArray(pendingRes.data) 
          ? pendingRes.data 
          : pendingRes.data?.pending || pendingRes.data?.users || pendingRes.data?.data || [];

        const deletionsData = deletionRes.data;
        let deletionUsers = [];
        if (Array.isArray(deletionsData)) {
          deletionUsers = deletionsData;
        } else if (deletionsData && typeof deletionsData === 'object') {
          deletionUsers = deletionsData.users || deletionsData.data || [];
        }

        if (!isInitialDataLoad.current) {
           const prevOrdersCount = prevOrdersRef.current?.length || 0;
           const currentOrdersCount = orders.length;
           if (currentOrdersCount > prevOrdersCount && !location.pathname.startsWith('/orders')) {
             setOrdersUnreadCount(prev => prev + (currentOrdersCount - prevOrdersCount));
           }

           const prevUsersCount = prevUsersRef.current?.length || 0;
           const currentUsersCount = users.length;
           if (currentUsersCount > prevUsersCount && location.pathname !== '/users/list') {
             setUsersUnreadCount(prev => prev + (currentUsersCount - prevUsersCount));
           }

           const prevPendingCount = prevPendingRef.current?.length || 0;
           const currentPendingCount = pendingUsers.length;
           if (currentPendingCount > prevPendingCount && location.pathname !== '/users/verify') {
             setUsersVerifyUnreadCount(prev => prev + (currentPendingCount - prevPendingCount));
           }

           const prevDeletionCount = prevDeletionRef.current?.length || 0;
           const currentDeletionCount = deletionUsers.length;
           if (currentDeletionCount > prevDeletionCount && location.pathname !== '/users/deletion-requests') {
             setUsersDeletionUnreadCount(prev => prev + (currentDeletionCount - prevDeletionCount));
           }
        }

        prevOrdersRef.current = orders;
        prevUsersRef.current = users;
        prevPendingRef.current = pendingUsers;
        prevDeletionRef.current = deletionUsers;
        isInitialDataLoad.current = false;

      } catch (error) {
        console.error("Failed to fetch orders or users", error);
      }
    };

    fetchOrdersAndUsers();
    const intervalId = setInterval(fetchOrdersAndUsers, 10000);
    return () => clearInterval(intervalId);
  }, [user, location.pathname]);

  // Update browser tab title with total unread notification counts
  useEffect(() => {
    const totalNotifications = chatUnreadCount + ordersUnreadCount + usersUnreadCount + usersVerifyUnreadCount + usersDeletionUnreadCount;
    if (totalNotifications > 0) {
      document.title = `(${totalNotifications}) Inizio`;
    } else {
      document.title = 'Inizio';
    }
  }, [chatUnreadCount, ordersUnreadCount, usersUnreadCount, usersVerifyUnreadCount, usersDeletionUnreadCount]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getBadgeCount = (path) => {
    if (path === '/chat') return chatUnreadCount;
    if (path === '/orders' || path === '/orders/all') return ordersUnreadCount;
    if (path === '/users/list') return usersUnreadCount;
    if (path === '/users/verify') return usersVerifyUnreadCount;
    if (path === '/users/deletion-requests') return usersDeletionUnreadCount;
    return 0;
  };

  const userMenus = getAccessibleMenus();

  return (
    <div className="flex h-dvh bg-linear-to-br from-black via-slate-950 to-blue-950 font-sans overflow-hidden text-slate-300 relative z-0">
      
      {/* Global Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 transform-gpu">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 transform-gpu"></div>
        {/* <div className="absolute bottom-[-10%] right-[-5%] w-120 h-120 bg-blue-600/50 rounded-full mix-blend-screen filter blur-[120px] opacity-50 transform-gpu"></div> */}
      </div>

      {/* Custom In-App Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4">
          <div 
            onClick={() => { navigation('/chat'); setToastMsg(null); }}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl shadow-blue-600/50 flex items-center gap-3 cursor-pointer border border-blue-500/50"
          >
            <FiBell className="text-xl animate-bounce" />
            <span className="font-bold text-sm whitespace-nowrap">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* MOBILE TOP BAR (Visible only on small screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-transparent backdrop-blur-2xl border-b border-white/10 z-30 flex items-center justify-between px-4 shadow-xl shadow-black/50">
        <img src={logoImg} alt="logo" className="h-14 w-auto object-contain scale-200 origin-left mt-1.5" />
        <div className="flex items-center gap-4">
          {/* Mobile Notifications Dropdown */}
          <div className="relative" ref={mobileNotificationsDropdownRef}>
            <button 
              onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
              className="text-slate-300 hover:text-white relative transition-colors mt-1 focus:outline-none"
            >
              <FiBell className="text-xl cursor-pointer" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-slate-900 shadow-sm animate-pulse">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </button>

            {isNotificationsDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">System Notifications</span>
                  {totalUnreadCount > 0 && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                      {totalUnreadCount}
                    </span>
                  )}
                </div>
                
                <div className="max-h-60 overflow-y-auto divide-y divide-white/5 no-scrollbar">
                  {notificationsList.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      <FiBell className="mx-auto text-xl mb-1 text-slate-600 animate-bounce" />
                      <p className="font-semibold text-white">All caught up!</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">No new system updates.</p>
                    </div>
                  ) : (
                    notificationsList.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.path)}
                        className="flex items-start gap-2.5 p-2.5 hover:bg-white/5 transition-all cursor-pointer group"
                      >
                        <div className={`p-1.5 rounded-lg text-sm shrink-0 ${notif.color}`}>
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors">
                            {notif.title}
                          </p>
                          <p className="text-[9px] text-slate-400 leading-normal line-clamp-2">
                            {notif.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Profile Dropdown */}
          <div className="relative" ref={mobileProfileDropdownRef}>
            <div 
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner cursor-pointer"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-white/10 mb-1">
                  <p className="text-sm font-semibold text-white line-clamp-1">{user.email || 'User'}</p>
                <p className="text-xs text-slate-400 capitalize">Administrator</p>
                </div>
                <Link 
                  to="/profile" 
                  className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <FiUser className="mr-2" /> Profile
                </Link>
                <button 
                  onClick={logout}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <FiLogOut className="mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-slate-300 hover:text-white focus:outline-none transition-colors"
          >
            <FiMenu className="text-2xl" />
          </button>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-transparent backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl shadow-black/50 lg:shadow-none
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 overflow-hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 transform-gpu">
          <div className="absolute top-[10%] left-[-20%] w-64 h-64 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-60 transform-gpu"></div>
          <div className="absolute bottom-[20%] right-[-20%] w-72 h-72 bg-blue-600/50 rounded-full mix-blend-screen filter blur-[100px] opacity-50 transform-gpu"></div>
        </div>

        <div className="h-16 flex items-center justify-center px-6 border-b border-white/10 bg-transparent shrink-0">
          <img src={logoImg} alt="logo" className="h-14 w-auto object-contain scale-200 mt-1.5" />
          <button 
            className="lg:hidden text-slate-400 hover:text-red-400"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiX className="text-2xl" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
          <p className="px-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            MAIN MENU
          </p>
          
          {userMenus.map((menu) => {
            
            if (!menu) return null;
            const Icon = menu.icon;
            
            // IF THIS MENU HAS SUB-MENUS (Dropdown Logic)
            if (menu.subMenus) {
              const isOpen = openMenus[menu.name];
              // Check if any sub-menu is the currently active page so we can highlight the parent
              const isChildActive = menu.subMenus.some(sub => location.pathname === sub.path);
              const parentBadgeCount = menu.subMenus.reduce((sum, sub) => sum + getBadgeCount(sub.path), 0);

              return (
                <div key={menu.name} className="space-y-1">
                  {/* Parent Toggle Button */}
                  <button 
                    onClick={() => toggleSubMenu(menu.name)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                      ${isChildActive && !isOpen ? 'bg-blue-600/20 text-blue-500' : 'text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center">
                      {Icon && <Icon className="text-lg mr-3 group-hover:scale-110 transition-transform" />}
                      <span className="font-medium text-sm">{menu.name}</span>
                    </div>
                    <div className="flex items-center">
                      {!isOpen && parentBadgeCount > 0 && (
                        <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
                          {parentBadgeCount > 9 ? '9+' : parentBadgeCount}
                        </span>
                      )}
                      <FiChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-blue-500' : 'text-slate-500'}`} />
                    </div>
                  </button>

                  {/* Collapsible Sub-Menus */}
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-11 pr-2 py-1 space-y-1">
                      {menu.subMenus.map((sub) => {
                        const isSubActive = location.pathname === sub.path;
                        const SubIcon = sub.icon;
                        const badgeCount = getBadgeCount(sub.path);
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                              flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isSubActive 
                                ? 'bg-blue-600/20 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                              }
                            `}
                          >
                            <div className="flex items-center">
                              {SubIcon && <SubIcon className="text-base mr-3" />}
                              <span>{sub.name}</span>
                            </div>
                            {badgeCount > 0 && (
                              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
                                {badgeCount > 9 ? '9+' : badgeCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // IF THIS IS A STANDARD FLAT LINK
            const isActive = location.pathname === menu.path;
            const badgeCount = getBadgeCount(menu.path);
            
            return (
              <Link 
                key={menu.path} 
                to={menu.path} 
                onClick={() => {
                  setOpenMenus({});
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-blue-600/20 text-blue-500 shadow-sm border border-blue-600/50' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                  }
                `}
              >
                <div className="flex items-center">
                  {Icon && <Icon className={`text-lg mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />}
                  <span className="font-medium text-sm">{menu.name}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER (Includes Header, Content, Footer) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative pt-16 lg:pt-0">
        
        {/* GLOBAL HEADER (Desktop Top Bar) */}
        <header className="hidden lg:flex h-16 bg-transparent backdrop-blur-2xl border-b border-white/10 shadow-sm shadow-black/50 items-center justify-between px-8 sticky top-0 z-20">
          
          {/* Left Side: Global Search */}
          <HeaderSearch />

          {/* Right Side: Profile & Notifications */}
          <div className="flex items-center space-x-6">
            {/* Desktop Notifications Dropdown */}
            <div className="relative" ref={notificationsDropdownRef}>
              <button 
                onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
                className="text-slate-400 hover:text-blue-500 relative transition-colors mt-1 focus:outline-none"
              >
                <FiBell className="text-xl cursor-pointer" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </button>

              {isNotificationsDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2.5 border-b border-white/10 flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">System Notifications</span>
                    {totalUnreadCount > 0 && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                        {totalUnreadCount} New
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5 no-scrollbar">
                    {notificationsList.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        <FiBell className="mx-auto text-2xl mb-2 text-slate-600 animate-bounce" />
                        <p className="font-semibold text-white">All caught up!</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">No new system updates.</p>
                      </div>
                    ) : (
                      notificationsList.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif.path)}
                          className="flex items-start gap-3 p-3 hover:bg-white/5 transition-all cursor-pointer group"
                        >
                          <div className={`p-2 rounded-xl text-base shrink-0 ${notif.color}`}>
                            {notif.icon}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                              {notif.description}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-8 w-px bg-white/10"></div>
 
            {/* Profile Dropdown Trigger */}
            <div className="relative" ref={profileDropdownRef}>
              <div 
                className="flex items-center cursor-pointer group"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className="text-xs font-bold text-white">Admin Account</p>
                <p className="text-[10px] text-slate-400 uppercase">Administrator</p>
                </div>
                <FiChevronDown className="ml-2 text-slate-400 group-hover:text-white transition-colors" />
              </div>
 
              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-semibold text-white line-clamp-1">{user.email || 'User'}</p>
                  <p className="text-xs text-slate-400 capitalize">Administrator</p>
                  </div>
                  <Link 
                    to="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <FiUser className="mr-2" /> Profile
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <FiLogOut className="mr-2" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 min-h-full">
            <Outlet context={{ setChatUnreadCount, setOrdersUnreadCount, setUsersUnreadCount, setUsersVerifyUnreadCount, setUsersDeletionUnreadCount }} />
          </div>
        </main>

        {/* GLOBAL FOOTER */}
        <footer className="bg-transparent backdrop-blur-2xl border-t border-white/10 shadow-lg shadow-black/50 py-4 px-8 mt-auto z-10 relative">
          <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} Inizio Workspace. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-2 md:mt-0">
              <Link to="/help" className="hover:text-blue-500 transition-colors">Help Center</Link>
              <Link to="/privacy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
              <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded-md border border-white/10">
                v1.2.0
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Layout;