/* GEOQUEST offline shell. Flags are cached on demand. */
const CACHE = 'geoquest-v6';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/base.css', './css/components.css', './css/game.css', './css/site.css',
  './js/main.js', './js/data.js', './js/i18n.js', './js/icons.js', './js/store.js',
  './js/audio.js', './js/utils.js', './js/ui.js', './js/modes.js', './js/engine.js', './js/site.js',
  './js/locales/es.js', './js/locales/fr.js',
  './js/session.js', './js/layout.js', './js/views/home.js', './js/views/play.js',
  './js/views/game.js', './js/views/result.js', './js/views/atlas.js',
  './js/views/stats.js', './js/views/settings.js', './js/views/learn.js',
  './js/views/events.js', './assets/world-map.svg', './assets/favicon.svg',
  './assets/icon-192.png', './assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (res.type === 'basic' || res.type === 'default')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
