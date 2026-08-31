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
- **Proximity** fills over time and jumps on every hit. When it fills, he has
  you.
- **He stops to read an ingredients label** on a random 4–9 s interval, which
  costs him about a second and a half of ground.
- **Boosters** appear on the shelves every 20–30 s. Take one for six seconds at
  double speed and a sharp drop in proximity.

## Art status

**The corridor is a placeholder** — the pink/blue test image, not final art.
Everything else below still applies.

The runner is real art, held as eight separate frame files
(`assets/runner_01.png` … `runner_08.png`) so any single pose can be replaced
on its own. The pursuer and the three chip bags are real art too, and so are the 50
recalled food items, cut from the food sheet by `tools/slice_sheets.py` using
the cell map in `tools/food_sheet_map.txt`. Only the two power-up pickups are
still stand-ins, drawn by `tools/draw_placeholders.py`. The background
is still the previous theme's tunnel plate. `ART-BRIEF.md` lists every file,
size and frame count; drop real sprites in at those filenames and nothing in
the code has to change.

## Perspective

The world is one-point perspective. Everything that travels has a depth `z`:

```
z = 1     the runner's screen depth (fixed, top 300)
z > 1     further up the aisle, toward the vanishing point
z < 1     between the runner and the camera
```

Screen position and size fall out of `1/z`:

```js
y     = HORIZON_Y + PERSP / z        // HORIZON_Y 30, PERSP 358
scale = 1 / z
x     = 195 + lane * LANE_X / z      // LANE_X 118
```

Sprites are authored at their size at `z = 1`, so a crate of romaine is
52 × 47.7 in the tables and the perspective does the rest. Items spawn at
`z = 4.2` — just under the vanishing point, about a second and a half of
warning at base speed — and are removed at `z = 0.40`, past the camera.

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
ART-BRIEF.md                          what art is still needed, and at what size
project/                              the original Claude Design source
```
