/* Snack Run — an endless runner about processed food.
 *
 * You run the aisle with an armful of chips while the Secretary closes on you.
 * Recalled food scatters what you are carrying; loose bags go back in the
 * armful; a booster buys you six seconds at double speed.
 *
 * Screen layout inherits the Claude Design handoff (screens 2a gameplay,
 * 2b power-up, 2c caught, 2d title of `Files Run - Game Mockup.dc.html`).
 *
 * The world is a one-point perspective. Everything that travels lives at a
 * depth `z`: z = 1 is the runner's screen depth, z > 1 is further up the
 * aisle toward the vanishing point, z < 1 is between the runner and the
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
const PROX_LABEL   = 0.05;    // per second while he stops to read a label
const PROX_POWERUP = 0.10;    // clamped to this when the booster lands

const BAGS_START   = 24;
const BAGS_PICKUP  = 3;
const BAGS_LOSS    = 0.28;    // share of the armful scattered on a hit
const BAGS_LOSS_MIN = 4;

const INVULN_MS    = 700;            // grace period after a hit

const LABEL_EVERY  = [4, 9];         // he stops to read an ingredients label
const LABEL_MS     = 1650;
const VAX_FIRST    = 18;             // a dose: banks an extra life
const VAX_EVERY    = [26, 40];
const MAX_LIVES    = 3;
const PROX_AFTER_DOSE = 0.42;        // where a spent dose puts him back to

const TYL_FIRST    = 12;             // Tylenol: six seconds at double speed
const TYL_EVERY    = [18, 28];
const POWERUP_MS   = 6000;

const OBS_GAP      = [1.7, 2.9];     // z units between obstacles, early
const OBS_GAP_LATE = [1.25, 2.1];
const PICKUP_GAP   = [1.1, 2.3];
const RUNG_GAP     = 0.55;

// Sizes are the sprite's size at the runner's depth (z = 1); perspective does the rest.
// The runner is one file per frame, so a single pose can be redrawn and
// dropped in on its own. Bump RUNNER_FRAMES if the cycle gains or loses one.
const RUNNER_FRAMES = 8;
const RUNNER_FRAME_MS = 78;          // ~12.8 fps
const RUNNER_FRAME_MS_FAST = 52;     // while Tylenol is up
const RUNNER_SRC = Array.from({ length: RUNNER_FRAMES },
  (_, i) => 'assets/runner_' + String(i + 1).padStart(2, '0') + '.png');

const SPRITES = {
  // The bags you are here for — one of three, picked per spawn.
  chips:   { img: 'pickup_chips.png',   w: 28, h: 35.2 },
  chipsB:  { img: 'pickup_chips_b.png', w: 28, h: 34.9 },
  chipsG:  { img: 'pickup_chips_g.png', w: 26, h: 37.0 },
  crumb:   { img: 'chip_drop.png',      w: 22, h: 26.9 },   // spills out of the armful
  vax:     { img: 'pickup_vax.png',     w: 25, h: 30 },     // a dose: one extra life
  tyl:     { img: 'pickup_tylenol.png', w: 25, h: 30 },     // Tylenol: double speed
};
// 54 obstacle types. Placeholder art for now: one flat colour-coded square
// each, drawn by tools/draw_obstacles.py. They all share a square footprint,
// so a single size covers the set; real sprites can vary per type later.
const OBSTACLE_COUNT = 54;
const OBSTACLE_SIZE = 54;
const OBSTACLE_ART = Array.from({ length: OBSTACLE_COUNT }, (_, i) => {
  const n = 'obs_' + String(i + 1).padStart(2, '0');
  return [n, OBSTACLE_SIZE, OBSTACLE_SIZE];
});
const OBSTACLES = OBSTACLE_ART.map(([n]) => n);
const CHIP_BAGS = ['chips', 'chipsB', 'chipsG'];
OBSTACLE_ART.forEach(([n, w, h]) => { SPRITES[n] = { img: n + '.png', w, h }; });

const ASSETS = [
  'assets/bg_floor.jpg', 'assets/bg_walls.jpg',
  'assets/pursuer_run.png',
  'assets/pickup_chips.png', 'assets/pickup_chips_b.png', 'assets/pickup_chips_g.png',
  'assets/chip_drop.png',
  'assets/pickup_vax.png', 'assets/pickup_tylenol.png',
]
  .concat(RUNNER_SRC)
  .concat(OBSTACLE_ART.map(([n]) => 'assets/' + n + '.png'));

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


const store = {
  get(k, d) { try { const v = localStorage.getItem('snackrun.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('snackrun.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
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
    pickup()  { tone(680, 0.09, 'square', 0.06); setTimeout(() => tone(1020, 0.1, 'square', 0.05), 70); },
    hit()     { tone(180, 0.32, 'sawtooth', 0.10, 60); },
    caught()  { tone(140, 0.9, 'sawtooth', 0.12, 44); },
    power()   { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'square', 0.06), i * 80)); },
    dose()    { [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.07), i * 110)); },
    save()    { [880, 660, 880, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'square', 0.08), i * 130)); },
  };
})();

/* ────────────────────────────────────────────────────────── elements */

