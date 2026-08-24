/* Files Run — an endless runner about document custody.
 *
 * Built from the Claude Design handoff: screens 2a (gameplay), 2b (power-up),
 * 2c (caught) and 2d (title) of `Files Run - Game Mockup.dc.html`, with the
 * mechanics described in `Files Run - Game UI Spec.dc.html` and the asset brief.
 *
 * The world is a one-point perspective. Everything that travels lives at a
 * depth `z`: z = 1 is the runner's screen depth, z > 1 is further up the
 * tunnel toward the vanishing point, z < 1 is between the runner and the
 * camera. Screen position and size fall straight out of 1/z.
 */
(() => {
'use strict';

/* ────────────────────────────────────────────────────────── tuning */

const STAGE_W = 390, STAGE_H = 844;

const HORIZON_Y      = 30;    // vanishing point in the floor plate
const RUNNER_FEET_Y  = 388;   // mockup 2a: runner top 300 + height 88
const PERSP          = RUNNER_FEET_Y - HORIZON_Y;
const LANE_X         = 118;   // lane centre offset at the runner's depth
const Z_SPAWN        = 4.2;   // just under the vanishing point
const Z_EXIT         = 0.40;  // past the camera
const Z_RUNNER       = 1;

const SPEED_BASE = 2.0;       // z units per second
const SPEED_MAX  = 3.2;
const SPEED_RAMP = 110;       // seconds to reach top speed
const METERS_PER_Z = 12;      // a clean run lands near the mockup's 1264 m

const PROX_START   = 0.30;
const PROX_RATE    = 0.0105;  // per second at base speed
const PROX_HIT     = 0.15;
const PROX_PICKUP  = 0.006;
const PROX_GAS     = 0.05;    // per second while the gas hangs
const PROX_POWERUP = 0.10;    // clamped to this when the doorway fires

const PAGES_START  = 24;
const PAGES_PICKUP = 3;
const PAGES_LOSS   = 0.28;    // share of the carried stack scattered on a hit
const PAGES_LOSS_MIN = 4;

const JUMP_MS      = 640;
const JUMP_H       = 46;
const JUMP_SAFE    = [0.10, 0.58];   // fraction of the jump that clears an obstacle
const INVULN_MS    = 700;

const GAS_EVERY    = [4, 9];         // seconds, per the asset brief
const GAS_MS       = 1650;
const DOOR_FIRST   = 16;
const DOOR_EVERY   = [20, 30];
const POWERUP_MS   = 6000;

const OBS_GAP      = [1.7, 2.9];     // z units between obstacles, early
const OBS_GAP_LATE = [1.25, 2.1];
const PICKUP_GAP   = [1.1, 2.3];
const RUNG_GAP     = 0.55;

const SPRITES = {
  turnstile: { img: 'obs_turnstile.png', w: 52,  h: 48.6 },
  cart:      { img: 'obs_cart.png',      w: 54,  h: 39.6 },
  gate:      { img: 'obs_gate.png',      w: 52,  h: 43.3 },
  pages:     { img: 'pickup_pages.png',  w: 28,  h: 24.5 },
  drop:      { img: 'page_drop.png',     w: 22,  h: 26.6 },
};
const OBSTACLES = ['turnstile', 'cart', 'gate'];

const ASSETS = [
  'assets/bg_floor.jpg', 'assets/bg_walls.jpg',
  'assets/runner_run.png', 'assets/pursuer_run.png', 'assets/distraction.png',
  'assets/gas.png', 'assets/door_open.png', 'assets/door_shut.png',
  'assets/obs_turnstile.png', 'assets/obs_cart.png', 'assets/obs_gate.png',
  'assets/pickup_pages.png', 'assets/page_drop.png',
];

/* ────────────────────────────────────────────────────────── helpers */

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = ([a, b]) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const comma = (n) => Math.round(n).toLocaleString('en-US');

const yAt = (z) => HORIZON_Y + PERSP / z;
const sAt = (z) => 1 / z;
const xAt = (z, lane) => STAGE_W / 2 + lane * LANE_X / z;

// Depth the doorway freezes at while the power-up runs (mockup 2b: bottom 22).
const Z_DOOR_PINNED = PERSP / (STAGE_H - 22 - HORIZON_Y);

const store = {
  get(k, d) { try { const v = localStorage.getItem('filesrun.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('filesrun.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

/* ────────────────────────────────────────────────────────── audio */

const sfx = (() => {
  let ctx = null;
  let on = store.get('sound', true);
  const wake = () => {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  const tone = (freq, dur, type, gain, slide) => {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  };
  return {
    wake,
    get on() { return on; },
    toggle() { on = !on; store.set('sound', on); if (on) { wake(); this.pickup(); } return on; },
    lane()    { tone(440, 0.07, 'square', 0.05); },
    jump()    { tone(320, 0.16, 'square', 0.06, 720); },
    pickup()  { tone(680, 0.09, 'square', 0.06); setTimeout(() => tone(1020, 0.1, 'square', 0.05), 70); },
    hit()     { tone(180, 0.32, 'sawtooth', 0.10, 60); },
    caught()  { tone(140, 0.9, 'sawtooth', 0.12, 44); },
    power()   { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'square', 0.06), i * 80)); },
  };
})();

/* ────────────────────────────────────────────────────────── elements */

const el = {
  stage: $('stage'), field: $('field'), world: $('world'),
  runner: $('runner'), pursuer: $('pursuer'), gas: $('gas'),
  speedTag: $('speedTag'), vignette: $('vignette'), flash: $('flash'),
  hud: $('hud'), prox: document.querySelector('.prox'), proxFill: $('proxFill'), proxState: $('proxState'),
  pages: $('pages'), dist: $('dist'), hiSmall: $('hiSmall'),
  delay: $('delay'), delaySecs: $('delaySecs'), delayFill: $('delayFill'),
  pickupFlash: $('pickupFlash'), hints: $('hints'),
  title: $('title'), caught: $('caught'), board: $('board'), howtoPanel: $('howtoPanel'), loading: $('loading'),
  rDist: $('rDist'), rKept: $('rKept'), rLost: $('rLost'), rBest: $('rBest'), rank: $('rank'),
  titleFoot: $('titleFoot'), boardList: $('boardList'),
  loadFill: $('loadFill'), loadState: $('loadState'),
};

const pulledLabel = document.createElement('div');
pulledLabel.id = 'pulledLabel';
pulledLabel.textContent = 'PULLED INTO THE ROOM';
el.field.appendChild(pulledLabel);

/* ────────────────────────────────────────────────────────── stage fit */

function fit() {
  const w = window.innerWidth, h = window.innerHeight;
  // On a desktop-sized window, leave room around the stage for the phone bezel.
  const pad = w > 700 ? 32 : 0;
  const s = Math.min((w - pad * 2) / STAGE_W, (h - pad * 2) / STAGE_H);
  el.stage.style.setProperty('--s', s);
  document.body.classList.toggle('framed', w - STAGE_W * s > 40 && h - STAGE_H * s > 40);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 120));
fit();

/* ────────────────────────────────────────────────────────── entities */

const pool = [];
let ents = [];

function spawn(kind, opts) {
  const e = pool.pop() || { el: document.createElement('div') };
  const d = e.el;
  d.className = 'ent ' + kind;
  d.style.cssText = '';
  Object.assign(e, { kind, z: Z_SPAWN, lane: 0, dead: false, hitDone: false, spin: 0, spinRate: 0 }, opts);
  d.style.width = e.w + 'px';
  d.style.height = e.h + 'px';
  if (kind === 'door') {
    d.innerHTML = '<div class="plate"></div><div class="girl"></div><div class="pulled"></div>';
    if (e.lane > 0) d.classList.add('mirror');
  } else if (kind === 'rung') {
    d.innerHTML = '';
  } else {
    d.innerHTML = '<i style="background-image:url(assets/' + e.img + ')"></i>';
  }
  el.world.appendChild(d);
  ents.push(e);
  return e;
}

function kill(e) {
  e.dead = true;
  if (e.el.parentNode) e.el.parentNode.removeChild(e.el);
  if (pool.length < 48) pool.push(e);
}

function draw(e) {
  const s = sAt(e.z);
  const x = xAt(e.z, e.lane * (e.laneMul || 1)) - e.w / 2 + (e.dx || 0);
  const y = yAt(e.z) - e.h;
  e.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')' +
    (e.spin ? ' rotate(' + e.spin.toFixed(0) + 'deg)' : '');
  e.el.style.opacity = e.z > Z_SPAWN - 0.55 ? ((Z_SPAWN - e.z) / 0.55).toFixed(2) : '1';
}

/* ────────────────────────────────────────────────────────── state */

const S = { LOAD: 'load', TITLE: 'title', PLAY: 'play', CAUGHT: 'caught', MENU: 'menu' };
let mode = S.LOAD;

const g = {
  t: 0, odo: 0, speed: SPEED_BASE,
  lane: 0, laneX: STAGE_W / 2,
  jumpT: -1,
  invuln: 0,
  prox: PROX_START, meters: 0, pages: PAGES_START, lost: 0,
  pursuerX: STAGE_W / 2,
  nextObs: 0, nextPickup: 0, nextRung: 0,
  gasAt: 0, gasUntil: 0,
  doorAt: 0, powerUntil: 0, pinnedDoor: null,
  best: store.get('best', 0), delivered: store.get('delivered', 0),
};

function resetRun() {
  ents.forEach(kill);
  ents = [];
  Object.assign(g, {
    t: 0, odo: 0, speed: SPEED_BASE, lane: 0, laneX: STAGE_W / 2, jumpT: -1, invuln: 0,
    prox: PROX_START, meters: 0, pages: PAGES_START, lost: 0, pursuerX: STAGE_W / 2,
    nextObs: 1.2, nextPickup: 2.4, nextRung: 0,
    gasAt: rand(GAS_EVERY), gasUntil: 0,
    doorAt: DOOR_FIRST, powerUntil: 0, pinnedDoor: null,
  });
  el.runner.classList.remove('fast', 'stumble', 'hit');
  el.delay.classList.remove('on');
  el.speedTag.style.display = 'none';
  pulledLabel.style.display = 'none';
  el.pursuer.style.display = '';
  el.hints.classList.remove('fade');
  setTimeout(() => { if (mode === S.PLAY) el.hints.classList.add('fade'); }, 4200);
}

/* ────────────────────────────────────────────────────────── input */

function move(dir) {
  if (mode !== S.PLAY) return;
  const next = clamp(g.lane + dir, -1, 1);
  if (next !== g.lane) { g.lane = next; sfx.lane(); }
}

function jump() {
  if (mode !== S.PLAY || g.jumpT >= 0) return;
  g.jumpT = 0;
  sfx.jump();
}

let touch = null;
const SWIPE = 24;
el.stage.addEventListener('touchstart', (ev) => {
  sfx.wake();
  const t = ev.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY, done: false };
}, { passive: true });

el.stage.addEventListener('touchmove', (ev) => {
  if (!touch || touch.done) return;
  const t = ev.changedTouches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? 1 : -1); touch.done = true; }
  else if (dy < -SWIPE && Math.abs(dy) > Math.abs(dx)) { jump(); touch.done = true; }
}, { passive: true });

