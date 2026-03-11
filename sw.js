/* =========================================
    THERMO BETA - SERVICE WORKER (sw.js)
   ========================================= */

const CACHE_NAME = 'THERMO-cache-v2'; // Incremented version to force update

// 1. INSTALL EVENT - Save all files for offline access
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './', 
        'index.html', 
        'style.css',
        'settings.css',
        'script.js',
        'manifest.json',
        'https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js'
      ]);
    })
  );
  console.log("SYSTEM: THERMO Service Worker Installed & Cached");
});

// 2. ACTIVATE EVENT - Clean up old caches if you update the version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("SYSTEM: Clearing old cache");
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. FETCH EVENT - Serve from cache if network fails
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});