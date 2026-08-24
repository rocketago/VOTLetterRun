# Files Run — Asset generation brief

For handing to Lovable. Everything below describes a 2D endless-runner in mobile portrait (390 × 844 logical px). Companion file: `Files Run - Game UI Spec.dc.html`.

---

## 1. Global style rules

Apply these to every asset request. Do not vary them per sprite.

- **Style:** pixel art, hard edges, no anti-aliasing, no gradients inside sprites, no outlines except where noted.
- **Authoring resolution:** 1× as listed in the table. Export 1×, 2×, 3× PNG with transparent background.
- **Palette:** use only the colors below. No new hues.
- **Camera:** the runner moves *away* from the camera, up the tunnel. The pursuer chases *toward* the camera from the bottom of frame. So the runner is drawn from behind and small; the pursuer is drawn from behind but large. Both are back views — no faces needed.
- **Lighting:** single dim source at the vanishing point ahead of the runner, so the top edge of each sprite catches a lighter value.
- **Contrast requirement:** every sprite must hold a ≥2.5:1 contrast against the floor band (`#10151D` → `#232C3A`). Suit navies must be raised, not darkened.

### Palette

| Token | Hex | Used for |
| --- | --- | --- |
| Tunnel dark | `#0B0D12` | Background, deepest shadow |
| Tunnel mid | `#12161E` | HUD panels, wall shadow |
| Floor near | `#232C3A` | Floor closest to camera |
| Wall tile | `#1B2330` | Tunnel wall tiles |
| Suit light | `#3B4761` | Pursuer suit torso |
| Suit dark | `#2C3548` | Pursuer trousers, shoes |
| Runner coat | `#2F4A78` | Runner's jacket |
| Runner hair | `#6B4A2F` | Runner's hair |
| Skin | `#E7B893` | Hands, neck |
| Blond | `#E8C169` | Pursuer hair, second figure's hair |
| Newsprint | `#E8E2D2` | Paper, folder, page stack |
| Paper edge | `#B79E70` | Folder trim, page shadow |
| Amber | `#F2A93B` | Lane rails, interactive UI, vanishing glow |
| Red | `#D8402F` | Pursuer's tie, loss states, proximity danger |
| Green | `#9AC46A` | Gas cloud, power-up active state |
| Dress red | `#B23B4E` | Second figure's dress |

Amber is the only interactive color. Red appears only on the tie and on loss. Green appears only for the gas effect and the power-up.

---

## 2. Sprite manifest

| Asset | Size 1× | Frames | Description |
| --- | --- | --- | --- |
| `SPR_RUNNER` | 64 × 78 | 8 | Back view, running away from camera, mid-stride cycle. Clutches a manila folder under the left arm. Folder must be drawn in three thickness tiers (full / half / thin) so the stack visibly depletes. |
| `SPR_RUNNER_LEAN_L` | 64 × 78 | 4 | Lane change left — body tilts, folder swings out. |
| `SPR_RUNNER_LEAN_R` | 64 × 78 | 4 | Mirror of the above. |
| `SPR_RUNNER_JUMP` | 64 × 78 | 4 | Crouch, launch, apex, land. |
| `SPR_RUNNER_STUMBLE` | 64 × 78 | 5 | Trips forward, arm flies up, pages leave the folder. |
| `SPR_PURSUER` | 116 × 166 | 8 | Largest sprite in the game. Heavy-set man in a light navy suit, blond hair, long red tie reaching below the belt. Back view, running toward camera, so he grows as he closes. The tie is the silhouette read — keep it centered and unbroken. |
| `SPR_PURSUER_PULLED` | 116 × 166 | 6 | Same figure yanked sideways out of frame by an off-screen arm; clears the frame by frame 6. |
| `SPR_DISTRACTION` | 72 × 150 | 4 | Woman in a red dress with blond hair, standing in a doorway, beckoning with one arm. Idle beckon (2 frames) then a pull (2 frames). Back-three-quarter view. |
| `DOOR_ROOM` | 148 × 176 | 2 | Open doorway set into the tunnel wall, warm amber light spilling out; frame 2 is the same door shut. `SPR_DISTRACTION` sits inside it. |
| `FX_GAS` | 96 × 52 | 6 | Soft green cloud puffing out low behind the pursuer, dissipating to nothing by frame 6. Rounded, semi-transparent, no outline. |
| `PICKUP_PAGES` | 48 × 24 | 4 | Cluster of three loose newsprint pages, gently bobbing. Bright against the floor. |
| `FX_PAGE_DROP` | 20 × 26 | 5 | One page tumbling end-over-end toward the camera. |
| `OBS_TURNSTILE` | 88 × 62 | 1 | Transit turnstile, dark metal with alternating light bars. |
| `OBS_CART` | 88 × 62 | 1 | Maintenance cart. Same footprint as the turnstile. |
| `OBS_GATE` | 88 × 62 | 1 | Folding service gate. Same footprint. |
| `BG_TUNNEL_WALLS` | 390 × 844 | tiling | Tiled subway wall, seamless vertically. |
| `BG_TUNNEL_FLOOR` | 390 × 844 | tiling | Floor with three lanes divided by amber rails converging on a vanishing point. Seamless vertically. |
| `BG_TUNNEL_GLOW` | 200 × 140 | 1 | Soft amber radial glow for the vanishing point. |
| `UI_ICON_PAUSE` | 26 × 26 | 1 | Two vertical bars, 2 px stroke. |
| `UI_PAGE_TILE` | 9 × 13 | 2 | Single page tile for the dashboard counter: filled (`#E8E2D2`) and empty (`#2A3140`). |

