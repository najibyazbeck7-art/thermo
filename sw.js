/* =========================================
    THERMO BETA - SERVICE WORKER (sw.js)
    ========================================= */

const CACHE_NAME = 'THERMO-cache-v3'; // Incremented to v3 for new file structure

// 1. INSTALL EVENT - Cache all independent files for Project Thermo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './', 
        'index.html', 
        'settings.html', // Added new independent page
        'style.css',
        'settings.css',
        'script.js',
        'settings.js',   // Added new independent logic
        'manifest.json',
        'https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js'
      ]);
    })
  );
  console.log("SYSTEM: THERMO Service Worker (v3) Installed & Cached");
});

// 2. ACTIVATE EVENT - Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("SYSTEM: Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Ensure the new SW takes control immediately
  return self.clients.claim();
});

// 3. FETCH EVENT - Network first, then Cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});