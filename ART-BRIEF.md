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
| `runner_run.png` | 64 × 78 | 8 | Back view, running away up the aisle, mid-stride cycle. Arms full of chip bags — drawn in three thickness tiers (full / half / thin) so the armful visibly depletes. |
| `pursuer_run.png` | 116 × 166 | 8 | The Secretary, back view, running toward the camera. Biggest sprite in the game — nothing finer than 2 px, since he scales from about 0.85× to 1×. |
| `bg_aisle_floor.png` | 390 × 844 | tiling | Supermarket aisle floor: three lanes converging on a vanishing point at top centre, linoleum, seamless vertically. Replaces `bg_floor.jpg`. |
| `bg_aisle_shelves.png` | 390 × 844 | tiling | The same aisle seen with shelving down both sides, for the title screen. Replaces `bg_walls.jpg`. |

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
| `pickup_chips.png` | 28 × 24.5 | 1 | A bag of chips on the floor. Bright against the aisle. Bobs in place. |
| `chip_drop.png` | 22 × 26.9 | 1 | A single chip, tumbling toward the camera. Spawned 6–14 at a time on a hit. |
| `obs_lettuce.png` | 52 × 47.7 | 1 | Recalled romaine. |
| `obs_beef.png` | 54 × 38.3 | 1 | Recalled ground beef in a tray. |
| `obs_melon.png` | 52 × 41.2 | 1 | Recalled cantaloupe. |
| `pickup_vax.png` | 25 × 30 | 1 | A dose — a syringe. Banks an extra life. Carries a soft blue glow in CSS, so the sprite itself does not need one. |
| `pickup_tylenol.png` | 25 × 30 | 1 | Tylenol — a pill bottle. Six seconds at double speed. Amber glow in CSS. |

The three obstacles share a footprint and must silhouette clearly against the
floor. Sizes above are the sprite's size **at the runner's depth**; the
perspective scales them from about 0.24× at spawn to 2.4× as they pass the
camera, so author with headroom.

## No longer used

`distraction.png`, `door_open.png`, `door_shut.png` and `gas.png` are left over
from the previous theme. The doorway power-up was replaced by the booster
pickup and the gas effect by a text beat, so nothing loads them — they can be
deleted once you are sure the theme is settled.

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
