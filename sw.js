// sw.js
const CACHE_NAME = 'turniservice-v3';
const SCOPE = self.registration.scope; // es: https://digitalizzare2025.github.io/turniservice/
const OFFLINE_FALLBACK_URL = new URL('index.html', SCOPE).toString();

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.add(new Request(OFFLINE_FALLBACK_URL, { cache: 'reload' }));
      } catch (e) {
        // se offline al primo install, pazienza: il fallback verrà messo al primo hit online
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Solo GET e solo stessa origine (evita problemi CORS su CDN)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === new URL(SCOPE).origin;

  if (sameOrigin) {
    event.respondWith((async () => {
      try {
        // Network-first
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        // clona e metti in cache
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        // Offline → prova cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback all'index se è una navigazione (document)
        if (request.mode === 'navigate') {
          const fallback = await caches.match(OFFLINE_FALLBACK_URL);
          if (fallback) return fallback;
        }
        // Ultima spiaggia
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  }
});
