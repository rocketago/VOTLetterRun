#!/usr/bin/env python3
"""Placeholder pixel art for the snack-run items.

These are stand-ins so the retheme is playable before the real sprites land.
Each one is written at its FINAL filename, so dropping in real art is a
straight overwrite - no code changes needed. Delete this script once the
real sprites are in.

Run:  python3 tools/draw_placeholders.py
"""

import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

PX = 6          # one "pixel" of the art = 6 real px, to match the chunky source art
RED = (216, 64, 47)
ORANGE = (242, 169, 59)
DEEP = (176, 44, 32)
CREAM = (232, 226, 210)
GREEN = (154, 196, 106)
DEEP_GREEN = (94, 138, 60)
BEEF = (178, 59, 78)
TAN = (183, 158, 112)
MELON = (222, 158, 96)
STEEL = (142, 154, 174)
DARK = (20, 24, 32)
SKY = (110, 168, 214)


def canvas(w, h):
    return Image.new("RGBA", (w * PX, h * PX), (0, 0, 0, 0))


def box(d, x, y, w, h, fill):
    d.rectangle([x * PX, y * PX, (x + w) * PX - 1, (y + h) * PX - 1], fill=fill)


def save(im, name):
    im.save(os.path.join(OUT, name), optimize=True)
    print(f"{name:22} {im.size[0]:4}x{im.size[1]:<4}")


def chips_bag():
    """Doritos-ish bag: red foil, orange chevron, crimped top."""
    im = canvas(24, 21)
    d = ImageDraw.Draw(im)
    for i in range(14):                       # tapered bag body
        inset = 1 if i < 2 else 0
        box(d, 4 + inset, 5 + i, 16 - inset * 2, 1, RED if i % 7 else DEEP)
    box(d, 5, 3, 14, 2, DEEP)                 # crimped top
    for i in range(0, 14, 2):
        box(d, 5 + i, 2, 1, 1, DEEP)
    box(d, 8, 9, 8, 1, ORANGE)                # chevron
    box(d, 9, 10, 6, 1, ORANGE)
    box(d, 10, 11, 4, 1, ORANGE)
    box(d, 11, 12, 2, 1, ORANGE)
    box(d, 6, 16, 12, 1, DEEP)
    save(im, "pickup_chips.png")


def chip():
    """A single triangular chip, for the spill on a hit."""
    im = canvas(18, 22)
    d = ImageDraw.Draw(im)
    for i in range(12):                       # triangle
        box(d, 8 - i // 2, 5 + i, 2 + i, 1, ORANGE if i % 5 else (255, 200, 110))
    box(d, 4, 16, 10, 1, (200, 132, 40))      # shaded lower edge
    save(im, "chip_drop.png")


def lettuce():
    """Recalled romaine."""
    im = canvas(24, 22)
    d = ImageDraw.Draw(im)
    box(d, 5, 8, 14, 9, GREEN)
    box(d, 6, 6, 12, 2, GREEN)
    box(d, 4, 11, 1, 4, DEEP_GREEN)
    box(d, 19, 11, 1, 4, DEEP_GREEN)
    for x in (8, 12, 16):                     # leaf ribs
        box(d, x, 7, 1, 9, DEEP_GREEN)
    box(d, 5, 17, 14, 1, DEEP_GREEN)
    box(d, 9, 18, 6, 2, CREAM)                # recall tag
    box(d, 11, 19, 2, 1, RED)
    save(im, "obs_lettuce.png")


def beef():
    """Recalled ground beef in a tray."""
    im = canvas(24, 17)
    d = ImageDraw.Draw(im)
    box(d, 3, 6, 18, 8, CREAM)                # tray
    box(d, 4, 7, 16, 5, BEEF)                 # meat
    for x in range(5, 19, 3):
        box(d, x, 8, 1, 3, (150, 44, 60))
    box(d, 3, 14, 18, 1, TAN)
    box(d, 14, 4, 7, 3, CREAM)                # label
    box(d, 15, 5, 5, 1, RED)
    save(im, "obs_beef.png")


def melon():
    """Recalled cantaloupe."""
    im = canvas(24, 19)
    d = ImageDraw.Draw(im)
    box(d, 7, 5, 10, 11, MELON)
    box(d, 5, 7, 2, 7, MELON)
    box(d, 17, 7, 2, 7, MELON)
    for y in range(6, 15, 3):                 # netting
        box(d, 6, y, 12, 1, TAN)
    box(d, 11, 4, 2, 1, DEEP_GREEN)           # stem
    box(d, 8, 16, 8, 2, CREAM)                # recall tag
    box(d, 10, 17, 4, 1, RED)
    save(im, "obs_melon.png")


def vax():
    """The booster: a syringe, drawn on the diagonal so it reads at 26px."""
    im = canvas(20, 24)
    d = ImageDraw.Draw(im)
    box(d, 8, 4, 4, 12, CREAM)                # barrel
    box(d, 9, 6, 2, 9, SKY)                   # fluid
    box(d, 7, 2, 6, 2, STEEL)                 # plunger flange
    box(d, 9, 0, 2, 2, STEEL)                 # plunger rod
    box(d, 9, 16, 2, 2, STEEL)                # hub
    box(d, 9, 18, 1, 5, STEEL)                # needle
    box(d, 8, 8, 1, 5, (255, 255, 255))       # highlight
    save(im, "pickup_vax.png")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    chips_bag(); chip(); lettuce(); beef(); melon(); vax()
