import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import {
  FiLogOut, FiMenu, FiX, FiUser,
  FiBell, FiChevronDown, FiChevronRight,
  FiMessageSquare, FiPackage, FiUserPlus, FiClock, FiAlertTriangle, FiFileText
} from 'react-icons/fi';
import { getAccessibleMenus } from '../config/menus';
import HeaderSearch from './HeaderSearch';
import logoImg from '../assets/logos.png';
import appIconImg from '../assets/app-icon-png.png';
import { api, BASE_URL } from '../api/axios';
import { isRouteAllowed } from '../utils/rbac';

const Layout = () => {
  const { user, logout, userPermissions } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
  const navigation = useNavigate();
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
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const playNotificationSoundAndVibrate = () => {
    try {
      if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      // Audio autoplay policy fallback
    }
  };

  const triggerNativeNotification = (title, message, path, tag = '') => {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: logoImg,
        tag: tag || `notif-${Date.now()}`
      });
      notification.onclick = () => {
        window.focus();
        if (path) navigation(path);
        notification.close();
      };
    } catch (err) {
      console.log('Native notification error:', err);
    }
  };

  const sendChromeNotification = (title, message, path, tag = '') => {
    playNotificationSoundAndVibrate();

    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: message,
            icon: logoImg,
            badge: logoImg,
            vibrate: [200, 100, 200],
            tag: tag || `notif-${Date.now()}`,
            data: { path }
          });
        }).catch(() => {
          triggerNativeNotification(title, message, path, tag);
        });
      } else {
        triggerNativeNotification(title, message, path, tag);
      }
    } catch (e) {
      triggerNativeNotification(title, message, path, tag);
    }
  };

  const addToast = (title, message, path, IconComponent = FiBell, tag = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, path, IconComponent }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);

    // Trigger Chrome / Desktop system notification for all notifying messages
    sendChromeNotification(title, message, path, tag || `notif-${id}`);
  };

  const handleNotificationClick = (path, id) => {
    setIsNotificationsDropdownOpen(false);
    if (id === 'image-errors') {
      setFailedImageProductNames([]);
    }
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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          sendChromeNotification(
            'Inizio Notifications Enabled',
            'You will now receive Chrome notifications for new orders, customer chats, quote requests, and verifications.',
            '/'
          );
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
            const isNotOnChatPage = !window.location.pathname.includes('/chat');

            // Trigger In-App Toast & Chrome Desktop Notification
            if (isNotOnChatPage) {
              addToast(
                `New Message`,
                `From ${contact.name || 'Customer'}: ${contact.lastMessage || 'You received a new message.'}`,
                '/chat',
                FiMessageSquare,
                `chat-${contact.userId}`
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

        const pendingOrders = orders.filter(o => (o.orderStatus || o.status || '').toLowerCase() === 'pending');
        const pendingQuotes = quotes.filter(q => (q.status || '').toLowerCase() === 'pending' || !q.status);

        // Update active pending counts if not currently on those pages
        if (!window.location.pathname.startsWith('/orders')) {
          setOrdersUnreadCount(pendingOrders.length);
        }
        if (!window.location.pathname.startsWith('/quotes')) {
          setQuotesUnreadCount(pendingQuotes.length);
        }
        if (!window.location.pathname.includes('/products/broken-images')) {
          setBrokenImagesUnreadCount(pendingBrokenLogs.length);
        }
        const isAtPendingTab = window.location.pathname.includes('/users/list') && window.location.search.includes('tab=pending');
        if (!isAtPendingTab) {
          setUsersVerifyUnreadCount(pendingUsers.length);
        }
        const isAtDeletionTab = window.location.pathname.includes('/users/list') && window.location.search.includes('tab=deleted');
        if (!isAtDeletionTab) {
          setUsersDeletionUnreadCount(deletionUsers.length);
        }

        if (!isInitialDataLoad.current) {
          const prevOrdersCount = prevOrdersRef.current?.length || 0;
          const currentOrdersCount = orders.length;
          if (currentOrdersCount > prevOrdersCount && !window.location.pathname.startsWith('/orders')) {
            const countDiff = currentOrdersCount - prevOrdersCount;
            addToast(
              `New Order Received`,
              `You have received ${countDiff} new order${countDiff > 1 ? 's' : ''} to process.`,
              '/orders/all',
              FiPackage
            );
          }

          const prevUsersCount = prevUsersRef.current?.length || 0;
          const currentUsersCount = users.length;
          if (currentUsersCount > prevUsersCount && !window.location.pathname.includes('/users/list')) {
            const countDiff = currentUsersCount - prevUsersCount;
            setUsersUnreadCount(prev => prev + countDiff);
            addToast(
              `New Registration`,
              `${countDiff} new user${countDiff > 1 ? 's' : ''} registered recently.`,
              '/users/list',
              FiUserPlus
            );
          }

          const prevPendingCount = prevPendingRef.current?.length || 0;
          const currentPendingCount = pendingUsers.length;
          if (currentPendingCount > prevPendingCount && !isAtPendingTab) {
            const countDiff = currentPendingCount - prevPendingCount;
            addToast(
              `Pending Verification`,
              `${countDiff} user${countDiff > 1 ? 's' : ''} pending verification.`,
              '/users/list?tab=pending',
              FiClock
            );
          }

          const prevDeletionCount = prevDeletionRef.current?.length || 0;
          const currentDeletionCount = deletionUsers.length;
          if (currentDeletionCount > prevDeletionCount && !isAtDeletionTab) {
            const countDiff = currentDeletionCount - prevDeletionCount;
            addToast(
              `Account Deletion Request`,
              `${countDiff} account deletion request${countDiff > 1 ? 's' : ''} pending.`,
              '/users/list?tab=deleted',
              FiAlertTriangle
            );
          }

          const prevQuotesCount = prevQuotesRef.current?.length || 0;
          const currentQuotesCount = quotes.length;
          if (currentQuotesCount > prevQuotesCount && !window.location.pathname.startsWith('/quotes')) {
            const countDiff = currentQuotesCount - prevQuotesCount;
            addToast(
              `New Quote Request`,
              `You have received ${countDiff} new quote request${countDiff > 1 ? 's' : ''} to review.`,
              '/quotes',
              FiFileText
            );
          }

          const prevBrokenCount = prevBrokenImagesRef.current?.length || 0;
          const currentBrokenCount = pendingBrokenLogs.length;
          if (currentBrokenCount > prevBrokenCount && !window.location.pathname.includes('/products/broken-images')) {
            const countDiff = currentBrokenCount - prevBrokenCount;
            addToast(
              `Broken Image Alert`,
              `${countDiff} new broken image${countDiff > 1 ? 's' : ''} reported by the app.`,
              '/products/broken-images',
              FiAlertTriangle
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
  }, [user]);

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
        "/products/broken-images",
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
          setFailedImageProductNames(prev => {
            const prevSet = new Set(prev);
            const newlyAdded = uniqueFailed.filter(name => !prevSet.has(name));

            // Only trigger toast if there are newly discovered broken images
            if (newlyAdded.length > 0) {
              const namesPreview = newlyAdded.slice(0, 2).join(', ');
              const totalFailed = newlyAdded.length;
              addToast(
                "Image Load Alert",
                `Failed to load ${totalFailed} product image(s) (${namesPreview}${totalFailed > 2 ? '...' : ''}). Check your WordPress library access.`,
                "/products/broken-images",
                FiAlertTriangle
              );
            }

            return uniqueFailed;
          });
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
            className={`flex items-start justify-between gap-4.5 p-4 bg-slate-900 border border-white/10 border-l-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] cursor-pointer hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-in slide-in-from-right-full fade-in text-left group pointer-events-auto select-none ${
              t.path.startsWith('/chat') ? 'border-l-blue-500 shadow-blue-500/10' :
              t.path.startsWith('/orders') ? 'border-l-emerald-500 shadow-emerald-500/10' :
              (t.path === '/users/list' || t.path.includes('tab=approved')) ? 'border-l-indigo-500 shadow-indigo-500/10' :
              t.path.includes('tab=pending') ? 'border-l-amber-500 shadow-amber-500/10' :
              t.path.includes('tab=deleted') ? 'border-l-rose-500 shadow-rose-500/10' :
              t.path === '/quotes' ? 'border-l-cyan-500 shadow-cyan-500/10' :
              'border-l-blue-500 shadow-blue-500/10'
            }`}
          >
            <div className={`p-1 bg-white/5 rounded-xl shrink-0 group-hover:scale-110 transition-transform ${
              t.path.startsWith('/chat') ? 'text-blue-400' :
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
                <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">System Notifications</span>
                  {totalUnreadCount > 0 && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                      {totalUnreadCount}
                    </span>
                  )}
                </div>

                {notificationPermission !== 'granted' && (
                  <div className="mx-2 mb-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FiBell className="text-blue-400 text-xs shrink-0" />
                      <span className="text-[10px] text-slate-300 font-medium truncate">Enable Chrome alerts</span>
                    </div>
                    <button
                      onClick={requestNotificationPermission}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[9px] font-bold transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      Allow
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
          <p className={`px-2 text-xs font-bold text-slate-500 uppercase tracking-wider transition-all duration-300 ${
            isExpanded ? 'opacity-100 mb-4 max-h-8 mt-2' : 'lg:opacity-0 lg:max-h-6 lg:mb-2 lg:mt-1 overflow-hidden'
          }`}>
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
                    title={!isExpanded ? menu.name : undefined}
                    className={`
                      w-full h-12 flex items-center justify-between px-4 transition-all duration-300 group
                      ${isChildActive
                        ? 'bg-blue-600/20 text-blue-500 border border-blue-600/50 shadow-sm rounded-xl cursor-pointer'
                        : isExpanded
                          ? 'text-slate-300 hover:bg-blue-600/20 hover:text-blue-500 border border-transparent cursor-pointer rounded-xl'
                          : 'bg-white/[0.03] backdrop-blur-md border border-white/5 text-slate-300 hover:bg-blue-600/20 hover:text-blue-500 cursor-pointer shadow-xs rounded-xl'
                      }
                    `}
                  >
                    <div className="flex items-center min-w-0">
                      {Icon && (
                        <Icon 
                          className={`shrink-0 transition-all duration-300 
                            ${isChildActive ? 'text-blue-500 scale-105' : 'text-slate-300 group-hover:text-white group-hover:scale-105'} 
                            ${isExpanded ? 'text-lg' : 'text-base lg:mr-0'}`} 
                        />
                      )}
                      <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                        }`}>{menu.name}</span>
                    </div>

                    <div className={`flex items-center shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[50px] ml-2' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                      }`}>
                      {!isOpen && parentBadgeCount > 0 && (
                        <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0">
                          {parentBadgeCount > 9 ? '9+' : parentBadgeCount}
                        </span>
                      )}
                      <FiChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''} ${isOpen || isChildActive ? 'text-blue-500' : 'text-white'}`} />
                    </div>
                  </button>

                  {/* Collapsible Sub-Menus */}
                  {isExpanded && (
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
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
                                  <span className="transition-all duration-300 opacity-100">{sub.name}</span>
                                </div>
                                {badgeCount > 0 && (
                                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0 transition-opacity duration-300 opacity-100">
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
                  w-full h-12 flex items-center justify-between px-4 transition-all duration-300 group
                  ${isActive
                    ? 'bg-blue-600/20 text-blue-500 shadow-sm border border-blue-600/50 rounded-xl'
                    : isExpanded
                      ? 'text-slate-300 hover:bg-blue-600/20 hover:text-blue-500 border border-transparent rounded-xl'
                      : 'bg-white/[0.03] backdrop-blur-md border border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10 shadow-xs rounded-xl'
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  {Icon && (
                    <Icon 
                      className={`shrink-0 transition-all duration-300 
                        ${isActive ? 'scale-105 text-blue-500' : 'group-hover:scale-105 text-slate-300 group-hover:text-white'} 
                        ${isExpanded ? 'text-lg' : 'text-base lg:mr-0'}`} 
                    />
                  )}
                  <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[150px] ml-3' : 'opacity-0 max-w-0 overflow-hidden ml-0'
                    }`}>{menu.name}</span>
                </div>
                {badgeCount > 0 && (
                  <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-w-[50px] ml-2' : 'opacity-0 max-w-0 overflow-hidden ml-0'
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
                    <span className="text-xs font-bold text-white uppercase tracking-wider">System Notifications</span>
                    {totalUnreadCount > 0 && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                        {totalUnreadCount} New
                      </span>
                    )}
                  </div>

                  {notificationPermission !== 'granted' && (
                    <div className="mx-3 my-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FiBell className="text-blue-400 text-sm shrink-0" />
                        <span className="text-xs text-slate-300 font-medium">Enable Chrome notifications</span>
                      </div>
                      <button
                        onClick={requestNotificationPermission}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        Enable
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

        {/* DYNAMIC PAGE CONTENT */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 min-h-full">
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
    </div>
  );
};

export default Layout;