const el = {
  stage: $('stage'), field: $('field'), world: $('world'),
  runner: $('runner'), pursuer: $('pursuer'), labelTag: $('labelTag'),
  speedTag: $('speedTag'), vignette: $('vignette'), flash: $('flash'),
  hud: $('hud'), prox: document.querySelector('.prox'), proxFill: $('proxFill'), proxState: $('proxState'),
  bags: $('bags'), lives: $('lives'), dist: $('dist'), hiSmall: $('hiSmall'),
  delay: $('delay'), delaySecs: $('delaySecs'), delayFill: $('delayFill'),
  pickupFlash: $('pickupFlash'), hints: $('hints'),
  title: $('title'), caught: $('caught'), board: $('board'), howtoPanel: $('howtoPanel'), loading: $('loading'),
  rDist: $('rDist'), rKept: $('rKept'), rLost: $('rLost'), rBest: $('rBest'), rank: $('rank'),
  titleRunner: $('titleRunner'), titleFoot: $('titleFoot'), boardList: $('boardList'),
  loadFill: $('loadFill'), loadState: $('loadState'),
};


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
  if (kind === 'rung') {
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
  invuln: 0,
  prox: PROX_START, meters: 0, bags: BAGS_START, lost: 0,
  pursuerX: STAGE_W / 2,
  nextObs: 0, nextPickup: 0, nextRung: 0,
  labelAt: 0, labelUntil: 0,
  lives: 0, vaxAt: 0,
  tylAt: 0, powerUntil: 0,
  best: store.get('best', 0), eaten: store.get('eaten', 0),
};

function resetRun() {
  ents.forEach(kill);
  ents = [];
  Object.assign(g, {
    t: 0, odo: 0, speed: SPEED_BASE, lane: 0, laneX: STAGE_W / 2, invuln: 0,
    prox: PROX_START, meters: 0, bags: BAGS_START, lost: 0, pursuerX: STAGE_W / 2,
    nextObs: 1.2, nextPickup: 2.4, nextRung: 0,
    labelAt: rand(LABEL_EVERY), labelUntil: 0,
    lives: 0, vaxAt: VAX_FIRST,
    tylAt: TYL_FIRST, powerUntil: 0,
  });
  renderLives();
  el.runner.classList.remove('fast', 'stumble', 'hit');
  el.delay.classList.remove('on');
  el.speedTag.style.display = 'none';
  el.labelTag.style.display = 'none';
  el.hints.classList.remove('fade');
  setTimeout(() => { if (mode === S.PLAY) el.hints.classList.add('fade'); }, 4200);
}

/* ────────────────────────────────────────────────────────── input */

function move(dir) {
  if (mode !== S.PLAY) return;
  const next = clamp(g.lane + dir, -1, 1);
  if (next !== g.lane) { g.lane = next; sfx.lane(); }
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
}, { passive: true });

el.stage.addEventListener('touchend', () => { touch = null; }, { passive: true });

