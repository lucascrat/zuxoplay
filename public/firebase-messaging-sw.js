/* Firebase Cloud Messaging Service Worker for Zuxo Player */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
firebase.initializeApp({
  projectId: "nexarion",
  appId: "1:378614234879:web:ea8dc4ff8bca02ac61d6ca",
  apiKey: "AIzaSyDmnxFjyn-p7BZTWV1IAfMT1vofZQBOWEA",
  authDomain: "nexarion.firebaseapp.com",
  messagingSenderId: "378614234879"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'Zuxo Player - Notificação';
  const notificationOptions = {
    body: payload.notification?.body || 'Você possui um novo alerta sobre sua assinatura ou fatura.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.type || 'zuxo-alert',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    },
    actions: [
      { action: 'open_app', title: 'Abrir App' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
