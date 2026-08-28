#!/usr/bin/env python3
"""54 placeholder obstacle sprites: one flat square per type, each its own colour.

Stand-ins until the real food art lands. Colours are stepped by the golden
angle so consecutive indices land far apart on the wheel, and lightness
alternates across three bands so neighbours differ in value as well as hue.
Every square carries a darker outline and a lighter top edge, so it reads as a
solid block against the floor rather than a flat patch of colour.

Run:  python3 tools/draw_obstacles.py
"""

import colorsys
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

COUNT = 54
SIZE = 128          # authored size; the game draws them at 54 x 54
GOLDEN = 0.381966   # 1 - 1/phi, in turns
BANDS = (0.44, 0.56, 0.68)


def shade(rgb, k):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def square(i):
    h = (i * GOLDEN) % 1.0
    light = BANDS[i % len(BANDS)]
    sat = 0.72 if i % 2 else 0.58
    base = tuple(int(c * 255) for c in colorsys.hls_to_rgb(h, light, sat))

    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    b = 8                                     # inset, so the sprite has some air
    d.rectangle([b, b, SIZE - b - 1, SIZE - b - 1], fill=base)
    d.rectangle([b, b, SIZE - b - 1, SIZE - b - 1], outline=shade(base, 0.45), width=6)
    d.rectangle([b + 6, b + 6, SIZE - b - 7, b + 16], fill=shade(base, 1.28))   # top light
    d.rectangle([b + 6, SIZE - b - 17, SIZE - b - 7, SIZE - b - 7],
                fill=shade(base, 0.72))                                        # bottom shade
    return im


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for i in range(COUNT):
        square(i).save(os.path.join(OUT, f"obs_{i + 1:02d}.png"), optimize=True)
    print(f"wrote {COUNT} placeholder obstacles: obs_01.png .. obs_{COUNT:02d}.png")
