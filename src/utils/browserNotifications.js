import logoImg from '../assets/logos.png';

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

/**
 * Show a native Desktop / Mobile Browser Notification
 */
export const showBrowserNotification = ({
  title,
  body,
  icon = logoImg,
  path = '/',
  tag,
  navigate
}) => {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  playNotificationSound();

  const options = {
    body: body || 'New alert from Inizio Admin Panel',
    icon: icon || logoImg,
    badge: logoImg,
    tag: tag || `inizio-${Date.now()}`,
    renotify: true,
    silent: false,
    requireInteraction: false
  };

  try {
    // If ServiceWorker is active, use showNotification for mobile/PWA push support
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready
        .then(reg => {
          reg.showNotification(title, options);
        })
        .catch(() => {
          createStandardNotification(title, options, path, navigate);
        });
    } else {
      createStandardNotification(title, options, path, navigate);
    }
    return true;
  } catch (e) {
    console.error('Failed to trigger native notification:', e);
    return false;
  }
};

const createStandardNotification = (title, options, path, navigate) => {
  try {
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
  } catch (err) {
    console.warn('Native notification constructor failed:', err);
  }
};
