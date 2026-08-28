# Snack Run — art needed

Everything the game loads, and what still has to be replaced. Drop files in at
these **exact filenames** under `assets/` and no code changes are needed.

Global rules, carried over from the original brief: pixel art, hard edges, no
anti-aliasing, no gradients inside sprites, transparent background. Back views
— the runner runs away from the camera, the pursuer runs toward it, so neither
needs a face. Multi-frame sprites ship as a **single horizontal strip** with
uniform, feet-aligned cells.

## Still needed

| File | Size 1× | Frames | What it is |
| --- | --- | --- | --- |
| `obs_01.png` … `obs_54.png` | 54 × 54 | 1 | The 54 obstacle types. Currently flat colour-coded squares from `tools/draw_obstacles.py`. Real sprites can be any aspect — set the per-type size in `OBSTACLE_ART` in `game.js` when they land. |
| `bg_aisle_floor.png` | 390 × 844 | tiling | Supermarket aisle floor: three lanes converging on a vanishing point at top centre, linoleum, seamless vertically. Replaces `bg_floor.jpg`. |
| `bg_aisle_shelves.png` | 390 × 844 | tiling | The same aisle seen with shelving down both sides, for the title screen. Replaces `bg_walls.jpg`. |

## In place

`runner_run.png` (8 frames, 114 × 228 cells) and `pursuer_run.png` (8 frames,
217 × 448 cells) are the real art, sliced with `tools/slice_sheets.py`. Both
display boxes were narrowed to match their aspect: the runner is 44 × 88 at
the runner's depth, the pursuer 101 × 208 at his base size.

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

`tools/food_sheet_map.txt` holds the cell-index to name mapping for the 9 × 6
food item sheet, if that art gets used for the obstacles later — one command
re-cuts all 50 items.

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
