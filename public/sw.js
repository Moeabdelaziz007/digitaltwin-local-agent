const CACHE_NAME = 'twin-cache-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core shell & offline fallback
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force active
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Exclude API requests from SW cache (let ETag handle them)
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Network First strategy with Offline Fallback
      return fetch(event.request)
        .then((fetchRes) => {
          // Clone the response and cache it
          if (fetchRes.ok && fetchRes.type === 'basic') {
            const resClone = fetchRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, resClone);
            });
          }
          return fetchRes;
        })
        .catch(() => {
          // Offline -> Return from Cache
          if (response) return response;
          // Totally offline -> Return custom offline page for navigations
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
