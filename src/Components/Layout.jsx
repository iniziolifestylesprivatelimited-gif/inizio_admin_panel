import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import {
  FiLogOut, FiMenu, FiX, FiUser,
  FiBell, FiBellOff, FiChevronDown, FiChevronRight,
  FiMessageSquare, FiPackage, FiUserPlus, FiClock, FiAlertTriangle, FiFileText,
  FiCheckCircle, FiVolume2, FiShield, FiArrowUp, FiSettings
} from 'react-icons/fi';
import { getAccessibleMenus } from '../config/menus';
import HeaderSearch from './HeaderSearch';
import logoImg from '../assets/logos.png';
import appIconImg from '../assets/app-icon-png.png';
import { api, BASE_URL } from '../api/axios';
import { isRouteAllowed } from '../utils/rbac';
import {
  isBrowserNotificationSupported,
  getNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  playNotificationSound,
  getNotificationSettings,
  saveNotificationSettings,
  isBrowserAlertsEnabled,
  isToastAlertsEnabled
} from '../utils/browserNotifications';

const Layout = () => {
  const { user, logout, userPermissions } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  const isChatRoute = location.pathname.startsWith('/chat');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const checkScrollState = () => {
    if (isChatRoute) {
      if (showScrollTop) setShowScrollTop(false);
      return;
    }

    const mainTop = mainRef.current ? mainRef.current.scrollTop : 0;
    const winTop = window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
    let anyContainerTop = 0;

    // Only inspect scrollable containers within the main content area (excluding the sidebar menu)
    if (mainRef.current) {
      const scrollables = mainRef.current.querySelectorAll('.overflow-y-auto, .overflow-auto, .custom-scrollbar');
      scrollables.forEach(el => {
        if (el && el.scrollTop > anyContainerTop) {
          anyContainerTop = el.scrollTop;
        }
      });
    }

    const currentScroll = Math.max(mainTop, winTop, anyContainerTop);
    setShowScrollTop(currentScroll > 40);
  };

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    setShowScrollTop(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleEvents = (e) => {
      // Ignore scroll/wheel/touch events originating inside the sidebar menu
      if (e && e.target && e.target.closest && e.target.closest('aside')) {
        return;
      }
      checkScrollState();
    };

    window.addEventListener('scroll', handleEvents, { capture: true, passive: true });
    window.addEventListener('wheel', handleEvents, { capture: true, passive: true });
    window.addEventListener('touchmove', handleEvents, { capture: true, passive: true });

    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleEvents, { passive: true });
    }

    // Safety polling every 300ms to guarantee detection in all browser environments
    const intervalId = setInterval(checkScrollState, 300);

    return () => {
      window.removeEventListener('scroll', handleEvents, { capture: true });
      window.removeEventListener('wheel', handleEvents, { capture: true });
      window.removeEventListener('touchmove', handleEvents, { capture: true });
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleEvents);
      }
      clearInterval(intervalId);
    };
  }, [location.pathname]);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      const scrollables = mainRef.current.querySelectorAll('.overflow-y-auto, .overflow-auto, .custom-scrollbar');
      scrollables.forEach(el => {
        if (el && el.scrollTop > 0) {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
  const [quotesUnreadCount, setQuotesUnreadCount] = useState(0);
  const [brokenImagesUnreadCount, setBrokenImagesUnreadCount] = useState(0);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [browserPermission, setBrowserPermission] = useState(() => getNotificationPermission());
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(() => isBrowserAlertsEnabled());
  const navigation = useNavigate();

  // Listen for native browser permission changes, window focus, and in-app settings changes
  useEffect(() => {
    const updatePerm = () => {
      setBrowserPermission(getNotificationPermission());
      setBrowserAlertsEnabled(isBrowserAlertsEnabled());
    };

    updatePerm();
    window.addEventListener('focus', updatePerm);

    const onSettingsChange = (e) => {
      if (e?.detail) {
        setBrowserAlertsEnabled(e.detail.browserAlertsEnabled !== false);
      } else {
        setBrowserAlertsEnabled(isBrowserAlertsEnabled());
      }
    };
    window.addEventListener('inizio:notification-settings-changed', onSettingsChange);

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
      window.removeEventListener('inizio:notification-settings-changed', onSettingsChange);
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  // Also sync permission whenever the notifications dropdown is opened
  useEffect(() => {
    if (isNotificationsDropdownOpen) {
      setBrowserPermission(getNotificationPermission());
      setBrowserAlertsEnabled(isBrowserAlertsEnabled());
    }
  }, [isNotificationsDropdownOpen]);

  const prevContactsRef = useRef([]);
  const isInitialLoad = useRef(true);
  const prevOrdersRef = useRef(null);
  const prevUsersRef = useRef(null);
  const prevPendingRef = useRef(null);
  const prevDeletionRef = useRef(null);
  const prevQuotesRef = useRef(null);
  const prevBrokenImagesRef = useRef(null);
  const isInitialDataLoad = useRef(true);
  const [toasts, setToasts] = useState([]);
  const [failedImageProductNames, setFailedImageProductNames] = useState([]);
  const prevFailedImagesRef = useRef(new Set());
  const recentToastsRef = useRef(new Map());

  const addToast = (title, message, path, IconComponent = FiBell, tag, category) => {
    if (!isToastAlertsEnabled(category)) {
      return;
    }
    const key = `${title}:${message}`;
    const now = Date.now();
    // Prevent identical toast from being triggered within 4 seconds
    if (recentToastsRef.current.has(key) && (now - recentToastsRef.current.get(key) < 4000)) {
      return;
    }
    recentToastsRef.current.set(key, now);

    const id = now + Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      if (prev.some(t => t.title === title && t.message === message)) {
        return prev;
      }
      return [...prev, { id, title, message, path, IconComponent }];
    });

    // If the window/tab is in the background or hidden, trigger native Chrome/OS notification.
    if (document.hidden || !document.hasFocus()) {
      showBrowserNotification({
        title,
        body: message,
        path,
        tag: tag || `inizio-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        category,
        navigate: navigation
      });
    } else {
      playNotificationSound();
    }

    const duration = getNotificationSettings().toastDuration || 6000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const handleRequestBrowserPermission = async () => {
    try {
      const res = await requestBrowserNotificationPermission();
      const current = getNotificationPermission();
      const finalPerm = (res === 'granted' || current === 'granted') ? 'granted' : (res || current);
      setBrowserPermission(finalPerm);
      setShowPermissionBanner(false);

      if (finalPerm === 'granted') {
        saveNotificationSettings({ browserAlertsEnabled: true });
        setBrowserAlertsEnabled(true);
        handleTestBrowserNotification();
      }
    } catch (err) {
      console.error('Error requesting browser notification permission:', err);
      setBrowserPermission(getNotificationPermission());
    }
  };

  const handleTurnOffBrowserAlerts = (e) => {
    e?.stopPropagation?.();
    saveNotificationSettings({ browserAlertsEnabled: false });
    setBrowserAlertsEnabled(false);
  };

  const handleTestBrowserNotification = () => {
    showBrowserNotification({
      title: 'Inizio Admin Test Alert',
      body: 'Browser notifications are working perfectly! You will be alerted when new orders or requests arrive.',
      path: '/orders/all',
      tag: `test-alert-${Date.now()}`,
      navigate: navigation
    });
  };

  const handleNotificationClick = (path, id) => {
    setIsNotificationsDropdownOpen(false);
    dismissNotification(id);
    navigation(path);
  };

  const dismissNotification = (id) => {
    if (id === 'chat') setChatUnreadCount(0);
    if (id === 'orders') setOrdersUnreadCount(0);
    if (id === 'verify') setUsersVerifyUnreadCount(0);
    if (id === 'deletion') setUsersDeletionUnreadCount(0);
    if (id === 'users') setUsersUnreadCount(0);
    if (id === 'quotes') setQuotesUnreadCount(0);
    if (id === 'broken-images') setBrokenImagesUnreadCount(0);
    if (id === 'image-errors') setFailedImageProductNames([]);
  };

  const clearAllNotifications = () => {
    setChatUnreadCount(0);
    setOrdersUnreadCount(0);
    setUsersVerifyUnreadCount(0);
    setUsersDeletionUnreadCount(0);
    setUsersUnreadCount(0);
    setQuotesUnreadCount(0);
    setBrokenImagesUnreadCount(0);
    setFailedImageProductNames([]);
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

  // URL Protection Check
  useEffect(() => {
    if (user) {
      if (user.role !== 'admin' && userPermissions.length === 0) return;
      const currentAccessibleMenus = getAccessibleMenus(userPermissions, user.role);
      const allowed = isRouteAllowed(location.pathname, currentAccessibleMenus, user.role);
      if (!allowed) {
        console.warn(`Access denied to path: ${location.pathname}. Redirecting to dashboard.`);
        navigation('/', { replace: true });
      }
    }
  }, [location.pathname, userPermissions, user]);

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
        icon: <FiMessageSquare />,
        color: 'text-blue-400 bg-blue-500/10'
      });
    }
    if (ordersUnreadCount > 0) {
      list.push({
        id: 'orders',
        title: 'New Orders Received',
        description: `You have ${ordersUnreadCount} new order${ordersUnreadCount > 1 ? 's' : ''} to process.`,
        path: '/orders/all',
        icon: <FiPackage />,
        color: 'text-emerald-400 bg-emerald-500/10'
      });
    }
    if (usersVerifyUnreadCount > 0) {
      list.push({
        id: 'verify',
        title: 'Pending Verifications',
        description: `${usersVerifyUnreadCount} user${usersVerifyUnreadCount > 1 ? 's are' : ' is'} pending verification.`,
        path: '/users/list?tab=pending',
        icon: <FiClock />,
        color: 'text-amber-400 bg-amber-500/10'
      });
    }
    if (usersDeletionUnreadCount > 0) {
      list.push({
        id: 'deletion',
        title: 'Deletion Requests',
        description: `${usersDeletionUnreadCount} account deletion request${usersDeletionUnreadCount > 1 ? 's' : ''} pending.`,
        path: '/users/list?tab=deleted',
        icon: <FiAlertTriangle />,
        color: 'text-red-400 bg-red-500/10'
      });
    }
    if (usersUnreadCount > 0) {
      list.push({
        id: 'users',
        title: 'New User Registrations',
        description: `${usersUnreadCount} new user${usersUnreadCount > 1 ? 's' : ''} registered recently.`,
        path: '/users/list',
        icon: <FiUserPlus />,
        color: 'text-indigo-400 bg-indigo-500/10'
      });
    }
    if (quotesUnreadCount > 0) {
      list.push({
        id: 'quotes',
        title: 'New Quote Requests',
        description: `You have ${quotesUnreadCount} new quote request${quotesUnreadCount > 1 ? 's' : ''} to review.`,
        path: '/quotes',
        icon: <FiFileText />,
        color: 'text-blue-400 bg-blue-500/10'
      });
    }
    if (brokenImagesUnreadCount > 0) {
      list.push({
        id: 'broken-images',
        title: 'Broken Images Detected',
        description: `${brokenImagesUnreadCount} broken image${brokenImagesUnreadCount > 1 ? 's' : ''} reported by the app.`,
        path: '/products/broken-images',
        icon: <FiAlertTriangle />,
        color: 'text-rose-400 bg-rose-500/10'
      });
    }
    if (failedImageProductNames.length > 0) {
      const namesPreview = failedImageProductNames.slice(0, 2).join(', ');
      const totalFailed = failedImageProductNames.length;
      list.push({
        id: 'image-errors',
        title: 'Image Load Failure',
        description: `Failed to load ${totalFailed} product image${totalFailed > 1 ? 's' : ''} (${namesPreview}${totalFailed > 2 ? '...' : ''}). Check WordPress library access.`,
        path: '/products/broken-images',
        icon: <FiAlertTriangle />,
        color: 'text-rose-400 bg-rose-500/10'
      });
    }
    return list;
  };

  const notificationsList = getNotificationsList();
  const totalUnreadCount = chatUnreadCount + ordersUnreadCount + usersUnreadCount + usersVerifyUnreadCount + usersDeletionUnreadCount + quotesUnreadCount + brokenImagesUnreadCount + (failedImageProductNames.length > 0 ? 1 : 0);

  // Request Browser Notification Permission on load / show banner
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowPermissionBanner(true);
    }
  }, []);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Show test notification via service worker
          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification('Inizio Notifications', {
                body: 'Mobile alerts are now active!',
                icon: appIconImg,
                vibrate: [100, 50, 100]
              });
            });
          }
        }
        setShowPermissionBanner(false);
      });
    }
  };

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

            // Trigger In-App Toast (when in view) or Browser Notification (when tab is hidden/backgrounded)
            if (isNotOnChatPage || document.hidden) {
              addToast(
                `New Message`,
                `From ${contact.name || 'Customer'}: ${contact.lastMessage || 'You received a new message.'}`,
                '/chat',
                FiMessageSquare,
                `chat-${contact.userId}`,
                'chat'
              );
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
    const intervalId = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(intervalId);
  }, [user]);

  // Clear counts when visiting the page
  useEffect(() => {
    if (location.pathname.startsWith('/orders')) {
      setOrdersUnreadCount(0);
    }
    if (location.pathname === '/users/list') {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab') || 'approved';
      if (tab === 'pending') {
        setUsersVerifyUnreadCount(0);
      } else if (tab === 'deleted') {
        setUsersDeletionUnreadCount(0);
      } else {
        setUsersUnreadCount(0);
      }
    }
    if (location.pathname === '/quotes') {
      setQuotesUnreadCount(0);
    }
    if (location.pathname === '/products/broken-images') {
      setBrokenImagesUnreadCount(0);
    }
  }, [location.pathname, location.search]);

  // Poll orders, users, and broken images
  useEffect(() => {
    const fetchOrdersAndUsers = async () => {
      if (!user) return;
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = { Authorization: `Bearer ${token}` };

        const [ordersRes, usersRes, pendingRes, deletionRes, quotesRes, brokenImagesRes] = await Promise.all([
          api.get('/orders/all', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/customers', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/pending', { headers }).catch(() => ({ data: [] })),
          api.get('/admin/deletion-requests', { headers }).catch(() => ({ data: [] })),
          api.get('/quotes/admin/all', { headers }).catch(() => ({ data: [] })),
          api.get('/analytics/admin/broken-images?status=PENDING', { headers }).catch(() => ({ data: [] }))
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

        const quotesData = quotesRes.data;
        let quotes = [];
        if (Array.isArray(quotesData)) {
          quotes = quotesData;
        } else if (quotesData && typeof quotesData === 'object') {
          quotes = quotesData.quotes || quotesData.data || [];
        }

        const brokenData = brokenImagesRes.data;
        let pendingBrokenLogs = [];
        if (Array.isArray(brokenData?.logs)) {
          pendingBrokenLogs = brokenData.logs.filter(i => (i.status || 'PENDING').toUpperCase() === 'PENDING');
        } else if (Array.isArray(brokenData)) {
          pendingBrokenLogs = brokenData.filter(i => (i.status || 'PENDING').toUpperCase() === 'PENDING');
        } else if (Array.isArray(brokenData?.brokenImages)) {
          pendingBrokenLogs = brokenData.brokenImages.filter(i => (i.status || 'PENDING').toUpperCase() === 'PENDING');
        }

        if (location.pathname !== '/products/broken-images') {
          setBrokenImagesUnreadCount(pendingBrokenLogs.length);
        }

        if (!isInitialDataLoad.current) {
          const prevOrdersCount = prevOrdersRef.current?.length || 0;
          const currentOrdersCount = orders.length;
          if (currentOrdersCount > prevOrdersCount && !location.pathname.startsWith('/orders')) {
            const countDiff = currentOrdersCount - prevOrdersCount;
            setOrdersUnreadCount(prev => prev + countDiff);
            addToast(
              `New Order Received`,
              `You have received ${countDiff} new order${countDiff > 1 ? 's' : ''} to process.`,
              '/orders/all',
              FiPackage,
              'orders',
              'orders'
            );
          }

          const prevUsersCount = prevUsersRef.current?.length || 0;
          const currentUsersCount = users.length;
          if (currentUsersCount > prevUsersCount && location.pathname !== '/users/list') {
            const countDiff = currentUsersCount - prevUsersCount;
            setUsersUnreadCount(prev => prev + countDiff);
            addToast(
              `New Registration`,
              `${countDiff} new user${countDiff > 1 ? 's' : ''} registered recently.`,
              '/users/list',
              FiUserPlus,
              'users',
              'users'
            );
          }

          const prevPendingCount = prevPendingRef.current?.length || 0;
          const currentPendingCount = pendingUsers.length;
          const isAtPendingTab = location.pathname === '/users/list' && new URLSearchParams(location.search).get('tab') === 'pending';
          if (currentPendingCount > prevPendingCount && !isAtPendingTab) {
            const countDiff = currentPendingCount - prevPendingCount;
            setUsersVerifyUnreadCount(prev => prev + countDiff);
            addToast(
              `Pending Verification`,
              `${countDiff} user${countDiff > 1 ? 's' : ''} pending verification.`,
              '/users/list?tab=pending',
              FiClock,
              'verify',
              'users'
            );
          }

          const prevDeletionCount = prevDeletionRef.current?.length || 0;
          const currentDeletionCount = deletionUsers.length;
          const isAtDeletionTab = location.pathname === '/users/list' && new URLSearchParams(location.search).get('tab') === 'deleted';
          if (currentDeletionCount > prevDeletionCount && !isAtDeletionTab) {
            const countDiff = currentDeletionCount - prevDeletionCount;
            setUsersDeletionUnreadCount(prev => prev + countDiff);
            addToast(
              `Account Deletion Request`,
              `${countDiff} account deletion request${countDiff > 1 ? 's' : ''} pending.`,
              '/users/list?tab=deleted',
              FiAlertTriangle,
              'deletion',
              'users'
            );
          }

          const prevQuotesCount = prevQuotesRef.current?.length || 0;
          const currentQuotesCount = quotes.length;
          if (currentQuotesCount > prevQuotesCount && location.pathname !== '/quotes') {
            const countDiff = currentQuotesCount - prevQuotesCount;
            setQuotesUnreadCount(prev => prev + countDiff);
            addToast(
              `New Quote Request`,
              `You have received ${countDiff} new quote request${countDiff > 1 ? 's' : ''} to review.`,
              '/quotes',
              FiFileText,
              'quotes',
              'quotes'
            );
          }

          const prevBrokenCount = prevBrokenImagesRef.current?.length || 0;
          const currentBrokenCount = pendingBrokenLogs.length;
          if (currentBrokenCount > prevBrokenCount && location.pathname !== '/products/broken-images') {
            const countDiff = currentBrokenCount - prevBrokenCount;
            addToast(
              `Broken Image Alert`,
              `${countDiff} new broken image${countDiff > 1 ? 's' : ''} reported by the app.`,
              '/products/list',
              FiAlertTriangle,
              'broken-images',
              'brokenImages'
            );
          }
        }

        prevOrdersRef.current = orders;
        prevUsersRef.current = users;
        prevPendingRef.current = pendingUsers;
        prevDeletionRef.current = deletionUsers;
        prevQuotesRef.current = quotes;
        prevBrokenImagesRef.current = pendingBrokenLogs;
        isInitialDataLoad.current = false;

      } catch (error) {
        console.error("Failed to fetch orders or users", error);
      }
    };

    fetchOrdersAndUsers();
    const intervalId = setInterval(fetchOrdersAndUsers, 30000);
    return () => clearInterval(intervalId);
  }, [user, location.pathname]);

  // Update browser tab title with total unread notification counts
  useEffect(() => {
    const totalNotifications = chatUnreadCount + ordersUnreadCount + usersUnreadCount + usersVerifyUnreadCount + usersDeletionUnreadCount + quotesUnreadCount + brokenImagesUnreadCount + (failedImageProductNames.length > 0 ? 1 : 0);
    if (totalNotifications > 0) {
      document.title = `(${totalNotifications}) Inizio`;
    } else {
      document.title = 'Inizio';
    }
  }, [chatUnreadCount, ordersUnreadCount, usersUnreadCount, usersVerifyUnreadCount, usersDeletionUnreadCount, quotesUnreadCount, brokenImagesUnreadCount, failedImageProductNames]);

  // Global event listener for image load failures
  useEffect(() => {
    const handleImageErrorEvent = (e) => {
      const productName = e.detail.name || 'Product';
      setFailedImageProductNames(prev => {
        if (prev.includes(productName)) return prev;
        return [...prev, productName];
      });
      addToast(
        "Image Load Failed",
        `Failed to load product image for: ${productName}. Please check WordPress library access.`,
        "/products/list",
        FiAlertTriangle
      );
    };
    window.addEventListener('product-image-error', handleImageErrorEvent);
    return () => window.removeEventListener('product-image-error', handleImageErrorEvent);
  }, []);

  // Helper to format image URLs
  const formatImageUrl = (path) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('//')) return path;
    const cleanPath = path.replace(/\\/g, '/');
    return `${BASE_URL}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  // Poll product images every 30 seconds to check for loading failures proactively
  useEffect(() => {
    let isMounted = true;
    let timeoutId;
    let intervalId;

    const checkProductImages = async () => {
      if (!user) return;
      try {
        const token = sessionStorage.getItem('accessToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${BASE_URL}/api/products/?t=${Date.now()}`, { headers });
        const products = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        if (!products.length) return;

        const activeProducts = products.filter(p => p.isActive !== false);
        const failedProducts = [];

        // Collect all images from main product or variants
        const imagesToTest = [];
        activeProducts.forEach(product => {
          const prodName = product.name || 'Product';

          // 1. Main product images
          if (Array.isArray(product.images) && product.images.length > 0) {
            product.images.forEach(img => {
              if (typeof img === 'string' && img.trim()) {
                imagesToTest.push({ productName: prodName, url: formatImageUrl(img.trim()) });
              }
            });
          } else if (typeof product.images === 'string' && product.images.trim()) {
            product.images.split(',').forEach(img => {
              if (img.trim()) {
                imagesToTest.push({ productName: prodName, url: formatImageUrl(img.trim()) });
              }
            });
          }

          // 2. Variant images
          if (Array.isArray(product.variants)) {
            product.variants.forEach(v => {
              if (Array.isArray(v.images)) {
                v.images.forEach(img => {
                  if (typeof img === 'string' && img.trim()) {
                    imagesToTest.push({ productName: prodName, url: formatImageUrl(img.trim()) });
                  }
                });
              } else if (typeof v.images === 'string' && v.images.trim()) {
                v.images.split(',').forEach(img => {
                  if (img.trim()) {
                    imagesToTest.push({ productName: prodName, url: formatImageUrl(img.trim()) });
                  }
                });
              }
            });
          }
        });

        // Deduplicate URLs so each unique image URL is tested once
        const uniqueImageMap = new Map();
        imagesToTest.forEach(item => {
          if (item.url && !uniqueImageMap.has(item.url)) {
            uniqueImageMap.set(item.url, item.productName);
          }
        });

        const uniqueItems = Array.from(uniqueImageMap.entries()).map(([url, productName]) => ({ url, productName }));
        if (uniqueItems.length === 0) return;

        // Test in parallel batches of 15 to avoid browser network connection saturation
        const BATCH_SIZE = 15;
        for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
          if (!isMounted) return;
          const batch = uniqueItems.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(({ productName, url }) => {
              return new Promise((resolve) => {
                const img = new Image();
                let hasResolved = false;

                // Generous 20s timeout so slow or large WordPress images have ample time to load
                const timer = setTimeout(() => {
                  if (!hasResolved) {
                    hasResolved = true;
                    img.src = '';
                    resolve({ failed: true, productName });
                  }
                }, 30000);

                img.onload = () => {
                  if (!hasResolved) {
                    hasResolved = true;
                    clearTimeout(timer);
                    resolve({ failed: false, productName });
                  }
                };

                img.onerror = () => {
                  if (!hasResolved) {
                    hasResolved = true;
                    clearTimeout(timer);
                    resolve({ failed: true, productName });
                  }
                };

                img.src = url;
              });
            })
          );

          results.forEach(res => {
            if (res.failed) {
              failedProducts.push(res.productName);
            }
          });
        }

        if (isMounted) {
          const uniqueFailed = Array.from(new Set(failedProducts));
          const prevSet = prevFailedImagesRef.current;
          const newlyAdded = uniqueFailed.filter(name => !prevSet.has(name));

          // Only trigger toast if there are newly discovered broken images
          if (newlyAdded.length > 0) {
            newlyAdded.forEach(name => prevSet.add(name));
            const namesPreview = newlyAdded.slice(0, 2).join(', ');
            const totalFailed = newlyAdded.length;
            addToast(
              "Image Load Alert",
              `Failed to load ${totalFailed} product image(s) (${namesPreview}${totalFailed > 2 ? '...' : ''}). Check your WordPress library access.`,
              "/products/list",
              FiAlertTriangle
            );
          }

          setFailedImageProductNames(uniqueFailed);
        }
      } catch (error) {
        console.error("Failed to poll product images status", error);
      }
    };

    // Run first check after 2s, then recurring every 15 minutes
    timeoutId = setTimeout(checkProductImages, 2000);
    intervalId = setInterval(checkProductImages, 3 * 60 * 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getBadgeCount = (path) => {
    if (path === '/chat') return chatUnreadCount;
    if (path === '/orders' || path === '/orders/all') return ordersUnreadCount;
    if (path === '/users/list') return usersUnreadCount + usersVerifyUnreadCount + usersDeletionUnreadCount;
    if (path === '/quotes') return quotesUnreadCount;
    if (path === '/products/broken-images') return brokenImagesUnreadCount;
    return 0;
  };

  const userMenus = getAccessibleMenus(userPermissions, user?.role);
  const isExpanded = isHovered || isMobileMenuOpen;

  return (
    <div className="flex h-dvh bg-linear-to-br from-black via-slate-950 to-blue-950 font-sans overflow-hidden text-slate-300 relative z-0">

      {/* Global Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 left-10 w-75 h-75 bg-blue-500/30 rounded-full mix-blend-screen filter blur-[80px] opacity-60 transform-gpu animate-glow"></div>
        <div className="absolute bottom-10 right-10 w-75 h-75 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-70 transform-gpu animate-glow-alt" style={{ animationDelay: '-12s' }}></div>
      </div>

      {/* Toast Notification Stack Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-80 max-w-[90%] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              navigation(t.path);
              setToasts(prev => prev.filter(item => item.id !== t.id));
            }}
            className={`flex items-start justify-between gap-4.5 p-4 bg-slate-900 border border-white/10 border-l-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] cursor-pointer hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-in slide-in-from-right-full fade-in text-left group pointer-events-auto select-none ${t.path.startsWith('/chat') ? 'border-l-blue-500 shadow-blue-500/10' :
                t.path.startsWith('/orders') ? 'border-l-emerald-500 shadow-emerald-500/10' :
                  (t.path === '/users/list' || t.path.includes('tab=approved')) ? 'border-l-indigo-500 shadow-indigo-500/10' :
                    t.path.includes('tab=pending') ? 'border-l-amber-500 shadow-amber-500/10' :
                      t.path.includes('tab=deleted') ? 'border-l-rose-500 shadow-rose-500/10' :
                        t.path === '/quotes' ? 'border-l-cyan-500 shadow-cyan-500/10' :
                          'border-l-blue-500 shadow-blue-500/10'
              }`}
          >
            <div className={`p-1 bg-white/5 rounded-xl shrink-0 group-hover:scale-110 transition-transform ${t.path.startsWith('/chat') ? 'text-blue-400' :
                t.path.startsWith('/orders') ? 'text-emerald-400' :
                  (t.path === '/users/list' || t.path.includes('tab=approved')) ? 'text-indigo-400' :
                    t.path.includes('tab=pending') ? 'text-amber-400' :
                      t.path.includes('tab=deleted') ? 'text-rose-400' :
                        t.path === '/quotes' ? 'text-cyan-400' :
                          'text-blue-400'
              }`}>
              <t.IconComponent size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white tracking-wide">{t.title}</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToasts(prev => prev.filter(item => item.id !== t.id));
              }}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <FiX size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Notification Permission Request Banner */}
      {showPermissionBanner && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 w-[90%] max-w-md">
          <div className="bg-slate-900 border border-white/10 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                <FiBell className="text-lg animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Enable Push Notifications</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Stay updated with instant message alerts on mobile.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                Enable
              </button>
              <button
                onClick={() => setShowPermissionBanner(false)}
                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE TOP BAR (Visible only on small screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 z-30 flex items-center justify-between px-4 shadow-xl shadow-black/50">
        <img src={logoImg} alt="logo" className="h-18 w-auto object-contain" />
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
                <div className="px-3.5 py-2 border-b border-white/10 flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">System Notifications</span>
                    {totalUnreadCount > 0 && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.2 rounded-full border border-blue-500/20 shrink-0">
                        {totalUnreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {totalUnreadCount > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[9px] text-slate-400 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                        title="Clear all notifications"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotificationsDropdownOpen(false)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Close"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </div>

                {/* Browser Notification Status Bar */}
                {browserPermission !== 'granted' ? (
                  <div className="mx-3 my-2 p-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FiBell className="text-blue-400 shrink-0" size={13} />
                      <span className="text-[10px] font-bold text-white leading-tight">Desktop Alerts</span>
                    </div>
                    <button
                      onClick={handleRequestBrowserPermission}
                      className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all cursor-pointer shadow-sm shrink-0"
                    >
                      Enable
                    </button>
                  </div>
                ) : (
                  <div className="mx-3 my-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-[9px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Browser Alerts Active
                    </span>
                    <button
                      onClick={handleTestBrowserNotification}
                      className="text-slate-400 hover:text-white font-bold underline transition-colors cursor-pointer"
                    >
                      Test
                    </button>
                  </div>
                )}

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
                        onClick={() => handleNotificationClick(notif.path, notif.id)}
                        className="flex items-start gap-2.5 p-2.5 hover:bg-white/5 transition-all cursor-pointer group relative"
                      >
                        <div className={`p-1.5 rounded-lg text-sm shrink-0 ${notif.color}`}>
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5 pr-5">
                          <p className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors">
                            {notif.title}
                          </p>
                          <p className="text-[9px] text-slate-400 leading-normal line-clamp-2">
                            {notif.description}
                          </p>
                        </div>
                        {/* Dismiss X Button per Item */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notif.id);
                          }}
                          className="absolute right-2 top-2 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                          title="Dismiss notification"
                        >
                          <FiX size={12} />
                        </button>
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

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-50 bg-transparent backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl shadow-black/50
          transform transition-all duration-300 ease-in-out lg:translate-x-0 overflow-hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isExpanded ? 'w-72' : 'lg:w-20 w-72'}
        `}
      >
        {/* Sidebar Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 transform-gpu">
          <div className="absolute top-[10%] left-[-20%] w-64 h-64 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-60 transform-gpu animate-glow"></div>
          <div className="absolute bottom-[20%] right-[-20%] w-72 h-72 bg-blue-600/50 rounded-full mix-blend-screen filter blur-[100px] opacity-50 transform-gpu animate-glow" style={{ animationDelay: '-5s' }}></div>
        </div>

        <div className="h-16 flex items-center justify-center border-b border-white/10 bg-transparent shrink-0 relative overflow-hidden">
          {/* Full Logo (logos.png) */}
          <div className={`absolute transition-all duration-300 ease-in-out flex items-center justify-center ${isExpanded ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-[-12deg] pointer-events-none'
            }`}>
            <Link to="/"><img src={logoImg} alt="logo" className="h-14 w-auto object-contain scale-200 mt-1.5" /></Link>
          </div>

          {/* Collapsed App Icon (app-icon-png.png) */}
          <div className={`absolute transition-all duration-300 ease-in-out flex items-center justify-center ${isExpanded ? 'opacity-0 scale-75 rotate-[12deg] pointer-events-none' : 'opacity-100 scale-100 rotate-0'
            }`}>
            <Link to="/"><img src={appIconImg} alt="logo" className="lg:h-10 lg:w-10 h-14 w-auto object-contain lg:scale-100 scale-200 lg:mt-0 mt-1.5" /></Link>
          </div>

          {/* Mobile Close Button */}
          <button
            className="lg:hidden absolute right-4 p-1.5 text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer hover:bg-white/15"
            onClick={() => setIsMobileMenuOpen(false)}
            title="Close Menu"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-3 overflow-y-auto no-scrollbar space-y-2">
          <p className={`px-2 text-xs font-bold text-slate-600 uppercase tracking-wider transition-all duration-300 opacity-100 mb-4 max-h-8 mt-2`}>
            {isExpanded ? 'MAIN MENU' : 'MENU'}
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
                    title={!isExpanded ? menu.name : undefined}
                    className={`
                      w-full h-12 flex items-center justify-between px-3.5 transition-all duration-200 group rounded-xl relative cursor-pointer
                      ${isChildActive
                        ? 'bg-gradient-to-r from-blue-600/25 to-blue-500/15 text-white font-semibold border border-blue-500/40 shadow-sm shadow-blue-500/10'
                        : isExpanded
                          ? 'text-slate-300 border border-transparent hover:bg-white/[0.02] hover:text-white hover:border-white/10 hover:translate-x-0.5'
                          : 'bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/[0.02] hover:text-white hover:border-white/15 hover:scale-[1.03]'
                      }
                    `}
                  >
                    <div className="flex items-center min-w-0">
                      {Icon && (
                        <Icon
                          className={`shrink-0 transition-all duration-200 
                            ${isChildActive ? 'text-blue-400 scale-110' : 'text-slate-400 group-hover:text-blue-400 group-hover:scale-110'} 
                            ${isExpanded ? 'text-lg' : 'text-base lg:mr-0'}`}
                        />
                      )}
                      <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                        }`}>{menu.name}</span>
                    </div>

                    <div className={`flex items-center shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[50px] ml-2' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                      }`}>
                      {!isOpen && parentBadgeCount > 0 && (
                        <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0 shadow-sm">
                          {parentBadgeCount > 9 ? '9+' : parentBadgeCount}
                        </span>
                      )}
                      <FiChevronRight className={`transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-400' : isChildActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
                    </div>
                  </button>

                  {/* Collapsible Sub-Menus */}
                  {isExpanded && (
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                        }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-10 pr-2 py-1 space-y-1">
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
                                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                                ${isSubActive
                                    ? 'bg-blue-600/25 text-white font-bold border border-blue-500/40 shadow-sm shadow-blue-500/10'
                                    : 'text-slate-400 hover:bg-white/[0.02] border border-transparent hover:border-white/15 hover:text-slate-100 hover:translate-x-1'
                                  }
                              `}
                              >
                                <div className="flex items-center min-w-0">
                                  {SubIcon && (
                                    <SubIcon className={`text-[15px] mr-2.5 shrink-0 transition-colors ${isSubActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                  )}
                                  <span className="truncate">{sub.name}</span>
                                </div>
                                {badgeCount > 0 && (
                                  <span className="ml-2 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shrink-0 shadow-xs">
                                    {badgeCount > 9 ? '9+' : badgeCount}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
                title={!isExpanded ? menu.name : undefined}
                className={`
                  w-full h-12 flex items-center justify-between px-3.5 transition-all duration-200 group rounded-xl relative cursor-pointer
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600/25 to-blue-500/15 text-white font-semibold border border-blue-500/40 shadow-sm shadow-blue-500/10'
                    : isExpanded
                      ? 'text-slate-300 border border-transparent hover:bg-white/[0.02] hover:text-white hover:border-white/10 hover:translate-x-0.5'
                      : 'bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/[0.02] hover:text-white hover:border-white/15 hover:scale-[1.03]'
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  {Icon && (
                    <Icon
                      className={`shrink-0 transition-all duration-200 
                        ${isActive ? 'scale-110 text-blue-400' : 'group-hover:scale-110 text-slate-400 group-hover:text-blue-400'} 
                        ${isExpanded ? 'text-lg' : 'text-base lg:mr-0'}`}
                    />
                  )}
                  <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                    }`}>{menu.name}</span>
                </div>
                {badgeCount > 0 && (
                  <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0 shadow-sm transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[50px] ml-2' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                    }`}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER (Includes Header, Content, Footer) */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden bg-transparent relative pt-16 lg:pt-0 lg:pl-20 transition-all duration-300 ${isExpanded ? 'lg:blur-[2px]' : 'blur-none'}`}>

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">System Notifications</span>
                      {totalUnreadCount > 0 && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                          {totalUnreadCount} New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {totalUnreadCount > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-[10px] text-slate-400 hover:text-rose-400 font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer hover:bg-white/5"
                          title="Clear all notifications"
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationsDropdownOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close popup"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Browser Notification Status Bar */}
                  {browserPermission === 'granted' && browserAlertsEnabled ? (
                    <div className="mx-3 my-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Browser Desktop Alerts Active
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestBrowserNotification}
                          className="text-xs text-slate-400 hover:text-white font-bold underline transition-colors cursor-pointer"
                          title="Send a test notification"
                        >
                          Test
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={handleTurnOffBrowserAlerts}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold hover:underline transition-colors cursor-pointer"
                          title="Turn off desktop alerts"
                        >
                          Turn Off
                        </button>
                      </div>
                    </div>
                  ) : browserPermission === 'denied' ? (
                    <div className="mx-3 my-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                          <FiBellOff size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-rose-300 leading-tight">Notifications Blocked</p>
                          <p className="text-[10px] text-slate-400">Please enable notifications in your browser address bar settings.</p>
                        </div>
                      </div>
                      <Link
                        to="/settings/notifications"
                        onClick={() => setIsNotificationsDropdownOpen(false)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        Settings
                      </Link>
                    </div>
                  ) : (
                    <div className="mx-3 my-2 p-3 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                          <FiBell size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">Desktop Push Alerts</p>
                          <p className="text-[10px] text-slate-400">Get notified for orders & quotes even when tab is in background.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestBrowserPermission}
                        className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                      >
                        Enable Alerts
                      </button>
                    </div>
                  )}

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
                          onClick={() => handleNotificationClick(notif.path, notif.id)}
                          className="flex items-start gap-3 p-3 hover:bg-white/5 transition-all cursor-pointer group relative"
                        >
                          <div className={`p-2 rounded-xl text-base shrink-0 ${notif.color}`}>
                            {notif.icon}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5 pr-6">
                            <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                              {notif.description}
                            </p>
                          </div>
                          {/* Dismiss X Button per Item */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                            }}
                            className="absolute right-2.5 top-3 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer opacity-80 hover:opacity-100"
                            title="Dismiss notification"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown footer link to notification settings */}
                  <div className="px-3.5 py-2 border-t border-white/5 bg-slate-950/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Alert preferences</span>
                    <Link
                      to="/settings/notifications"
                      onClick={() => setIsNotificationsDropdownOpen(false)}
                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline transition-colors"
                    >
                      <FiSettings size={11} /> Settings
                    </Link>
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
                <div className="absolute right-0 mt-3 w-48 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
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

        {/* Browser Notification Permission Top Banner */}
        {showPermissionBanner && browserPermission === 'default' && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg z-20 backdrop-blur-md animate-in slide-in-from-top-2 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-white/20">
                <FiBell size={16} />
              </div>
              <p className="text-xs font-semibold">
                <span className="font-extrabold">Stay updated in real-time:</span> Enable desktop browser notifications to receive instant alerts for new orders, quotes, registrations, and messages.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRequestBrowserPermission}
                className="px-3 py-1 bg-white text-blue-600 hover:bg-white/90 text-xs font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => setShowPermissionBanner(false)}
                className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC PAGE CONTENT */}
        <main ref={mainRef} onScroll={checkScrollState} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="w-full mx-auto p-1 sm:p-2 lg:p-4 min-h-full">
            <Outlet context={{ setChatUnreadCount, setOrdersUnreadCount, setUsersUnreadCount, setUsersVerifyUnreadCount, setUsersDeletionUnreadCount, setQuotesUnreadCount }} />
          </div>
        </main>

        {/* GLOBAL FOOTER */}
        <footer className="bg-transparent backdrop-blur-2xl border-t border-white/10 shadow-lg shadow-black/50 py-4 px-8 mt-auto z-10 relative">
          <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} Inizio Workspace. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-2 md:mt-0">
              {/* <Link to="/help" className="hover:text-blue-500 transition-colors">Help Center</Link> */}
              <Link to="/settings/privacy-policy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
              {/* <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded-md border border-white/10">
                v1.2.0
              </span> */}
            </div>
          </div>
        </footer>

      </div>

      {/* Scroll to Top Floating Button (Rendered directly into document.body to avoid parent CSS clipping) */}
      {!isChatRoute && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Scroll to top"
          style={{
            position: 'fixed',
            bottom: '64px',
            right: '24px',
            zIndex: 999999,
            opacity: showScrollTop ? 1 : 0,
            transform: showScrollTop ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
            pointerEvents: showScrollTop ? 'auto' : 'none',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/95 to-blue-950/95 backdrop-blur-xl border border-blue-500/40 text-blue-400 hover:text-white hover:from-blue-600 hover:to-indigo-600 hover:border-blue-400 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_25px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_35px_rgba(37,99,235,0.7)] cursor-pointer group active:scale-90 flex items-center justify-center"
        >
          <FiArrowUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1" />
        </button>,
        document.body
      )}
    </div>
  );
};

export default Layout;