---

## 3. Prompt templates

Reuse the same preamble so the set stays consistent.

**Preamble (prepend to every request):**

> Pixel art sprite for a 2D endless-runner set in a dim subway tunnel. Hard-edged pixels, no anti-aliasing, no gradients, transparent background. Restricted palette only: [paste the palette rows you need]. Single dim light source ahead and above, so the top edge of the sprite catches a lighter value. Sprite must read clearly against a dark navy floor (#10151D to #232C3A).

**Runner:**

> [Preamble] 64 × 78 px, 8-frame run cycle. Back view of a young courier running away from the camera up the tunnel. Dark blue jacket (#2F4A78), brown hair (#6B4A2F), navy trousers (#1E2A3E). Carries a thick manila folder (#E8E2D2 with #B79E70 trim) clamped under the left arm. Sprite sheet, horizontal strip, uniform frame spacing.

**Pursuer:**

> [Preamble] 116 × 166 px, 8-frame run cycle. Back view of a large heavy-set man in a light navy suit (#3B4761 jacket, #2C3548 trousers) running toward the camera, so the sprite is the biggest thing on screen. Blond hair (#E8C169). A long red tie (#D8402F) hangs down the centre of his back silhouette and swings with the stride. Exaggerated, lumbering gait. Sprite sheet, horizontal strip.

**Distraction / doorway:**

> [Preamble] Two assets. (1) 148 × 176 px doorway set into a subway tile wall, warm amber light (#F2A93B) spilling from inside; second frame with the door shut. (2) 72 × 150 px woman in a red dress (#B23B4E) with blond hair (#E8C169) standing in that doorway and beckoning with one arm — 4 frames, idle beckon then a pull.

**Gas effect:**

> [Preamble] 96 × 52 px, 6 frames. A soft pale green (#9AC46A) cloud puffing outward low to the ground and dissipating to nothing by the last frame. Semi-transparent, rounded, no outline, no face or character in frame.

**Obstacles:**

> [Preamble] Three separate 88 × 62 px static sprites on the same footprint: a subway turnstile in dark metal with alternating light bars, a maintenance cart, and a folding service gate. Each must silhouette clearly against the dark floor.

**Backgrounds:**

> [Preamble] 390 × 844 px, seamlessly tiling vertically. Two layers, delivered separately: (1) subway wall of small dark tiles (#1B2330 with #151C27 grout), (2) tunnel floor darkening from #232C3A at the bottom to #10151D at the top, with three lanes divided by thin amber rails (#F2A93B) that converge toward a vanishing point at the top centre.

---

## 4. Naming and delivery

```
/assets
  /sprites
    spr_runner_1x.png        spr_runner_2x.png        spr_runner_3x.png
    spr_runner_lean_l_1x.png ...
    spr_pursuer_1x.png ...
    spr_pursuer_pulled_1x.png ...
    spr_distraction_1x.png ...
  /fx
    fx_gas_1x.png            fx_page_drop_1x.png
  /obstacles
    obs_turnstile_1x.png     obs_cart_1x.png          obs_gate_1x.png
  /pickups
    pickup_pages_1x.png
  /bg
    bg_tunnel_walls_1x.png   bg_tunnel_floor_1x.png   bg_tunnel_glow_1x.png
  /ui
    ui_icon_pause_1x.png     ui_page_tile_1x.png
  /doors
    door_room_1x.png
```

All multi-frame assets ship as a single horizontal sprite sheet plus a JSON descriptor:

```json
{ "name": "spr_pursuer", "frameWidth": 116, "frameHeight": 166, "frames": 8, "fps": 12 }
```

---

## 5. Behaviour notes the art has to support

- **Page stack depletion.** `SPR_RUNNER`'s folder needs three visible thickness tiers, switched by page count.
- **Proximity.** The pursuer scales from roughly 0.6× to 1.6× as he closes; the sprite must stay legible at both ends, so avoid detail finer than 2 px.
- **Gas timing.** `FX_GAS` fires on a random 4–9 s interval and slows the pursuer ~1.5 s. It plays low behind him and must not obscure his silhouette.
- **Power-up.** `DOOR_ROOM` spawns in an outer lane only, never the centre lane. `SPR_DISTRACTION` plays her pull, then `SPR_PURSUER_PULLED` exits frame; he re-enters from the bottom edge when the 6 s timer expires.
- **Hit reaction.** `SPR_RUNNER_STUMBLE` fires with 6–14 instances of `FX_PAGE_DROP`, tumbling toward the camera past the pursuer.

---

## 6. Typography

Not generated — loaded from Google Fonts.

- **Press Start 2P** — all numerals and game chrome.
- **Libre Baskerville**, italic — captions and flavour lines.
- **IBM Plex Mono** — small labels and metadata.

Minimum type size on screen: 9 px for uppercase tracked labels, 11 px for anything read as a sentence.
