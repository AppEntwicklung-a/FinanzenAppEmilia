const CACHE = 'finanzen-app2-v1';
const ASSETS = [
  './index.html',
  './css/base.css',
  './css/themes.css',
  './css/layout.css',
  './css/components.css',
  './js/db.js',
  './js/app.js',
  './js/months.js',
  './js/fixtemplates.js',
  './js/summary.js',
  './js/contracts.js',
  './js/settings.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  // allSettled statt addAll: eine fehlende Datei (z.B. css/themes.css am
  // falschen Ort) blockiert nicht mehr das gesamte Update.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => c.add(a)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Netz zuerst: online immer die aktuelle Version, Cache nur als Offline-Reserve.
  // Verhindert, dass nach einem Deploy alte Dateien „kleben bleiben".
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
