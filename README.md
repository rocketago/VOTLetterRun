# Snack Run

An endless runner about processed food. You run the aisle with an armful of
chips while the Secretary closes on you; recalled food scatters what you are
carrying, and a booster buys you six seconds at double speed.

Mobile portrait, no build step, no dependencies. Double-click `index.html` and
it runs. To play it on a phone, or to get the offline cache, serve it instead:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

## Controls

| Input | Touch | Keyboard |
| --- | --- | --- |
| Change lane | swipe left / right | ← → or A D |
| Start / restart | tap | enter |

## Mechanics

- **Three lanes, and nothing else.** Changing lane is the only move. The
  runner sits at a fixed depth; everything else travels toward the camera on
  the lane it spawned in.
- **The world moves.** The corridor is one self-similar image zoomed about its
  vanishing point. Its centre is a transparent hole shaped like the frame, so
  scaling by 2 lays the picture exactly onto itself and the loop closes with no
  cross-fade. Eight copies are stacked a doubling apart, seen through each
  other's holes, with a radial whiteout over the deepest.
- **Bags** are the score you carry. Loose bags on the floor add three each.
- **Recalled food** — 50 items off the FDA list — costs you about a quarter of
  your armful and lets him close. Change lane or wear it.
- **Proximity** fills over time, jumps on every hit, and eases back a little
  for every obstacle that goes past in another lane. When it fills, he has you.
- **The chase is his depth.** He runs between you and the camera, so closing on
  you means moving *away* from the camera — up the path and smaller. Proximity
  sets where he sits; a lunge rides on top of it, so a hit shoves him 83px
  closer at once and then eases off, a dodge nudges him back, and Tylenol drops
  him clean off the bottom of the screen. For the bottom fifth of the meter he
  is not on screen at all: when you are safe, he is gone.
- **He stops to read an ingredients label** on a random 4–9 s interval, which
  costs him about a second and a half of ground.
- **Boosters** appear on the shelves every 20–30 s. Take one for six seconds at
  double speed and a sharp drop in proximity.

## Art status

Nearly all of it is real art now. The runner is held as eight separate frame
files (`assets/runner_01.png` … `runner_08.png`) so any single pose can be
replaced on its own. The pursuer and the three chip bags are real art, and so
are the 50 recalled food items, cut from the food sheet by
`tools/slice_sheets.py` against the cell map in `tools/food_sheet_map.txt`. The
corridor is real art, prepared for the zoom by `tools/key_sky.py`.

Two things are still stand-ins: the vaccine and Tylenol pickups, drawn by
`tools/draw_placeholders.py`, and `assets/bg_aisle.jpg` — the still plate
behind the title, caught and leaderboard screens, which is a supermarket
interior and no longer matches the hedge path you run down.

`ART-BRIEF.md` lists every file, size and frame count; drop real art in at
those filenames and nothing in the code has to change.

## Perspective

The world is one-point perspective. Everything that travels has a depth `z`:

```
z = 1     the runner's screen depth (fixed, his feet at 660)
z > 1     further up the path, toward the vanishing point
z < 1     between the runner and the camera
```

Screen position and size fall out of `1/z`:

```js
y     = HORIZON_Y + PERSP / z        // HORIZON_Y 422, PERSP 238
scale = 1 / z
x     = 195 + lane * LANE_X / z      // LANE_X 48
```

The first two are measured off the corridor plate, not chosen: the vanishing
point is its frame centre. The lane spacing is set by the *outer edge of the
sprite*, not its centre — at two thirds of the half-width, which tiles the path
exactly, the outer sprite reached 98% of the way to the hedge at every depth,
so outer-lane food skimmed the hedge line for its whole trip and read as coming
out of the bushes rather than down the path. Backing it off by half a sprite
plus a margin puts it at 84%. `drift.js` guards that. Sprites are authored at their size at
`z = 1`, so a pork chop is 58 × 47.8 in the tables and the perspective does the
rest.

**Depth decays, it does not count down.** The corridor is one self-similar
image scaled about that same vanishing point, so its rings sit a fixed *ratio*
apart in depth, and holding a constant on-screen rate means `z` falls by a
constant factor per second rather than a constant amount. Everything that
travels obeys the same law:

```js
e.z *= Math.exp(-speed * dt)
```

Ticking `z` down linearly instead agrees with the corridor at exactly one
depth — the runner's — and nowhere else. At `z = 4.2` the world flowed past
4.7x faster than the food standing on it and the path edge swept outward 7x
faster, so items hung near the vanishing point looking pinned to nothing and
then whipped out sideways as they arrived. The ratio test in `drift.js` pins
this: `ln(z) + odometer` has to stay fixed for the whole of an item's run.

So spawning is a ratio too. An item lives `ln(Z_SPAWN / Z_EXIT) / speed`
seconds — from `z = 20`, a 3px speck deep in the haze, to `z = 0.50` past the
camera: 2.3 seconds at base speed, of which the last 1.3 are close enough to
read which lane it is in. Speed is in e-folds of depth per second, and the
corridor runs at 2.3 doublings a second from the same number. See *The
corridor* in `ART-BRIEF.md`.

## Tuning

Every number worth touching is a constant at the top of `game.js`: speed ramp,
proximity rates, the bag economy, spawn gaps, and the
label-check and booster intervals.

## Repo layout

```
index.html  styles.css  game.js       the game
sw.js  manifest.webmanifest           offline cache, add-to-home-screen
assets/                               art, generated
tools/build_assets.py                 repacks source sheets into assets/
tools/draw_placeholders.py            stand-in power-up sprites
tools/slice_sheets.py                 cuts incoming sheets into named sprites
tools/key_sky.py                      prepares a corridor plate for the zoom
ART-BRIEF.md                          what art is still needed, and at what size
project/                              the original Claude Design source
```
