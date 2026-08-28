/* Snack Run — cache-first service worker so a run survives a dead signal. */
const CACHE = 'snackrun-v1';
const SHELL = [
  './', './index.html', './styles.css', './game.js', './manifest.webmanifest',
  './assets/bg_floor.jpg', './assets/bg_walls.jpg',
  './assets/runner_run.png', './assets/pursuer_run.png',
  './assets/obs_lettuce.png', './assets/obs_beef.png', './assets/obs_melon.png',
  './assets/pickup_chips.png', './assets/chip_drop.png', './assets/pickup_vax.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then((hit) => hit || fetch(ev.request).then((res) => {
      if (res.ok && new URL(ev.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, copy));
      }
      return res;
    }).catch(() => (ev.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
