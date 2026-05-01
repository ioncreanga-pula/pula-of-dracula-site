const CACHE_NAME = 'cur-wallet-v135';
const ASSETS = [
  '/traista',
  '/traista/',
  '/traista/index.html',
  '/traista/favicon.ico',
  '/traista/hero.png',
  '/traista/logo.png',
  '/traista/luna.png',
  '/traista/moon.png',
  '/traista/qr-logo.png',
  '/traista/qr-styled.js',
  '/traista/stencil-moon.png',
  '/traista/symbol-mars.png',
  '/traista/economist-1988.jpg',
  '/traista/ip.bitcointalk.png',
  '/traista/assets_v75/index-BkABBNYp.css',
  '/traista/assets_v75/index-cbJp19NE.js',
  '/traista/assets_v75/index-CgAWUHfI.js',
  '/traista/assets_v75/index-en.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request, { redirect: 'follow' }))
  );
});
