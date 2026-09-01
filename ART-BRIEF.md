# Snack Run — art needed

Everything the game loads, and what still has to be replaced. Drop files in at
these **exact filenames** under `assets/` and no code changes are needed.

Global rules, carried over from the original brief: pixel art, hard edges, no
anti-aliasing, no gradients inside sprites, transparent background. Back views
— the runner runs away from the camera, the pursuer runs toward it, so neither
needs a face. Multi-frame sprites ship as a **single horizontal strip** with
uniform, feet-aligned cells.

## Still needed

| File | What it is |
| --- | --- |
| `pickup_vax.png` | The vaccine dose. Drawn by `tools/draw_placeholders.py`. |
| `pickup_tylenol.png` | The Tylenol bottle. Also drawn in code. |

Everything else is real art: the runner's eight frames, the pursuer's run
strip, the three chip bags, and all 50 recalled food items. Full sizes are in
the inventory at the bottom.

## The menu backdrop

`assets/bg_aisle.jpg` (768 × 1376) is the still plate behind the title, caught,
leaderboard and how-to screens, drawn with `background-size: cover`. It is not
in the run any more, so its geometry no longer constrains anything — swap it
freely.

## The corridor

The run's background is a single self-similar image,
`assets/tex_aisle_ring.webp`, zoomed about its vanishing point. Its geometry
drives the whole world: the
vanishing point is `HORIZON_Y` and the rate the aisle widens below it is
`AISLE_SPREAD`, and the three lanes are derived from those, so they sit inside
the shelves at whatever depth the runner stands.

The corridor is bright at the far end and pale underfoot, so the HUD sits on
scrims (`#scrimTop`, `#scrimBottom`) rather than directly on the art.

The property the whole effect rests on: **the image's centre must be a
transparent hole whose shape matches the frame, centred on the frame centre.**
Scaling the picture until the hole fills the frame then lays it exactly onto
itself, so the loop closes with no cross-fade and no constraint on how anything
inside is spaced. Measured on the plate in use:

| | |
| --- | --- |
| frame | 924 x 2000 |
| hole | 461 x 1000, centre within half a pixel of the frame's |
| zoom ratio | 2.0043 across, 2.0000 down |
| vanishing point | frame centre, so `HORIZON_Y` 422 |
| path edge | `AISLE_SPREAD` 0.3858, fitted to the grass over the near 500 rows |

Those live in `game.js`. **Replacing the art means re-measuring all of them** —
`tools/key_sky.py` prints the first three, and the last is a fit to whatever
bounds the walkable strip.

### Hand the plate to the tool, not to `assets/`

```
python3 tools/key_sky.py YOUR_PLATE.png
```

It does two things the plate cannot do for itself.

**It takes the sky out of the zoom.** Everything the ring scaling preserves is
a line *through* the vanishing point, which is why the path edges and the
hedges hold together — but a smooth sky gradient is not, so each ring shows a
differently stretched copy of it and the copies disagree along every hole
boundary. Those seams are stark: in a pure-sky band the step across one
measured 160x the gradient's own slope. The sky is at infinity, so it should
not move at all; the tool keys it out and prints a `#sky` gradient, fitted from
the plate, to sit behind every ring instead. That took the worst step to 2.5x,
which is below the plate's own dithering.

**It re-encodes.** The plate is 924 x 2000 of hand-noised foliage, which PNG
cannot compress — 832 KB there against 138 KB as WebP. The encode is lossy in
colour (about one level in 255) and bit-exact in alpha, so the hole keeps the
geometry the whole loop depends on.

Rings are drawn 1% oversized so the outermost one cannot leave a subpixel
hairline at the frame border as it scales past.

**To draw a replacement:** a corridor in one-point perspective, vanishing point
dead centre, with the far end left fully transparent — and the transparent
opening must be the frame's own shape at exactly half scale. Nothing else is
constrained; the interior can be as detailed as you like. Sky may be a
gradient; the tool will lift it out.

## The runner: one file per frame

The runner is **not** a sprite sheet — each pose is its own file, so a single
frame can be redrawn and dropped in without touching the others or the code.

| File | What it is |
| --- | --- |
| `assets/runner_01.png` | contact, right foot down |
| `assets/runner_02.png` | passing |
| `assets/runner_03.png` | push off |
| `assets/runner_04.png` | full stride, airborne |
| `assets/runner_05.png` | reach |
| `assets/runner_06.png` | contact, left foot down |
| `assets/runner_07.png` | passing |
| `assets/runner_08.png` | push off |

The pose names above describe the cycle the current art happens to run; what
matters is that the eight play in order as a loop.

