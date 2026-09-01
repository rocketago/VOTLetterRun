#!/usr/bin/env python3
"""Take the sky out of the corridor plate.

The corridor is drawn by scaling one self-similar image about its vanishing
point. That works for anything whose shape is a line through the vanishing
point - the path edges, the hedges - but a *smooth gradient* is not invariant
under that scaling, so each ring shows a differently stretched copy of the sky
and the copies disagree along every hole boundary. The seams are plainly
visible: in a pure-sky band the step across a boundary measured 160x the
gradient's own slope.

The sky is at infinity, so the fix is to stop it moving at all: key it out of
the plate, and paint one static gradient behind every ring.

    python3 tools/key_sky.py SOURCE.png

Writes assets/tex_aisle_ring.png and prints the CSS for #sky.
"""

import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGE_H = 844

# Light blue, and only light blue: the plate's water and shadows are blue too
# but much darker, so the blue floor separates them cleanly.
def sky_mask(rgb, alpha):
    return ((alpha == 255) & (rgb[:, :, 2] >= 200)
            & (rgb[:, :, 2] > rgb[:, :, 1]) & (rgb[:, :, 1] > rgb[:, :, 0]))


def main(src):
    im = Image.open(src).convert("RGBA")
    a = np.array(im).astype(int)
    H, W = a.shape[:2]
    rgb, al = a[:, :, :3], a[:, :, 3]
    m = sky_mask(rgb, al)

    # Report the hole before keying, while it is still the only transparency:
    # the whole zoom rests on it being the frame's own shape at half scale,
    # centred, and this is the last point at which that is measurable.
    ys0, xs0 = np.where(al == 0)
    if len(xs0):
        hw, hh = xs0.max() - xs0.min() + 1, ys0.max() - ys0.min() + 1
        print("hole     %d x %d, centre (%.1f, %.1f) against frame centre (%.1f, %.1f)"
              % (hw, hh, (xs0.min() + xs0.max() + 1) / 2, (ys0.min() + ys0.max() + 1) / 2, W / 2, H / 2))
        print("         ZOOM_RATIO_X %.4f   ZOOM_RATIO_Y %.4f" % (W / hw, H / hh))

    # Fit the gradient before keying, over the rows where the sky is a wide,
    # unbroken band; below that it is slivers between leaves and the mean is noisy.
    ys, cs = [], []
    for y in range(0, H):
        xs = np.where(m[y])[0]
        if len(xs) > W // 8:
            ys.append(y)
            cs.append(rgb[y][xs].mean(axis=0))
    ys, cs = np.array(ys), np.array(cs)
    fit = [np.polyfit(ys, cs[:, i], 1) for i in range(3)]
    resid = max(abs(cs[:, i] - np.polyval(fit[i], ys)).max() for i in range(3))

    def at(row):
        return tuple(int(round(min(255, max(0, np.polyval(f, row))))) for f in fit)

    out = np.array(im)
    out[:, :, 3][m] = 0
    # Hard alpha. The plate arrives with a feathered edge around the hole, and
    # a half-transparent pixel there is a blend of foliage and nothing, so it
    # lands on the ring behind as a discoloured hairline all the way round.
    # Both rings show the same art at that boundary, so a hard edge is
    # invisible where a soft one is not.
    soft = int(((out[:, :, 3] > 0) & (out[:, :, 3] < 255)).sum())
    out[:, :, 3] = np.where(out[:, :, 3] >= 128, 255, 0).astype(np.uint8)
    # WebP, not PNG. The plate is 924 x 2000 of hand-noised foliage, which PNG
    # cannot compress - it costs 832 KB there against 130 KB here, and lossy
    # WebP leaves the alpha channel bit-exact, so the hole keeps its geometry
    # while only the colour gives up about a level in 255.
    dst = os.path.join(ROOT, "assets", "tex_aisle_ring.webp")
    Image.fromarray(out).save(dst, "WEBP", quality=92, method=6, exact=False)

    top, bot = at(0), at(H - 1)
    print("sky      %d px (%.1f%%), rows %d-%d, linear to within %.2f/255"
          % (m.sum(), 100 * m.mean(), ys.min(), ys.max(), resid))
    print("feathered %d px snapped to hard alpha" % soft)
    print("keyed -> assets/tex_aisle_ring.webp  (%.0f KB)" % (os.path.getsize(dst) / 1024))
    print("#sky   background: linear-gradient(#%02x%02x%02x 0%%, #%02x%02x%02x 100%%);" % (top + bot))


if __name__ == "__main__":
    main(sys.argv[1])
