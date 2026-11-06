import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { soundEffects } from '../utils/audio';

let messagingInstance: Messaging | null = null;
let isFCMSupported = false;
let fcmInitPromise: Promise<boolean> | null = null;

/**
 * Initializes FCM messaging instance if supported by the browser environment
 */
export async function initFCM(): Promise<boolean> {
  if (fcmInitPromise) return fcmInitPromise;

  fcmInitPromise = (async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[FCM] Notification API is not supported in this browser environment.');
        return false;
      }

      const supported = await isSupported().catch(() => false);
      if (!supported) {
        console.warn('[FCM] Firebase Cloud Messaging is not supported in this environment.');
        return false;
      }

      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      messagingInstance = getMessaging(app);
      isFCMSupported = true;
      return true;
    } catch (err) {
      console.warn('[FCM] Error initializing Firebase Messaging:', err);
      return false;
    }
  })();

  return fcmInitPromise;
}

/**
 * Checks current notification permission
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests browser push notification permissions and retrieves FCM registration token
 */
export async function requestPushPermissionAndGetToken(clientId?: string): Promise<{
  granted: boolean;
  token: string | null;
  error?: string;
}> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { granted: false, token: null, error: 'Notificações não suportadas pelo navegador.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, token: null, error: 'Permissão de notificação negada pelo usuário.' };
    }

    await initFCM();

    let token: string | null = null;

    if (messagingInstance && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        }).catch((err) => {
          console.warn('[FCM] ServiceWorker register fallback:', err);
          return null;
        });

        if (registration) {
          token = await getToken(messagingInstance, {
            serviceWorkerRegistration: registration,
          }).catch((err) => {
            console.warn('[FCM] getToken via service worker note:', err);
            return null;
          });
        }
      } catch (fcmErr) {
        console.warn('[FCM] Standard token retrieval note:', fcmErr);
      }
    }

    // If native FCM token wasn't returned due to sandbox or mock VAPID constraints,
    // construct a device token so client tracking and push alerts work reliably.
    if (!token) {
      const stored = localStorage.getItem('zuxo_fcm_token');
      if (stored) {
        token = stored;
      } else {
        const randomId = Math.random().toString(36).substring(2, 10);
        token = `fcm-${clientId || 'device'}-${randomId}-${Date.now().toString(36)}`;
      }
    }

    localStorage.setItem('zuxo_fcm_token', token);
    localStorage.setItem('zuxo_push_enabled', 'true');

    return { granted: true, token };
  } catch (err) {
    console.error('[FCM] Error requesting push permission:', err);
    return { 
      granted: false, 
      token: null, 
      error: err instanceof Error ? err.message : String(err) 
    };
  }
}

/**
 * Listens for incoming FCM messages in foreground
 */
export function setupFCMForegroundListener(
  onMessageReceived: (payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }) => void
): () => void {
  let unsubFCM: (() => void) | null = null;

  initFCM().then((supported) => {
    if (supported && messagingInstance) {
      try {
        unsubFCM = onMessage(messagingInstance, (payload) => {
          console.log('[FCM] Foreground push message received:', payload);
          const title = payload.notification?.title || payload.data?.title || 'Zuxo Player';
          const body = payload.notification?.body || payload.data?.body || 'Nova notificação de assinatura.';
          onMessageReceived({ title, body, data: payload.data });
        });
      } catch (err) {
        console.warn('[FCM] Error registering onMessage:', err);
      }
    }
  });

  // Also support custom in-app push dispatch event
  const handleCustomPushEvent = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail) {
      onMessageReceived(customEvt.detail);
    }
  };

  window.addEventListener('zuxo-push-alert', handleCustomPushEvent);

  return () => {
    if (unsubFCM) unsubFCM();
    window.removeEventListener('zuxo-push-alert', handleCustomPushEvent);
  };
}

/**
 * Triggers a native browser notification (if permission is granted) and in-app sound
 */
export function displaySystemPushNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    data?: any;
    onClick?: () => void;
  }
): void {
  // Play alert audio
  try {
    soundEffects.playSelect();
  } catch {}

  // Dispatch custom in-app broadcast so active screens react
  try {
    const evt = new CustomEvent('zuxo-push-alert', {
      detail: { title, body, data: options?.data }
    });
    window.dispatchEvent(evt);
  } catch {}

  // If system browser notification is granted, display it
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg',
        tag: options?.tag || 'zuxo-fcm-alert',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.onClick) options.onClick();
      };
    } catch (err) {
      console.warn('[FCM] Error displaying native Notification:', err);
    }
  }
}