document.addEventListener('keydown', (ev) => {
  sfx.wake();
  switch (ev.key) {
    case 'ArrowLeft': case 'a': case 'A': move(-1); break;
    case 'ArrowRight': case 'd': case 'D': move(1); break;
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
  el.titleFoot.textContent = 'HI ' + comma(g.best) + ' m · ' + comma(g.eaten) + ' bags saved';
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
  runs.push({ m: meters, p: g.bags, at: Date.now() });
  runs.sort((a, b) => b.m - a.m);
  store.set('runs', runs.slice(0, 30));

  const isBest = meters > g.best;
  if (isBest) { g.best = meters; store.set('best', meters); }
  g.eaten += g.bags;
  store.set('eaten', g.eaten);

  el.rDist.textContent = comma(meters) + ' M';
  el.rKept.textContent = comma(g.bags);
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
        '<div class="pg">' + comma(r.p) + ' bags</div>' +
        '</div>').join('')
    : '<div class="board-empty">No runs yet. The files are still sealed.</div>';
  show(el.board);
}

/* ────────────────────────────────────────────────────────── run events */

function hit() {
  if (g.invuln > 0) return;
  const lost = Math.min(g.bags, Math.max(BAGS_LOSS_MIN, Math.round(g.bags * BAGS_LOSS)));
  g.bags -= lost;
  g.lost += lost;
  g.prox = clamp(g.prox + PROX_HIT, 0, 1);
  g.invuln = INVULN_MS;
  sfx.hit();

  // 6–14 chips tumbling toward the camera past him.
  const n = 6 + ((Math.random() * 9) | 0);
  for (let i = 0; i < n; i++) {
    const sp = SPRITES.crumb;
    // They spill out of the armful and drift toward the camera slower than the
    // aisle scrolls, so the scatter reads for the best part of a second.
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
  g.bags += BAGS_PICKUP;
  g.prox = clamp(g.prox - PROX_PICKUP, 0, 1);
  sfx.pickup();
  flash('+' + BAGS_PICKUP + ' BAGS');
}

// A dose banks an extra life. He does not approve, which is the point.
function takeDose() {
  if (g.lives >= MAX_LIVES) { collect(); return; }   // full up: count it as snacks
  g.lives++;
  renderLives();
  sfx.dose();
  flash('+1 DOSE');
}

// Spent automatically the moment he would have had you.
function spendDose() {
  g.lives--;
  renderLives();
  g.prox = PROX_AFTER_DOSE;
  g.invuln = INVULN_MS * 2;
  sfx.save();
  flash('IMMUNISED');
  el.flash.classList.remove('on'); void el.flash.offsetWidth; el.flash.classList.add('on');
}

function renderLives() {
  el.lives.innerHTML = g.lives
    ? Array.from({ length: g.lives }, () => '<i></i>').join('')
    : '';
}

function flash(msg) {
  el.pickupFlash.textContent = msg;
  el.pickupFlash.classList.remove('on'); void el.pickupFlash.offsetWidth; el.pickupFlash.classList.add('on');
}

// Tylenol: six seconds at double speed, and he drops a long way back.
function powerUp() {
  g.powerUntil = g.t * 1000 + POWERUP_MS;
  g.prox = Math.min(g.prox, PROX_POWERUP);
  sfx.power();

  el.labelTag.style.display = 'none';
  el.delay.classList.add('on');
  el.runner.classList.add('fast');
  el.speedTag.style.display = 'block';
  flash('TYLENOL');
}

function endPowerUp() {
  g.powerUntil = 0;
  el.delay.classList.remove('on');
  el.runner.classList.remove('fast');
  el.speedTag.style.display = 'none';
}

// He stops to read an ingredients label and loses ground for ~1.5 s.
function readLabel() {
  if (g.powerUntil) return;
  g.labelUntil = g.t * 1000 + LABEL_MS;
  el.labelTag.style.display = 'block';
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
    if (g.labelUntil > nowMs) g.prox -= PROX_LABEL * dt;
    g.prox = clamp(g.prox, 0, 1);
  }
  if (g.powerUntil && !power) endPowerUp();

  // ── runner
  if (g.invuln > 0) g.invuln -= dt * 1000;
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
    if (g.t > 55 && Math.random() < 0.28) {   // second obstacle, always one lane free
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
      const sp = SPRITES[pick(CHIP_BAGS)];
      spawn('pickup', { img: sp.img, w: sp.w, h: sp.h, lane: pick(free) });
    }
  }
  // ── a dose, on a shelf in any lane; skipped while you are already full up
  if (g.t >= g.vaxAt && g.lives < MAX_LIVES && !ents.some((e) => e.kind === 'vax')) {
    g.vaxAt = g.t + rand(VAX_EVERY);
    const sp = SPRITES.vax;
    spawn('vax', { img: sp.img, w: sp.w, h: sp.h, lane: (Math.random() * 3 | 0) - 1 });
  }
  // ── Tylenol
  if (g.t >= g.tylAt && !g.powerUntil && !ents.some((e) => e.kind === 'tyl')) {
    g.tylAt = g.t + rand(TYL_EVERY);
    const sp = SPRITES.tyl;
    spawn('tyl', { img: sp.img, w: sp.w, h: sp.h, lane: (Math.random() * 3 | 0) - 1 });
  }

  // ── he stops to read a label: random 4–9 s, costs him ~1.5 s of ground
  if (!power && g.t >= g.labelAt) {
    g.labelAt = g.t + rand(LABEL_EVERY);
    readLabel();
  }
  if (g.labelUntil && g.labelUntil <= nowMs) { g.labelUntil = 0; el.labelTag.style.display = 'none'; }

  // ── travel + collisions. The lane you are in is the whole defence.
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    const prevZ = e.z;
    e.z -= eff * dt * (e.kind === 'drop' ? e.fall : 1);
    if (e.spinRate) e.spin += e.spinRate * dt;

    if (prevZ > Z_RUNNER && e.z <= Z_RUNNER && !e.hitDone) {
      e.hitDone = true;
      if (e.lane === g.lane) {
        if (e.kind === 'obs') hit();
        else if (e.kind === 'pickup') { collect(); kill(e); ents.splice(i, 1); continue; }
        else if (e.kind === 'vax') { takeDose(); kill(e); ents.splice(i, 1); continue; }
        else if (e.kind === 'tyl') { powerUp(); kill(e); ents.splice(i, 1); continue; }
      }
    }

    if (e.z <= Z_EXIT) { kill(e); ents.splice(i, 1); continue; }
    draw(e);
  }
  ents = ents.filter((e) => !e.dead);

  if (g.prox >= 1) {
    if (g.lives > 0) spendDose();
    else { toCaught(); return; }
  }
}

