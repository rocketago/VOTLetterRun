#!/usr/bin/env python3
"""Repack the round-one art from the Claude Design handoff into web-weight assets.

Source of truth: project/assets/ (sheets already sliced to uniform, feet-aligned
cells by the design session). This script only resizes and compresses:

  * sprite sheets  -> PNG, palette-quantised, cell height ~2.4x max display size
  * backgrounds    -> JPEG (no alpha in the source plates)

Run:  python3 tools/build_assets.py
"""

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "project", "assets")
OUT = os.path.join(ROOT, "assets")

# name -> (frames, target cell width, target cell height)
# Target ≈ 2.4x the largest on-screen size the sprite reaches at the 390x844 stage,
# so it stays crisp at dpr 2–3 without shipping the full authoring resolution.
SHEETS = {
    "runner_run": (8, 129, 211),
    "pursuer_run": (7, 253, 404),
    "distraction": (4, 148, 278),
    "gas": (6, 178, 144),
}

# name -> (target width, target height); None keeps the native size
STILLS = {
    "obs_turnstile": (274, 256),
    "obs_cart": (274, 200),
    "obs_gate": (274, 228),
    "pickup_pages": (168, 147),
    "page_drop": (125, 151),
    "door_open": (424, 524),
    "door_shut": (411, 524),
}

BACKGROUNDS = {
    "bg_floor": (780, 1690),
    "bg_walls": (780, 1690),
}


def quantise(im):
    """Palette-reduce while keeping hard alpha — the art is flat pixel art."""
    alpha = im.getchannel("A")
    rgb = im.convert("RGB").quantize(colors=250, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = rgb.convert("RGBA")
    out.putalpha(alpha.point(lambda v: 255 if v > 128 else 0))
    return out


def build_sheet(name, frames, cw, ch):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    src_cw = im.width // frames
    sheet = Image.new("RGBA", (cw * frames, ch), (0, 0, 0, 0))
    for i in range(frames):
        cell = im.crop((i * src_cw, 0, (i + 1) * src_cw, im.height))
        sheet.paste(cell.resize((cw, ch), Image.LANCZOS), (i * cw, 0))
    quantise(sheet).save(os.path.join(OUT, name + ".png"), optimize=True)
    return sheet.size


def build_still(name, size):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    if size:
        im = im.resize(size, Image.LANCZOS)
    quantise(im).save(os.path.join(OUT, name + ".png"), optimize=True)
    return im.size


def build_bg(name, size):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGB").resize(size, Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".jpg"), quality=86, optimize=True, progressive=True)
    return im.size


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, (frames, cw, ch) in SHEETS.items():
        size = build_sheet(name, frames, cw, ch)
        kb = os.path.getsize(os.path.join(OUT, name + ".png")) // 1024
        total += kb
        print(f"{name+'.png':22} {size[0]:5}x{size[1]:<5} {frames} frames  {kb:5} KB")
    for name, size in STILLS.items():
        size = build_still(name, size)
        kb = os.path.getsize(os.path.join(OUT, name + ".png")) // 1024
        total += kb
        print(f"{name+'.png':22} {size[0]:5}x{size[1]:<5} {'':9} {kb:5} KB")
    for name, size in BACKGROUNDS.items():
        size = build_bg(name, size)
        kb = os.path.getsize(os.path.join(OUT, name + ".jpg")) // 1024
        total += kb
        print(f"{name+'.jpg':22} {size[0]:5}x{size[1]:<5} {'':9} {kb:5} KB")
    print(f"{'total':22} {'':17} {total:5} KB")


if __name__ == "__main__":
    main()
