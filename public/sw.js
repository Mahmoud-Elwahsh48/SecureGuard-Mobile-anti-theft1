// SafeGuard Shield - Background Sentinel Service Worker
const CACHE_NAME = 'safeguard-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SafeGuard SW cache warm notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background Sync for Offline Alert Dispatch
self.addEventListener('sync', (event) => {
  if (event.tag === 'safeguard-dispatch-alert') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SAFEGUARD_BACKGROUND_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// Push Notification Receiver for Security Alerts
self.addEventListener('push', (event) => {
  let data = { title: '🚨 SafeGuard Intruder Alert', body: 'Unauthorized device access detected!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [300, 100, 300, 100, 500],
      tag: 'safeguard-security-alert',
      renotify: true,
      data: {
        url: '/',
        timestamp: Date.now(),
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Keep-Alive Heartbeat message receiver from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SAFEGUARD_HEARTBEAT') {
    event.source?.postMessage({
      type: 'SAFEGUARD_HEARTBEAT_ACK',
      timestamp: Date.now(),
      status: 'active',
    });
  }
});