el.stage.addEventListener('touchend', () => { touch = null; }, { passive: true });

document.addEventListener('keydown', (ev) => {
  sfx.wake();
  switch (ev.key) {
    case 'ArrowLeft': case 'a': case 'A': move(-1); break;
    case 'ArrowRight': case 'd': case 'D': move(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': ev.preventDefault(); jump(); break;
    case 'Enter':
      if (mode === S.TITLE) startRun();
      else if (mode === S.CAUGHT) startRun();
      break;
  }
});

/* ────────────────────────────────────────────────────────── screens */

function show(screen) {
  [el.title, el.caught, el.board, el.howtoPanel, el.loading].forEach((s) => s.classList.add('hidden'));
  if (screen) screen.classList.remove('hidden');
  el.hud.classList.toggle('hidden', screen !== null);
  el.field.classList.toggle('hidden', screen === el.title || screen === el.board || screen === el.howtoPanel || screen === el.loading);
}

function toTitle() {
  mode = S.TITLE;
  el.titleFoot.textContent = 'HI ' + comma(g.best) + ' m · ' + comma(g.delivered) + ' pages delivered';
  show(el.title);
}

function startRun() {
  sfx.wake();
  resetRun();
  mode = S.PLAY;
  show(null);
  render(0);
  last = performance.now();
}

function toCaught() {
  mode = S.CAUGHT;
  sfx.caught();

  const meters = Math.round(g.meters);
  const runs = store.get('runs', []);
  runs.push({ m: meters, p: g.pages, at: Date.now() });
  runs.sort((a, b) => b.m - a.m);
  store.set('runs', runs.slice(0, 30));

  const isBest = meters > g.best;
  if (isBest) { g.best = meters; store.set('best', meters); }
  g.delivered += g.pages;
  store.set('delivered', g.delivered);

  el.rDist.textContent = comma(meters) + ' M';
  el.rKept.textContent = comma(g.pages);
  el.rLost.textContent = comma(g.lost);
  el.rBest.textContent = comma(g.best) + ' M';

  const place = runs.findIndex((r) => r.m === meters && r.at) + 1;
  el.rank.textContent = isBest ? 'Your best run yet' : 'Run #' + place + ' of ' + runs.length + ' on this device';

  show(el.caught);
}

function toBoard(from) {
  mode = S.MENU;
  el.board.dataset.from = from;
  const runs = store.get('runs', []);
  el.boardList.innerHTML = runs.length
    ? runs.slice(0, 8).map((r, i) =>
        '<div class="board-row' + (i === 0 ? ' top' : '') + '">' +
        '<div class="pos">' + (i + 1) + '</div>' +
        '<div class="when">' + new Date(r.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div>' +
        '<div class="m">' + comma(r.m) + ' M</div>' +
        '<div class="pg">' + comma(r.p) + ' pages</div>' +
        '</div>').join('')
    : '<div class="board-empty">No runs yet. The files are still sealed.</div>';
  show(el.board);
}

/* ────────────────────────────────────────────────────────── run events */

function hit() {
  if (g.invuln > 0) return;
  const lost = Math.min(g.pages, Math.max(PAGES_LOSS_MIN, Math.round(g.pages * PAGES_LOSS)));
  g.pages -= lost;
  g.lost += lost;
  g.prox = clamp(g.prox + PROX_HIT, 0, 1);
  g.invuln = INVULN_MS;
  sfx.hit();

  // FX_PAGE_DROP: 6–14 pages tumbling toward the camera past the pursuer.
  const n = 6 + ((Math.random() * 9) | 0);
  for (let i = 0; i < n; i++) {
    const sp = SPRITES.drop;
    // They fall out of the folder and drift toward the camera slower than the
    // tunnel scrolls, so the scatter reads for the best part of a second.
    spawn('drop', {
      img: sp.img, w: sp.w, h: sp.h, lane: g.lane,
      z: 1.0 - Math.random() * 0.05,
      dx: (Math.random() - 0.5) * 110,
      spin: Math.random() * 360, spinRate: (Math.random() - 0.5) * 620,
      fall: 0.30 + Math.random() * 0.30,
    });
  }

  el.stage.classList.remove('shake'); void el.stage.offsetWidth; el.stage.classList.add('shake');
  el.flash.classList.remove('on'); void el.flash.offsetWidth; el.flash.classList.add('on');
  el.runner.classList.add('stumble', 'hit');
  setTimeout(() => el.runner.classList.remove('stumble', 'hit'), 520);
}

function collect() {
  g.pages += PAGES_PICKUP;
  g.prox = clamp(g.prox - PROX_PICKUP, 0, 1);
  sfx.pickup();
  el.pickupFlash.textContent = '+' + PAGES_PICKUP + ' PAGES';
  el.pickupFlash.classList.remove('on'); void el.pickupFlash.offsetWidth; el.pickupFlash.classList.add('on');
}

// DOOR_ROOM fires only in an outer lane: he is pulled in, the run keeps going.
function powerUp(door) {
  g.powerUntil = g.t * 1000 + POWERUP_MS;
  g.prox = Math.min(g.prox, PROX_POWERUP);
  g.pinnedDoor = door;
  sfx.power();

  door.pinned = true;
  door.el.classList.add('pinned');
  door.el.style.width = '176px';
  door.el.style.height = '218px';
  door.el.style.opacity = '1';
  door.el.style.transform = 'translate(' + (door.lane > 0 ? STAGE_W - 6 - 176 : 6) + 'px, ' + (STAGE_H - 22 - 218) + 'px)';

  el.pursuer.style.display = 'none';
  el.gas.classList.remove('on');
  pulledLabel.style.display = 'block';
  pulledLabel.classList.toggle('right', door.lane > 0);
  el.delay.classList.add('on');
  el.runner.classList.add('fast');
  el.speedTag.style.display = 'block';
}

function endPowerUp() {
  const door = g.pinnedDoor;
  g.pinnedDoor = null;
  g.powerUntil = 0;
  if (door && !door.dead) {
    // He is put out, the door shuts, and the whole tile resumes its travel past the camera.
    door.el.classList.add('shut');
    door.el.classList.remove('pinned');
    door.el.style.width = door.w + 'px';
    door.el.style.height = door.h + 'px';
    door.pinned = false;
    door.z = Z_DOOR_PINNED;
  }
  el.pursuer.style.display = '';
  pulledLabel.style.display = 'none';
  el.delay.classList.remove('on');
  el.runner.classList.remove('fast');
  el.speedTag.style.display = 'none';
}

function fireGas() {
  if (g.powerUntil) return;
  g.gasUntil = g.t * 1000 + GAS_MS;
  el.gas.classList.remove('on'); void el.gas.offsetWidth; el.gas.classList.add('on');
}

/* ────────────────────────────────────────────────────────── the loop */

let last = 0;

function step(dt) {
  const nowMs = g.t * 1000;
  const power = g.powerUntil > nowMs;

  g.t += dt;
  g.speed = SPEED_BASE + (SPEED_MAX - SPEED_BASE) * Math.min(1, g.t / SPEED_RAMP);
  const eff = g.speed * (power ? 2 : 1);
  g.odo += eff * dt;
  g.meters += eff * dt * METERS_PER_Z;

  // ── proximity
  if (power) {
    g.prox = Math.min(g.prox, PROX_POWERUP);
  } else {
    g.prox += PROX_RATE * dt * (0.7 + 0.5 * (g.speed / SPEED_BASE));
    if (g.gasUntil > nowMs) g.prox -= PROX_GAS * dt;
    g.prox = clamp(g.prox, 0, 1);
  }
  if (g.powerUntil && !power) endPowerUp();

  // ── runner
  if (g.invuln > 0) g.invuln -= dt * 1000;
  if (g.jumpT >= 0) { g.jumpT += dt * 1000; if (g.jumpT > JUMP_MS) g.jumpT = -1; }
  const targetX = STAGE_W / 2 + g.lane * LANE_X;
  g.laneX += (targetX - g.laneX) * Math.min(1, dt * 14);

  // ── scheduled spawns
  if (g.odo >= g.nextRung) {
    g.nextRung = g.odo + RUNG_GAP;
    spawn('rung', { w: 240, h: 2, lane: 0 });
  }
  if (g.odo >= g.nextObs) {
    const gap = g.t > 40 ? OBS_GAP_LATE : OBS_GAP;
    g.nextObs = g.odo + rand(gap);
    const kind = pick(OBSTACLES), sp = SPRITES[kind];
    const lane = (Math.random() * 3 | 0) - 1;
    spawn('obs', { img: sp.img, w: sp.w, h: sp.h, lane });
    if (g.t > 45 && Math.random() < 0.34) {   // second obstacle, always one lane free
      const other = pick([-1, 0, 1].filter((l) => l !== lane));
      const k2 = pick(OBSTACLES), s2 = SPRITES[k2];
      spawn('obs', { img: s2.img, w: s2.w, h: s2.h, lane: other });
    }
  }
  if (g.odo >= g.nextPickup) {
    g.nextPickup = g.odo + rand(PICKUP_GAP);
    const busy = ents.filter((e) => e.kind === 'obs' && e.z > Z_SPAWN - 0.8).map((e) => e.lane);
    const free = [-1, 0, 1].filter((l) => busy.indexOf(l) < 0);
    if (free.length) {
      const sp = SPRITES.pages;
      spawn('pickup', { img: sp.img, w: sp.w, h: sp.h, lane: pick(free) });
    }
  }
  if (g.t >= g.doorAt && !g.powerUntil && !ents.some((e) => e.kind === 'door')) {
    g.doorAt = g.t + rand(DOOR_EVERY);
    // DOOR_ROOM spawns in an outer lane only, set back into the tunnel wall.
    spawn('door', { w: 80, h: 99, lane: Math.random() < 0.5 ? -1 : 1, laneMul: 1.5 });
  }

  // ── gas: random 4–9 s, slows him for ~1.5 s
  if (!power && g.t >= g.gasAt) {
    g.gasAt = g.t + rand(GAS_EVERY);
    fireGas();
  }

  // ── travel + collisions
  const jumpF = g.jumpT >= 0 ? g.jumpT / JUMP_MS : -1;
  const airborne = jumpF > JUMP_SAFE[0] && jumpF < JUMP_SAFE[1];

  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    if (e.pinned) continue;

    const prevZ = e.z;
    e.z -= eff * dt * (e.kind === 'drop' ? e.fall : 1);
    if (e.spinRate) e.spin += e.spinRate * dt;

    if (prevZ > Z_RUNNER && e.z <= Z_RUNNER && !e.hitDone) {
      e.hitDone = true;
      if (e.lane === g.lane) {
        if (e.kind === 'obs' && !airborne) hit();
        else if (e.kind === 'pickup') { collect(); kill(e); ents.splice(i, 1); continue; }
        else if (e.kind === 'door') { powerUp(e); continue; }
      }
    }

    if (e.z <= Z_EXIT) { kill(e); ents.splice(i, 1); continue; }
    draw(e);
  }
  ents = ents.filter((e) => !e.dead);

  if (g.prox >= 1) { toCaught(); return; }
}

function render(dt) {
  // runner
  const jumpF = g.jumpT >= 0 ? g.jumpT / JUMP_MS : -1;
  const lift = jumpF >= 0 ? Math.sin(jumpF * Math.PI) * JUMP_H : 0;
  const tilt = jumpF >= 0 ? Math.sin(jumpF * Math.PI) * -4 : 0;
  el.runner.style.transform = 'translate(' + (g.laneX - 27).toFixed(1) + 'px,' + (300 - lift).toFixed(1) +
    'px) rotate(' + tilt.toFixed(1) + 'deg)';
  el.speedTag.style.transform = 'translate(' + (g.laneX - 52).toFixed(1) + 'px, 292px)';

  // pursuer — closes on the runner as proximity fills (mockup 2a at 62%: bottom 74, 119 x 190)
  const w = lerp(130, 112, g.prox);
  const s = w / 130;
  const bottom = lerp(30, 100, g.prox);
  g.pursuerX += ((STAGE_W / 2 + g.lane * LANE_X * 0.55) - g.pursuerX) * Math.min(1, dt * 3.2);
  const jitter = g.prox > 0.8 ? (Math.random() - 0.5) * (g.prox - 0.8) * 22 : 0;
  const px = g.pursuerX - 65 + jitter;
  const py = STAGE_H - bottom - 208;
  el.pursuer.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
  // FX_GAS plays low and behind him — mockup 2a puts it 133px left of his centre, 14px below his feet.
  const gasX = Math.max(4, g.pursuerX - 133), gasY = STAGE_H - (bottom - 14) - 60;
  el.gas.style.transform = 'translate(' + gasX.toFixed(1) + 'px,' + gasY.toFixed(1) + 'px)';

  // HUD
  el.proxFill.style.width = (g.prox * 100).toFixed(1) + '%';
  const safe = g.powerUntil > g.t * 1000 || g.gasUntil > g.t * 1000;
  el.prox.classList.toggle('safe', safe);
  el.proxState.textContent = safe ? 'Falling back' : 'Closing';
  el.proxState.className = safe ? 'falling' : 'closing';
  el.pages.textContent = comma(g.pages);
  el.dist.textContent = comma(g.meters) + ' M';
  el.hiSmall.textContent = 'HI ' + comma(g.best);

  const danger = clamp((g.prox - 0.55) / 0.45, 0, 1);
  el.vignette.style.background = 'radial-gradient(120% 68% at 50% 46%, transparent 42%, rgba(216,64,47,' +
    (danger * 0.34).toFixed(3) + ') 100%)';

  if (g.powerUntil) {
    const left = Math.max(0, g.powerUntil - g.t * 1000);
    el.delaySecs.textContent = (left / 1000).toFixed(1) + 's';
    el.delayFill.style.width = (left / POWERUP_MS * 100).toFixed(1) + '%';
  }
}

let raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (mode !== S.PLAY) return;
  step(dt);
  if (mode === S.PLAY) render(dt);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });

