/* Service worker: deja la app disponible sin internet. */
const CACHE = 'mi-estudio-v16';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './js/dates.js',
  './js/seed.js',
  './js/store.js',
  './js/quiz.js',
  './js/ui.js',
  './js/views.js',
  './js/images.js',
  './js/animals.js',
  './js/perla.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/patron-rosa.png',
  './icons/logo-perla.png',
  './icons/icon-maskable-512.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

