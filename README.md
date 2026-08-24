# Files Run

A playable build of the Claude Design handoff in `project/` — an endless runner
about document custody. Mobile portrait, no build step, no dependencies.

Double-click `index.html` and it runs. To play it on a phone, or to get the
offline cache, serve it instead:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

On a phone, open the same URL and use **Add to Home Screen** — the manifest
launches it fullscreen in portrait, and the service worker caches everything so
a run survives a dead signal.

## Controls

| Input | Touch | Keyboard |
| --- | --- | --- |
| Change lane | swipe left / right | ← → or A D |
| Jump | swipe up | ↑ W or space |
| Start / restart | tap | enter |

## What's implemented

Four screens, built to the coordinates in `Files Run - Game Mockup.dc.html`:

- **Title** (mockup 2d) — walls plate, both sprites idling at their starting gap.
- **Gameplay HUD** (2a) — proximity meter, pages carried, distance, high score,
  control hints that fade after four seconds.
- **Power-up** (2b) — the `DELAYED` banner, and the doorway tableau frozen at the
  mockup's exact position (left 6 / bottom 22, 176 × 218) with the distraction
  figure inside and the pursuer leaning in after her.
- **Caught** (2c) — stats grid, dropped pages at three rotations, run again /
  share / leaderboard.

Plus a loading screen taken from the UI spec, a local leaderboard, and a how-to
panel. Two annotations from the mockup were dropped because they are spec
callouts rather than game UI: the `LANE 2` tag on the runner and the `SPR_*`
sprite labels. `2× SPEED` and `PULLED INTO THE ROOM` were kept — they read as
player feedback.

Mechanics follow the asset brief: three lanes, obstacles that scatter pages,
loose pages that go back in the folder, a proximity meter that fills over time
and jumps on every hit, `FX_GAS` on a random 4–9 s interval that slows him for
~1.5 s, and `DOOR_ROOM` in an outer lane only, which puts him in a private room
for six seconds while you run at double speed.

## Perspective

The world is one-point perspective. Everything that travels has a depth `z`:

```
z = 1     the runner's screen depth (fixed, top 300)
z > 1     further up the tunnel, toward the vanishing point
z < 1     between the runner and the camera
```

Screen position and size fall out of `1/z`:

```js
y     = HORIZON_Y + PERSP / z        // HORIZON_Y 30, PERSP 358
scale = 1 / z
x     = 195 + lane * LANE_X / z      // LANE_X 118
```

Sprites are authored at their size at `z = 1`, so a turnstile is 52 × 48.6 in the
tables and the perspective does the rest. Obstacles spawn at `z = 4.2` (just
under the vanishing point, roughly a second and a half of warning at base speed)
and are removed at `z = 0.40`, past the camera.

Note this differs from the static mockup, which spawned obstacles *below* the
runner's screen depth so nothing overlapped him in a still frame. In a real run
they have to cross his depth — that crossing is the collision — so they come
down from the vanishing point instead, which is also what gives the player time
to react.

## Tuning

Every number worth touching is a constant at the top of `game.js`: speed ramp,
proximity rates, page economy, jump arc and safe window, spawn gaps, and the gas
and doorway intervals.

## Assets

`assets/` is generated from the round-one art in `project/assets/` by
`tools/build_assets.py` — sheets resized to about 2.4× their largest on-screen
size and palette-quantised, backgrounds re-encoded as JPEG since the plates have
no alpha. That takes the payload from 7.5 MB to 1.7 MB. Re-run it if the art is
regenerated:

```
python3 tools/build_assets.py
```

Still missing from round one, and faked here as the design session did:
`spr_runner_lean_l/r`, `spr_runner_jump`, `spr_runner_stumble` and
`spr_pursuer_pulled`. Lane changes slide, the jump is an arc on the run cycle,
a hit pauses the cycle and flashes, and the pulled pursuer is a rotated run
frame. Dropping the real sheets in would only mean pointing the CSS at them.

## Repo layout

```
index.html  styles.css  game.js       the game
sw.js  manifest.webmanifest           offline cache, add-to-home-screen
assets/                               web-weight art, generated
tools/build_assets.py                 regenerates assets/ from project/assets/
project/                              the Claude Design source: mockup, UI spec,
                                      asset brief, and the round-one art
```
