import appIconImg from '../assets/app-icon-png.png';

/**
 * Utility for handling native browser notifications, permissions, and audio feedback
 */

export const isBrowserNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (!isBrowserNotificationSupported()) {
    console.warn('Browser notifications are not supported on this device/browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showBrowserNotification({
        title: 'Inizio Admin Notifications',
        body: 'Browser notifications are now enabled! You will receive alerts for new orders, quotes, chats, and registrations.',
        path: '/'
      });
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
};

/**
 * Play a notification audio chime via Web Audio API
 */
export const playNotificationSound = (type = 'chime') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'chime') {
      // Pleasant two-tone chime (F#5 to A5)
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, now); // F#5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    }

    if (navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }
  } catch (err) {
    // Ignore audio context autoplay restrictions
  }
};

// In-memory deduplication cache to prevent duplicate alerts within short intervals (1.5s)
const recentNotifications = new Map();

/**
 * Show a native Desktop / Mobile Browser Notification with automatic deduplication
 */
export const showBrowserNotification = ({
  title,
  body,
  icon = appIconImg,
  path = '/',
  tag,
  navigate
}) => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  // Deduplication guard: ignore exact identical notifications within 1.5 seconds
  const deterministicTag = tag || `inizio-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const notifKey = `${deterministicTag}::${body || ''}`;
  const now = Date.now();

  // Allow test alerts or non-identical calls through; debounce rapid duplicate bursts
  if (!tag?.includes('test') && recentNotifications.has(notifKey) && (now - recentNotifications.get(notifKey)) < 1500) {
    return false; // Suppress rapid duplicate burst
  }
  recentNotifications.set(notifKey, now);

  // Clean old entries from cache
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > 20000) recentNotifications.delete(key);
  }

  playNotificationSound();

  const options = {
    body: body || 'New alert from Inizio Admin Panel',
    icon: icon || appIconImg,
    badge: appIconImg,
    tag: deterministicTag,
    renotify: true,
    silent: false,
    requireInteraction: false
  };

  try {
    // 1. Try native desktop Notification constructor first (immediate on Desktop Chrome, Windows, Mac)
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      if (typeof navigate === 'function' && path) {
        navigate(path);
      } else if (path && window.location.pathname !== path) {
        window.location.href = path;
      }
      notification.close();
    };
    return true;
  } catch (err) {
    // 2. Fallback to ServiceWorker showNotification (required for Android Chrome / Mobile PWAs)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(reg => {
          reg.showNotification(title, options);
        })
        .catch(e => {
          console.error('ServiceWorker showNotification failed:', e);
        });
      return true;
    }
    console.error('Failed to trigger native notification:', err);
    return false;
  }
};
