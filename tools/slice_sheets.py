#!/usr/bin/env python3
"""Cut incoming art sheets into the game's named sprites.

Two sheets:

  food     a grid of individual food items (default 9 x 6). Each cell is
           trimmed to its own content, so the items keep their relative sizes.
  pursuer  a horizontal run strip (default 8 frames), trimmed to a common,
           feet-aligned box so the sprite does not bob between frames.

Usage
  # 1. look at what is in the grid — writes a numbered contact sheet
  python3 tools/slice_sheets.py food SHEET.png --contact /tmp/food_index.png

  # 2. pull the cells you want out by index (0-based, left to right, top down)
  python3 tools/slice_sheets.py food SHEET.png --pick 16=pickup_chips 34=obs_beef

  # 3. the run strip
  python3 tools/slice_sheets.py pursuer SHEET.png --frames 8
"""

import argparse
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")

# Target cell for the run strip, matching what the CSS expects (2.4x display size).
PURSUER_CELL = (253, 404)


def dekey(im, tol=18):
    """Drop a flat white/near-white background if the sheet has no alpha to start."""
    im = im.convert("RGBA")
    if im.getchannel("A").getextrema()[0] < 255:
        return im                                   # already has real transparency
    px = im.load()
    w, h = im.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not all(c[0] > 255 - tol and c[1] > 255 - tol and c[2] > 255 - tol for c in corners):
        return im                                   # background is not white, leave it
    out = im.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r > 255 - tol and g > 255 - tol and b > 255 - tol:
                o[x, y] = (r, g, b, 0)
    return out


def cells(im, cols, rows):
    cw, ch = im.width // cols, im.height // rows
    for r in range(rows):
        for c in range(cols):
            yield im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))


def contact_sheet(tiles, path, cols):
    tw = max(t.width for t in tiles) + 8
    th = max(t.height for t in tiles) + 20
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (tw * cols, th * rows), (24, 28, 38, 255))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(tiles):
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.alpha_composite(t, (x + (tw - t.width) // 2, y + 16 + (th - 20 - t.height) // 2))
        d.text((x + 4, y + 3), str(i), fill=(242, 169, 59, 255))
    sheet.convert("RGB").save(path)
    print(f"contact sheet -> {path}  ({len(tiles)} cells)")


def do_food(args):
    im = dekey(Image.open(args.sheet))
    tiles = []
    for cell in cells(im, args.cols, args.rows):
        bbox = cell.getbbox()
        tiles.append(cell.crop(bbox) if bbox else cell)
    if args.contact:
        contact_sheet(tiles, args.contact, args.cols)
    for spec in args.pick:
        idx, name = spec.split("=", 1)
        t = tiles[int(idx)]
        t.save(os.path.join(OUT, name + ".png"), optimize=True)
        print(f"{name+'.png':22} {t.size[0]:4}x{t.size[1]:<4}  (cell {idx})")


def do_pursuer(args):
    im = dekey(Image.open(args.sheet))
    fw = im.width // args.frames
    raw = [im.crop((i * fw, 0, (i + 1) * fw, im.height)) for i in range(args.frames)]
    boxes = [f.getbbox() for f in raw]
    # One box for every frame: widest silhouette, tallest span, bottoms aligned.
    left = min(b[0] for b in boxes if b)
    right = max(b[2] for b in boxes if b)
    top = min(b[1] for b in boxes if b)
    bottom = max(b[3] for b in boxes if b)
    cw, ch = PURSUER_CELL
    sheet = Image.new("RGBA", (cw * args.frames, ch), (0, 0, 0, 0))
    for i, f in enumerate(raw):
        cell = f.crop((left, top, right, bottom)).resize((cw, ch), Image.LANCZOS)
        sheet.paste(cell, (i * cw, 0))
    sheet.save(os.path.join(OUT, args.name + ".png"), optimize=True)
    print(f"{args.name+'.png':22} {sheet.size[0]:4}x{sheet.size[1]:<4}  {args.frames} frames")
    print(f"  -> set the sheet's background-size to {args.frames * 100}% 100% and "
          f"steps({args.frames}, jump-none) in styles.css")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="mode", required=True)

    f = sp.add_parser("food")
    f.add_argument("sheet")
    f.add_argument("--cols", type=int, default=9)
    f.add_argument("--rows", type=int, default=6)
    f.add_argument("--contact")
    f.add_argument("--pick", nargs="*", default=[], metavar="INDEX=NAME")
    f.set_defaults(fn=do_food)

    p = sp.add_parser("pursuer")
    p.add_argument("sheet")
    p.add_argument("--frames", type=int, default=8)
    p.add_argument("--name", default="pursuer_run")
    p.set_defaults(fn=do_pursuer)

    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    a.fn(a)
