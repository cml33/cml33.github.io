/* ============================================
   Service Worker — Deicy Personal Tracker
   Network-first con fallback a cache para uso offline
   Version: Deicy viva + voladora
   ============================================ */

const CACHE_VERSION = 'deicy-gh-v3';
const CACHE_NAME = `deicy-cache-${CACHE_VERSION}`;

// Archivos a precachear al instalar el SW
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  /* 📅 Deicy Planifica (PWA hermana, mismo dominio = misma licencia) */
  './planifica/',
  './planifica/index.html',
  './planifica/manifest.json',
  './planifica/icon-192.png',
  './planifica/icon-512.png',
  /* 💸 DeepFinance (Asesor Financiero, sub-app gateada) */
  './asesor/',
  './asesor/index.html',
  './asesor/deepfinance-gate.js',
  './astral/',
  './astral/index.html',
  './astral/astronomy.min.js',
  './astral/interp.js',
  /* assets extraidos del HTML (skins, mascota, videos, medallas) */
  './assets/asset-10.jpg',
  './assets/asset-11.png',
  './assets/asset-12.jpg',
  './assets/asset-13.png',
  './assets/asset-14.jpg',
  './assets/asset-16.png',
  './assets/asset-17.jpg',
  './assets/asset-18.jpg',
  './assets/asset-19.png',
  './assets/asset-22.jpg',
  './assets/asset-23.jpg',
  './assets/asset-24.jpg',
  './assets/asset-25.jpg',
  './assets/asset-26.png',
  './assets/asset-31.jpg',
  './assets/asset-32.jpg',
  './assets/asset-33.jpg',
  './assets/asset-34.jpg',
  './assets/asset-6.png',
  './assets/asset-7.png',
  './assets/asset-8.png',
  './assets/asset-9.png',
  './assets/diana.jpg',
  './assets/icono-fav.png',
  './assets/icono-touch.png',
  './assets/lab-2.jpg',
  './assets/lab-3.jpg',
  './assets/lab-4.jpg',
  './assets/mascota-adulta.jpg',
  './assets/mascota-bebe.jpg',
  './assets/mascota-huevo.jpg',
  './assets/mascota-larva.jpg',
  './assets/mascota-legend.jpg',
  './assets/mascota-reina.jpg',
  './assets/medalla-nivel-elite-90-dias.jpg',
  './assets/medalla-nivel-legend-180-dias.jpg',
  './assets/medalla-nivel-pro-45-dias.jpg',
  './assets/medalla-nivel-rookie.jpg',
  './assets/video-kiss.mp4',
  './assets/video-legend.mp4',
];

// === INSTALL ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(PRECACHE.map((u) =>
        cache.add(u).catch((err) => console.warn('[SW] no se pudo precachear', u, err))
      ));
    }).then(() => self.skipWaiting())
  );
});

// === ACTIVATE === (limpiar caches viejos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k.startsWith('deicy-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// === FETCH === (network-first con fallback a cache)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (url.pathname.startsWith('/.netlify/')) return; // nunca cachear funciones (licencias)
  if (sameOrigin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => {
          /* offline: cada app cae a SU propia portada (Planifica no debe recibir el index de Deicy) */
          const fallback = url.pathname.startsWith('/planifica') ? './planifica/index.html' : url.pathname.startsWith('/asesor') ? './asesor/index.html' : './index.html';
          return caches.match(req).then((cached) => cached || caches.match(fallback));
        })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return res;
      });
    })
  );
});
