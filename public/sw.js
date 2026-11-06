/* Zuxo Player service worker: offline app shell + Firebase Cloud Messaging */
const VERSION = 'zuxo-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/zuxo-logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Firebase must not take down the offline shell if the CDN is unreachable.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    projectId: 'nexarion',
    appId: '1:378614234879:web:ea8dc4ff8bca02ac61d6ca',
    apiKey: 'AIzaSyDmnxFjyn-p7BZTWV1IAfMT1vofZQBOWEA',
    authDomain: 'nexarion.firebaseapp.com',
    messagingSenderId: '378614234879',
  });

  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Zuxo Player - Notificação';
    self.registration.showNotification(title, {
      body: payload.notification?.body || 'Você possui um novo alerta sobre sua assinatura ou fatura.',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      tag: payload.data?.type || 'zuxo-alert',
      vibrate: [200, 100, 200],
      data: { url: payload.data?.url || '/', ...payload.data },
      actions: [
        { action: 'open_app', title: 'Abrir App' },
        { action: 'dismiss', title: 'Dispensar' },
      ],
    });
  });
} catch (err) {
  console.warn('[sw] Firebase messaging indisponível:', err);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(SHELL_URLS);
      // The page that installed us loaded its hashed bundles before we existed; cache them now.
      const html = await (await cache.match('/')).text();
      const assets = [...new Set(html.match(/\/assets\/[^"'\s)]+/g) || [])];
      await cache.addAll(assets);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone());
    return response;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Only production build output and static icons; dev-server modules always go to the network.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