function render(dt) {
  // runner — leans into the lane change, which is the only move he has
  const leanX = (STAGE_W / 2 + g.lane * LANE_X) - g.laneX;
  el.runner.style.transform = 'translate(' + (g.laneX - 22).toFixed(1) + 'px, 300px) rotate(' +
    clamp(leanX * -0.06, -7, 7).toFixed(1) + 'deg)';
  el.speedTag.style.transform = 'translate(' + (g.laneX - 52).toFixed(1) + 'px, 292px)';

  // pursuer — closes on the runner as proximity fills (mockup 2a at 62%: bottom 74, 119 x 190)
  const w = lerp(101, 87, g.prox);
  const s = w / 101;
  const bottom = lerp(30, 100, g.prox);
  g.pursuerX += ((STAGE_W / 2 + g.lane * LANE_X * 0.55) - g.pursuerX) * Math.min(1, dt * 3.2);
  const jitter = g.prox > 0.8 ? (Math.random() - 0.5) * (g.prox - 0.8) * 22 : 0;
  const px = g.pursuerX - 50.5 + jitter;
  const py = STAGE_H - bottom - 208;
  el.pursuer.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
  // The label-check beat sits just above his head.
  el.labelTag.style.transform = 'translate(' + (g.pursuerX - 46).toFixed(1) + 'px,' + (py - 14).toFixed(1) + 'px)';

  // HUD
  el.proxFill.style.width = (g.prox * 100).toFixed(1) + '%';
  const safe = g.powerUntil > g.t * 1000 || g.labelUntil > g.t * 1000;
  el.prox.classList.toggle('safe', safe);
  el.proxState.textContent = safe ? 'Falling back' : 'Closing';
  el.proxState.className = safe ? 'falling' : 'closing';
  el.bags.textContent = comma(g.bags);
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

// Swap the runner's frame file. Driven off wall time so the title screen's
// runner keeps moving while no run is in progress.
const runnerImg = el.runner.querySelector('i');
const titleRunnerImg = el.titleRunner.querySelector('i');
let runnerFrame = -1;

function animateRunner(now) {
  if (el.runner.classList.contains('stumble')) return;   // hold the pose on a hit
  const ms = (mode === S.PLAY && g.powerUntil > g.t * 1000) ? RUNNER_FRAME_MS_FAST : RUNNER_FRAME_MS;
  const f = Math.floor(now / ms) % RUNNER_FRAMES;
  if (f === runnerFrame) return;
  runnerFrame = f;
  const url = 'url(' + RUNNER_SRC[f] + ')';
  runnerImg.style.backgroundImage = url;
  titleRunnerImg.style.backgroundImage = url;
}

let raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  animateRunner(now);
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
  const text = 'Snack Run — I got ' + comma(g.bags) + ' bags ' + comma(Math.round(g.meters)) +
    ' m down the aisle before he caught me.';
  try {
    if (navigator.share) await navigator.share({ title: 'Snack Run', text });
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
window.SnackRun = { g, S, get mode() { return mode; }, startRun, toCaught, toTitle, toBoard, move, powerUp, ents: () => ents };

})();
