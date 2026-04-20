const CACHE_NAME = 'yousif-daily-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json?v=2'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'ئاگادارکردنەوە', body: 'ئاگادارکردنەوەیەکی نوێت هەیە' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {
    data = { title: 'ئاگادارکردنەوە', body: event.data ? event.data.text() : data.body };
  }
  
  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/11516/11516805.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/11516/11516805.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    dir: 'rtl',
    lang: 'ku'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