**Requirements.** Any pixel size, as long as **all eight are identical
dimensions** and the figure is **aligned the same way in every frame** —
same feet line, same horizontal centre. The game scales the file to its box,
so a frame that is off-centre or a different size will make him jitter. Back
view, transparent background, PNG. Current frames are 114 × 228.

Aspect matters: the display box is 44 × 88, so a cell of ratio 0.5. A
different ratio is fine, but tell me and I will resize the box to match rather
than let it stretch.

To change the number of frames, set `RUNNER_FRAMES` in `game.js` and name the
files to match; `RUNNER_FRAME_MS` sets the pace (78 ms per frame, 52 ms while
Tylenol is up).

## Also in place

`pursuer_run.png` is real art — a single 8-frame strip, 217 × 448 cells, cut
with `tools/slice_sheets.py`. Say the word and it can be split into per-frame
files the same way. Both display boxes were narrowed to match their aspect:
the runner is 44 × 88 at his depth, the pursuer 101 × 208 at his base size.

One note on the pursuer: he is *between the camera and the runner*, so as he closes on
the runner he moves **up** the frame and gets slightly smaller — he is at his
largest when he is furthest behind you. Draw him to read at both ends.

## Slicing incoming sheets

`tools/slice_sheets.py` cuts both incoming formats. For a grid of food items,
dump a numbered contact sheet first, then pull cells out by index:

```
python3 tools/slice_sheets.py food SHEET.png --contact /tmp/index.png
python3 tools/slice_sheets.py food SHEET.png --pick 16=pickup_chips 34=obs_beef
```

For a horizontal run strip it trims every frame to one common, feet-aligned
box so the sprite does not bob, and repacks at the cell size the CSS expects:

```
python3 tools/slice_sheets.py pursuer SHEET.png --frames 8
```

It keys out a flat white background automatically when the sheet has no alpha.

## Placeholders in place

These work and are readable, but they were drawn in code by
`tools/draw_placeholders.py` and should be replaced when there is time.

| File | Size 1× | Frames | What it is |
| --- | --- | --- | --- |
| `pickup_chips.png` / `_b` / `_g` | 28 × 35 | 1 | Three chip bags, one picked per spawn. These are real art, cut from the food sheet. |
| `chip_drop.png` | 22 × 26.9 | 1 | A single chip, tumbling toward the camera. Spawned 6–14 at a time on a hit. |
| `pickup_vax.png` | 25 × 30 | 1 | A dose — a syringe. Banks an extra life. Carries a soft blue glow in CSS, so the sprite itself does not need one. |
| `pickup_tylenol.png` | 25 × 30 | 1 | Tylenol — a pill bottle. Six seconds at double speed. Amber glow in CSS. |

Sizes above are the sprite's size **at the runner's depth**; the perspective
scales everything from about 0.24× at spawn to 2.4× as it passes the camera,
so author with headroom.

The 50 obstacles are the food sheet, already in. `tools/food_sheet_map.txt`
holds the cell-index to name mapping for the 9 × 6 grid, so one command re-cuts
the whole set if the sheet is redrawn:

```
python3 tools/slice_sheets.py food SHEET.png --pick $(grep -v '^#' tools/food_sheet_map.txt | tr '\n' ' ')
```

Each is then scaled so its long side is 58 at the runner's depth, keeping the
art's own aspect — that table is `OBSTACLE_ART` in `game.js`. Collision is
lane-and-depth, not pixels, so those sizes only decide how big a thing reads.

## Gone

The previous theme's `distraction.png`, `door_open.png`, `door_shut.png`,
`gas.png`, `pickup_pages.png`, `page_drop.png` and the three subway obstacles
have been deleted — nothing loads them any more.

## Palette

The chrome still runs on the original tokens, which suit a snack theme almost
unchanged — the red and amber are already close to a chip bag.

| Token | Hex | Used for |
| --- | --- | --- |
| Dark | `#0B0D12` | Background, deepest shadow |
| Panel | `#12161E` | HUD panels |
| Newsprint | `#EFEAE0` | Type, packaging |
| Slate | `#8E9AAE` | Secondary labels |
| Amber | `#F2A93B` | Interactive, chip orange, lane rails |
| Red | `#D8402F` | Loss states, proximity danger, bag foil |
| Green | `#9AC46A` | Booster active, produce |
| Blue | `#6EA8D6` | The booster's glow |

## Typography

Loaded from Google Fonts, not generated: **Press Start 2P** for numerals and
game chrome, **Libre Baskerville** italic for captions, **IBM Plex Mono** for
small labels.