/* ────────────────────────────────────────────────────────── wiring */

$('start').addEventListener('click', startRun);
el.title.addEventListener('click', (ev) => { if (ev.target === el.title || ev.target.classList.contains('title-wash')) startRun(); });
$('again').addEventListener('click', startRun);
$('openBoard').addEventListener('click', () => toBoard('caught'));
$('titleBoard').addEventListener('click', () => toBoard('title'));
$('boardBack').addEventListener('click', () => {
  if (el.board.dataset.from === 'caught') { mode = S.CAUGHT; show(el.caught); } else toTitle();
});
$('howto').addEventListener('click', () => { mode = S.MENU; show(el.howtoPanel); });
$('howtoBack').addEventListener('click', toTitle);

$('sound').addEventListener('click', (ev) => {
  ev.currentTarget.textContent = 'Sound: ' + (sfx.toggle() ? 'on' : 'off');
});
$('sound').textContent = 'Sound: ' + (sfx.on ? 'on' : 'off');

$('share').addEventListener('click', async () => {
  const text = 'Files Run — I carried ' + comma(g.pages) + ' pages ' + comma(Math.round(g.meters)) +
    ' m down the tunnel before he caught me.';
  try {
    if (navigator.share) await navigator.share({ title: 'Files Run', text });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text); flashBtn($('share'), 'Copied'); }
    else flashBtn($('share'), text.slice(0, 18));
  } catch (e) { /* dismissed */ }
});

function flashBtn(btn, msg) {
  const was = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = was; }, 1400);
}

/* ────────────────────────────────────────────────────────── boot */

function preload() {
  let done = 0;
  const total = ASSETS.length;
  const tick = () => {
    done++;
    el.loadFill.style.width = (done / total * 100) + '%';
    el.loadState.textContent = done === total ? 'Unsealed' : 'Unsealing';
    if (done === total) setTimeout(ready, 260);
  };
  ASSETS.forEach((src) => {
    const img = new Image();
    img.onload = img.onerror = tick;
    img.src = src;
  });
}

function ready() {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  toTitle();
  raf = requestAnimationFrame(frame);
  last = performance.now();
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

preload();

// Handy for tuning / verification runs.
window.FilesRun = { g, S, get mode() { return mode; }, startRun, toCaught, toTitle, toBoard, move, jump, powerUp, ents: () => ents };

})();
