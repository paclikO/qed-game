"""Cut a character/prop out of an image with a plain paper background -> transparent PNG.

usage:
  python tools/cutout.py in.jpg out.png [--height 640] [--thresh 38] [--holes]

--holes  also removes enclosed patches of background (e.g. the triangle between a shelf
         bracket and the plank). Don't use it for characters: light skin can look like paper.
Needs: pip install pillow numpy
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--height", type=int, default=640)
ap.add_argument("--thresh", type=float, default=38)
ap.add_argument("--holes", action="store_true")
ap.add_argument("--soft", action="store_true",
                help="soft keying for white backgrounds: keeps glows/dust semi-transparent")
ap.add_argument("--lo", type=float, default=20, help="--soft: colour distance that is fully transparent")
ap.add_argument("--hi", type=float, default=75, help="--soft: colour distance that is fully opaque")
args = ap.parse_args()

src = Image.open(args.src)
if src.mode in ("RGBA", "LA", "P") and src.convert("RGBA").getextrema()[3][0] < 10:
    # already has real transparency -> just resize (premultiplied) and crop
    rgba = np.asarray(src.convert("RGBA")).astype(np.float32)
    al = rgba[..., 3:] / 255
    pm = Image.fromarray(np.dstack([rgba[..., :3] * al, rgba[..., 3:]]).astype(np.uint8), "RGBA")
    size = (round(src.width * args.height / src.height), args.height)
    pm = np.asarray(pm.resize(size, Image.LANCZOS)).astype(np.float32)
    al = pm[..., 3:] / 255
    rgb = np.where(al > 0, pm[..., :3] / np.maximum(al, 1e-3), 0)
    out = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), pm[..., 3:]]).astype(np.uint8), "RGBA")
    out = out.crop(Image.fromarray(((pm[..., 3] > 24) * 255).astype(np.uint8)).getbbox())
    out.save(args.dst)
    print("saved (source alpha)", args.dst, out.size)
    raise SystemExit

img = src.convert("RGB")
img = img.resize((round(img.width * args.height / img.height), args.height), Image.LANCZOS)
a = np.asarray(img).astype(np.int16)
h, w, _ = a.shape

if args.soft:
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bgc = np.median(edge, axis=0).astype(np.float32)
    f = a.astype(np.float32)
    d = np.sqrt(((f - bgc) ** 2).sum(axis=2))
    alpha = np.clip((d - args.lo) / (args.hi - args.lo), 0, 1)
    # drop isolated specks / compression noise
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
    alpha = np.asarray(alpha_img).astype(np.float32) / 255
    alpha[alpha < 0.08] = 0
    # gently un-mix the background colour (capped so faint pixels don't turn into coloured fringes)
    rgb = bgc + (f - bgc) / np.maximum(alpha, 0.6)[..., None]
    rgb = np.clip(rgb, 0, 255)
    rgb[alpha == 0] = f[alpha == 0]  # keep invisible pixels neutral so resizing doesn't bleed colour
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out = out.crop(Image.fromarray((alpha > 0.05).astype(np.uint8) * 255).getbbox())
    out.save(args.dst)
    print("saved", args.dst, out.size)
    raise SystemExit
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def components(mask):
    """Yield (pixels, touches_border) for 4-connected components of mask."""
    seen = np.zeros_like(mask)
    for sy in range(h):
        for sx in range(w):
            if mask[sy, sx] and not seen[sy, sx]:
                seen[sy, sx] = True
                q, px, border = deque([(sy, sx)]), [], False
                while q:
                    y, x = q.popleft()
                    px.append((y, x))
                    border |= y in (0, h - 1) or x in (0, w - 1)
                    for dy, dx in N4:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                yield px, border


border_px = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
paper = np.median(border_px, axis=0)
dist = np.sqrt(((a - paper) ** 2).sum(axis=2))

bg = np.zeros((h, w), bool)
for px, touches in components(dist < args.thresh):
    ys, xs = zip(*px)
    strict_hole = args.holes and len(px) > 60 and dist[ys, xs].mean() < args.thresh * 0.55
    if touches or strict_hole:
        bg[ys, xs] = True

# keep the largest foreground component plus any other big piece; drops paper specks
fg = np.zeros((h, w), bool)
comps = [px for px, _ in components(~bg)]
largest = max(comps, key=len)
for px in comps:
    if px is largest or len(px) > 400:
        ys, xs = zip(*px)
        fg[ys, xs] = True

alpha = (Image.fromarray((fg * 255).astype(np.uint8))
         .filter(ImageFilter.MinFilter(3))        # eat the 1px paper halo
         .filter(ImageFilter.GaussianBlur(0.7)))
out = img.copy()
out.putalpha(alpha)
out = out.crop(out.getbbox())
out.save(args.dst)
print("saved", args.dst, out.size)
