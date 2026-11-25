"""Cut a character/prop out of an image with a plain paper or chroma-green background -> transparent PNG.

usage:
  python tools/cutout.py in.jpg out.png [--height 640] [--thresh 38] [--holes]
  python tools/cutout.py sheet.png out.png --chroma [--height 640]

--holes   also removes enclosed patches of background (e.g. between shelf brackets).
--chroma  chroma-key bright green (#00FF00) background with green despill (best for characters).
--soft    soft keying for white backgrounds: keeps glows/dust semi-transparent.
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
ap.add_argument("--chroma", action="store_true",
                help="chroma-key bright green (#00FF00) background with despill")
ap.add_argument("--soft", action="store_true",
                help="soft keying for white backgrounds: keeps glows/dust semi-transparent")
ap.add_argument("--lo", type=float, default=20, help="--soft: colour distance that is fully transparent")
ap.add_argument("--hi", type=float, default=75, help="--soft: colour distance that is fully opaque")
args = ap.parse_args()


def decontaminate_edges(rgb: np.ndarray, alpha: np.ndarray, passes: int = 5) -> np.ndarray:
    """Bleed clean interior foreground colors outward into semi-transparent edges to prevent light halos."""
    h, w, _ = rgb.shape
    out = rgb.copy().astype(np.float32)
    # Mark interior opaque pixels that aren't bright edge halos
    solid = alpha >= 235
    for _ in range(passes):
        padded_s = np.pad(solid, 1, mode="constant", constant_values=False)
        padded_c = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode="edge")
        cnt = np.zeros((h, w), dtype=np.float32)
        acc = np.zeros((h, w, 3), dtype=np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                s = padded_s[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                c = padded_c[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                cnt += s
                acc += c * s[..., None]
        fill = (~solid) & (cnt > 0)
        out[fill] = acc[fill] / cnt[fill, None]
        solid = solid | fill
    return np.clip(out, 0, 255).astype(np.uint8)


src = Image.open(args.src)
if not args.chroma and src.mode in ("RGBA", "LA", "P") and src.convert("RGBA").getextrema()[3][0] < 10:
    # already has real transparency -> resize (premultiplied), decontaminate edges, and crop
    rgba = np.asarray(src.convert("RGBA")).astype(np.float32)
    al = rgba[..., 3:] / 255
    pm = Image.fromarray(np.dstack([rgba[..., :3] * al, rgba[..., 3:]]).astype(np.uint8), "RGBA")
    size = (round(src.width * args.height / src.height), args.height)
    pm = np.asarray(pm.resize(size, Image.LANCZOS)).astype(np.float32)
    al = pm[..., 3:] / 255
    rgb = np.where(al > 0, pm[..., :3] / np.maximum(al, 1e-3), 0)
    alpha_u8 = pm[..., 3].astype(np.uint8)
    rgb_clean = decontaminate_edges(np.clip(rgb, 0, 255).astype(np.uint8), alpha_u8)
    out = Image.fromarray(np.dstack([rgb_clean, alpha_u8]), "RGBA")
    out = out.crop(Image.fromarray(((alpha_u8 > 24) * 255).astype(np.uint8)).getbbox())
    out.save(args.dst)
    print("saved (source alpha)", args.dst, out.size)
    raise SystemExit

img = src.convert("RGB")
img = img.resize((round(img.width * args.height / img.height), args.height), Image.LANCZOS)
a = np.asarray(img).astype(np.int16)
h, w, _ = a.shape

if args.chroma:
    f = a.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    max_rb = np.maximum(r, b)
    excess = g - max_rb
    alpha = np.where(excess <= 12, 1.0, 1.0 - np.clip((excess - 35.0) / 60.0, 0.0, 1.0))
    alpha[alpha < 0.06] = 0.0
    # Despill green bounce light
    g_clean = np.where(g > max_rb + 6, max_rb + np.minimum(6.0, (g - max_rb) * 0.15), g)
    rgb = np.stack([r, g_clean, b], axis=-1).clip(0, 255).astype(np.uint8)
    alpha_u8 = (alpha * 255).astype(np.uint8)
    rgb = decontaminate_edges(rgb, alpha_u8, passes=6)
    out = Image.fromarray(np.dstack([rgb, alpha_u8]), "RGBA")
    bbox = Image.fromarray(((alpha_u8 > 16) * 255).astype(np.uint8)).getbbox()
    if bbox:
        out = out.crop(bbox)
    out.save(args.dst)
    print("saved (chroma)", args.dst, out.size)
    raise SystemExit

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

alpha_img = (Image.fromarray((fg * 255).astype(np.uint8))
             .filter(ImageFilter.MinFilter(3))        # eat the 1px paper halo
             .filter(ImageFilter.GaussianBlur(0.7)))
alpha_u8 = np.asarray(alpha_img)
rgb_clean = decontaminate_edges(np.asarray(img), alpha_u8, passes=5)
out = Image.fromarray(np.dstack([rgb_clean, alpha_u8]), "RGBA")
out = out.crop(out.getbbox())
out.save(args.dst)
print("saved", args.dst, out.size)
