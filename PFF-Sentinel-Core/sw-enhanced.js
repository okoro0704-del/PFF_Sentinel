/**
 * PFF Sentinel — Enhanced Service Worker (Background Listener + PWA Support)
 * Listens for Lock_Command from LifeOS Admin and sets lock state.
 * Persists across tab close; when user reopens app, lock overlay is shown.
 * Enhanced with PWA caching for offline download portal access.
 */

const LOCK_COMMAND = 'Lock_Command';
const CACHE_NAME = 'pff-sentinel-v2.0';
const DOWNLOAD_PORTAL_CACHE = 'pff-download-portal-v1';

// Assets to cache for offline access
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/download.html',
  '/admin.html',
  '/css/sovereign-handshake.css',
  '/css/download-portal.css',
  '/js/app.js',
  '/js/download-portal.js',
  '/manifest.json'
];

// Download portal specific assets
const DOWNLOAD_PORTAL_ASSETS = [
  '/download.html',
  '/css/download-portal.css',
  '/js/download-portal.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(DOWNLOAD_PORTAL_CACHE).then((cache) => {
      return cache.addAll(DOWNLOAD_PORTAL_ASSETS);
    }).then(() => {
      self.skipWaiting();
    }).catch((error) => {
      console.error('Cache installation failed:', error);
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName !== DOWNLOAD_PORTAL_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (e.g., QR code API)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache the fetched response
        caches.open(DOWNLOAD_PORTAL_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If not in cache and it's a navigation request, return the download page
          if (event.request.mode === 'navigate') {
            return caches.match('/download.html');
          }

          // Return a basic offline response
          return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Lock Command handling
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === LOCK_COMMAND) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: LOCK_COMMAND }));
      })
    );
  }
});

