/* Snack Run — cache-first service worker so a run survives a dead signal. */
const CACHE = 'snackrun-v6';
const SHELL = [
  './', './index.html', './styles.css', './game.js', './manifest.webmanifest',
  './assets/bg_aisle.jpg', './assets/tex_aisle_ring.png', './assets/pursuer_run.png',
  './assets/pickup_chips.png', './assets/pickup_chips_b.png', './assets/pickup_chips_g.png',
  './assets/chip_drop.png', './assets/pickup_vax.png', './assets/pickup_tylenol.png',
  './assets/runner_01.png',
  './assets/runner_02.png',
  './assets/runner_03.png',
  './assets/runner_04.png',
  './assets/runner_05.png',
  './assets/runner_06.png',
  './assets/runner_07.png',
  './assets/runner_08.png',
  './assets/obs_bacon.png',
  './assets/obs_bacon_strips.png',
  './assets/obs_bean_soup.png',
  './assets/obs_berries.png',
  './assets/obs_blueberries.png',
  './assets/obs_bread.png',
  './assets/obs_breakfast_burrito.png',
  './assets/obs_brie.png',
  './assets/obs_burrito.png',
  './assets/obs_buttermilk.png',
  './assets/obs_cabbage.png',
  './assets/obs_cauliflower.png',
  './assets/obs_cheese_wheel.png',
  './assets/obs_chicken.png',
  './assets/obs_cucumber.png',
  './assets/obs_deli_meat.png',
  './assets/obs_eggs.png',
  './assets/obs_formula.png',
  './assets/obs_frozen_veg.png',
  './assets/obs_ground_beef.png',
  './assets/obs_ham_hock.png',
  './assets/obs_mackerel.png',
  './assets/obs_milk_jug.png',
  './assets/obs_noodle_soup.png',
  './assets/obs_pasta_salad.png',
  './assets/obs_peppers.png',
  './assets/obs_pesto.png',
  './assets/obs_pie.png',
  './assets/obs_pizza.png',
  './assets/obs_pork_chops.png',
  './assets/obs_powdered_milk.png',
  './assets/obs_prosciutto.png',
  './assets/obs_quiche.png',
  './assets/obs_roast_ham.png',
  './assets/obs_salmon.png',
  './assets/obs_sandwich.png',
  './assets/obs_sauce_pot.png',
  './assets/obs_sausage_ring.png',
  './assets/obs_sausages.png',
  './assets/obs_shrimp_wrap.png',
  './assets/obs_smoothie.png',
  './assets/obs_spaghetti.png',
  './assets/obs_spinach.png',
  './assets/obs_steak.png',
  './assets/obs_swiss.png',
  './assets/obs_tofu.png',
  './assets/obs_tofu_feta.png',
  './assets/obs_tv_dinner.png',
  './assets/obs_whole_fish.png',
  './assets/obs_wrap.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
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
