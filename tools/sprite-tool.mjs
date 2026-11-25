// Zero-dependency Node.js PNG decoder/encoder + sprite cutout / defringe / sheet packer utility.
// Usage:
//   node tools/sprite-tool.mjs inspect <file.png>
//   node tools/sprite-tool.mjs defringe <in.png> <out.png> [--erode 0] [--bg white|cream] [--drop-specks]
//   node tools/sprite-tool.mjs chroma <in.png> <out.png> [--cols 4 --rows 2 --frame-h 256]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ------------------------------------------------------------------ minimal PNG read/write (8-bit RGBA/RGB)
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error(`Not a PNG: ${filePath}`);
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  let palette = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Unsupported bitDepth ${bitDepth} in ${filePath}`);
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 3 ? 1 : 1;
  const stride = w * bpp;
  const recon = new Uint8Array(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[pos++];
      const a = x >= bpp ? recon[row + x - bpp] : 0;
      const b = y > 0 ? recon[row - stride + x] : 0;
      const c = y > 0 && x >= bpp ? recon[row - stride + x - bpp] : 0;
      let val = v;
      if (filter === 1) val = (v + a) & 255;
      else if (filter === 2) val = (v + b) & 255;
      else if (filter === 3) val = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (v + paeth(a, b, c)) & 255;
      recon[row + x] = val;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    if (colorType === 6) {
      rgba[p] = recon[i * 4]; rgba[p + 1] = recon[i * 4 + 1]; rgba[p + 2] = recon[i * 4 + 2]; rgba[p + 3] = recon[i * 4 + 3];
    } else if (colorType === 2) {
      rgba[p] = recon[i * 3]; rgba[p + 1] = recon[i * 3 + 1]; rgba[p + 2] = recon[i * 3 + 2]; rgba[p + 3] = 255;
    } else if (colorType === 4) {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = recon[i * 2]; rgba[p + 3] = recon[i * 2 + 1];
    } else if (colorType === 0) {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = recon[i]; rgba[p + 3] = 255;
    } else if (colorType === 3) {
      const idx = recon[i];
      rgba[p] = palette[idx * 3]; rgba[p + 1] = palette[idx * 3 + 1]; rgba[p + 2] = palette[idx * 3 + 2];
      rgba[p + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return { w, h, data: rgba };
}

export function writePng(filePath, w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 1; // Sub filter for good compression
    const src = y * stride, dst = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[src + x - 4] : 0;
      raw[dst + x] = (rgba[src + x] - a) & 255;
    }
  }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const comp = zlib.deflateSync(raw, { level: 9 });
  fs.writeFileSync(filePath, Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', comp), chunk('IEND', Buffer.alloc(0))]));
}

// ------------------------------------------------------------------ image ops
function getIdx(w, x, y) { return (y * w + x) * 4; }

/** Replace RGB of edge / semi-transparent pixels with the nearest interior solid color (eliminates pale halos on dark backgrounds). */
function decontaminateEdges(img, {
  solidAlpha = 235,
  brightFringeLum = 175,
  trimBrightEdge = true,
  erodePasses = 0,
  dropSpecks = false,
  minComponentPx = 60,
} = {}) {
  const { w, h, data } = img;
  const out = new Uint8Array(data);

  // Optional: trim 1px of bright pale fringe pixels that are nearly opaque right next to transparency
  if (trimBrightEdge) {
    const toFade = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = getIdx(w, x, y);
        const a = out[i + 3];
        if (a === 0) continue;
        // Check if within 2px of a transparent pixel
        let nearTrans = false;
        for (let dy = -2; dy <= 2 && !nearTrans; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || out[getIdx(w, nx, ny) + 3] < 40) {
              nearTrans = true; break;
            }
          }
        }
        if (!nearTrans) continue;
        const r = out[i], g = out[i + 1], b = out[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        // Pale cream/white pixel sitting right on the outside boundary
        if (lum > brightFringeLum && sat < 45) {
          toFade.push(i);
        }
      }
    }
    for (const i of toFade) {
      const r = out[i], g = out[i + 1], b = out[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 215) out[i + 3] = 0;
      else out[i + 3] = Math.round(out[i + 3] * Math.max(0, (215 - lum) / (215 - brightFringeLum)));
    }
  }

  // Optional morphological erosion of alpha
  for (let p = 0; p < erodePasses; p++) {
    const prev = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) prev[k] = out[k * 4 + 3];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let mn = prev[y * w + x];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) mn = 0;
            else if (prev[ny * w + nx] < mn) mn = prev[ny * w + nx];
          }
        }
        out[(y * w + x) * 4 + 3] = mn;
      }
    }
  }

  // Optional: remove tiny isolated floating specks
  if (dropSpecks) {
    const seen = new Uint8Array(w * h);
    for (let sy = 0; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) {
        const sIdx = sy * w + sx;
        if (seen[sIdx] || out[sIdx * 4 + 3] < 20) continue;
        const q = [sIdx];
        seen[sIdx] = 1;
        let qi = 0;
        while (qi < q.length) {
          const cur = q[qi++];
          const cx = cur % w, cy = (cur / w) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (!seen[ni] && out[ni * 4 + 3] >= 20) { seen[ni] = 1; q.push(ni); }
          }
        }
        if (q.length < minComponentPx) {
          for (const idx of q) out[idx * 4 + 3] = 0;
        }
      }
    }
  }

  // Flood-bleed solid interior colors outward into semi-transparent & edge pixels (5 passes)
  // This ensures alpha-blended edges on dark backgrounds carry the ink/object color, NEVER white/beige paper!
  const solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const a = out[k * 4 + 3];
      if (a >= solidAlpha) {
        // Also avoid marking bright rim pixels right next to alpha<100 as "clean interior"
        let touchingEdge = false;
        for (let dy = -1; dy <= 1 && !touchingEdge; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || out[(ny * w + nx) * 4 + 3] < 120) {
              touchingEdge = true; break;
            }
          }
        }
        const r = out[k * 4], g = out[k * 4 + 1], b = out[k * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (!touchingEdge || lum < 130) solid[k] = 1;
      }
    }
  }

  let curSolid = new Uint8Array(solid);
  for (let pass = 0; pass < 6; pass++) {
    const nextSolid = new Uint8Array(curSolid);
    const nextRgb = new Uint8Array(out);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (curSolid[k]) continue;
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = ny * w + nx;
            if (curSolid[nk]) {
              sr += out[nk * 4]; sg += out[nk * 4 + 1]; sb += out[nk * 4 + 2]; cnt++;
            }
          }
        }
        if (cnt > 0) {
          nextRgb[k * 4] = Math.round(sr / cnt);
          nextRgb[k * 4 + 1] = Math.round(sg / cnt);
          nextRgb[k * 4 + 2] = Math.round(sb / cnt);
          nextSolid[k] = 1;
        }
      }
    }
    out.set(nextRgb);
    curSolid = nextSolid;
  }

  // Soft 1px outer alpha smoothing ONLY where alpha transitions sharply 255 -> 0
  return { w, h, data: out };
}

/** High-quality Lanczos-like area/bicubic downscale (premultiplied alpha so zero dark/light fringes). */
export function resizeRgba(src, newW, newH) {
  const dst = new Uint8Array(newW * newH * 4);
  const xRatio = src.w / newW, yRatio = src.h / newH;
  for (let dy = 0; dy < newH; dy++) {
    const sy0 = dy * yRatio, sy1 = (dy + 1) * yRatio;
    const iy0 = Math.floor(sy0), iy1 = Math.min(src.h - 1, Math.ceil(sy1) - 1);
    for (let dx = 0; dx < newW; dx++) {
      const sx0 = dx * xRatio, sx1 = (dx + 1) * xRatio;
      const ix0 = Math.floor(sx0), ix1 = Math.min(src.w - 1, Math.ceil(sx1) - 1);
      let r = 0, g = 0, b = 0, a = 0, wSum = 0;
      for (let sy = iy0; sy <= iy1; sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = ix0; sx <= ix1; sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const wt = wx * wy;
          const i = (sy * src.w + sx) * 4;
          const pa = src.data[i + 3] / 255;
          r += src.data[i] * pa * wt;
          g += src.data[i + 1] * pa * wt;
          b += src.data[i + 2] * pa * wt;
          a += pa * wt;
          wSum += wt;
        }
      }
      const oi = (dy * newW + dx) * 4;
      const outA = wSum > 0 ? a / wSum : 0;
      dst[oi + 3] = Math.round(Math.min(1, Math.max(0, outA)) * 255);
      if (a > 1e-6) {
        dst[oi] = Math.round(Math.min(255, r / a));
        dst[oi + 1] = Math.round(Math.min(255, g / a));
        dst[oi + 2] = Math.round(Math.min(255, b / a));
      }
    }
  }
  return { w: newW, h: newH, data: dst };
}

/** Chroma-key green (#00FF00) removal + green despill + interior color bleed decontamination. */
export function chromaKeyGreen(src, { lo = 35, hi = 95, dropSpecks = true } = {}) {
  const { w, h, data } = src;
  const out = new Uint8Array(data);

  // Measure median green background color from corners/borders
  let br = 0, bg = 0, bb = 0, bc = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, 1, h - 2, h - 1]) {
      const i = getIdx(w, x, y);
      if (data[i + 1] > data[i] + 40 && data[i + 1] > data[i + 2] + 40) {
        br += data[i]; bg += data[i + 1]; bb += data[i + 2]; bc++;
      }
    }
  }
  const keyR = bc ? br / bc : 0, keyG = bc ? bg / bc : 255, keyB = bc ? bb / bc : 0;

  // Compute "greenness" score: how much green dominates over max(R, B) and how close to key color
  const alpha = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const i = k * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const greenExcess = g - Math.max(r, b); // > 0 means green-dominant
    const dist = Math.hypot(r - keyR, g - keyG, b - keyB);
    // Pure chroma green has huge greenExcess (>80) and small dist
    // Despill zone has moderate greenExcess (15..80)
    if (greenExcess <= 12) {
      alpha[k] = 1;
    } else {
      // Smooth matte based on greenExcess and distance from chroma key
      const t1 = Math.max(0, Math.min(1, (greenExcess - lo) / (hi - lo)));
      const t2 = Math.max(0, Math.min(1, 1 - (dist - 40) / 140));
      const bgProb = Math.max(t1, t2 * (greenExcess > 24 ? 1 : 0));
      alpha[k] = 1 - bgProb;
    }
  }

  // Remove background ONLY if connected to border OR enclosed large pure-green hole
  // (Since our characters have zero neon green inside them, any strongly green region > 15px is a background hole between legs/arms!)
  const isBg = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    if (alpha[k] < 0.98) isBg[k] = 1;
  }

  // Apply alpha + green despill everywhere
  for (let k = 0; k < w * h; k++) {
    const i = k * 4;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const a = alpha[k] < 0.06 ? 0 : alpha[k];
    // Despill: cap green channel so no green bounce-light survives on hair/chalk/skin/outline
    const maxRB = Math.max(r, b);
    if (g > maxRB + 6) {
      const spill = g - maxRB;
      g = Math.round(maxRB + Math.min(6, spill * 0.15));
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = Math.round(a * 255);
  }

  return decontaminateEdges({ w, h, data: out }, {
    solidAlpha: 235,
    trimBrightEdge: false,
    erodePasses: 0,
    dropSpecks,
    minComponentPx: 50,
  });
}

/** Crop tight bounding box of non-transparent pixels. */
export function cropToContent(img, pad = 2) {
  const { w, h, data } = img;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return img;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const nw = maxX - minX + 1, nh = maxY - minY + 1;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const si = ((minY + y) * w + (minX + x)) * 4;
      const di = (y * nw + x) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
    }
  }
  return { w: nw, h: nh, data: out };
}

/** Slice a cols×rows sprite sheet into uniform foot-aligned cells packed into a clean horizontal or grid sprite sheet. */
export function packSpriteSheet(src, cols, rows, cellW, cellH) {
  const outW = cols * cellW, outH = rows * cellH;
  const out = new Uint8Array(outW * outH * 4);
  const cw = src.w / cols, ch = src.h / rows;

  // First extract each cell's tight bounding box
  const cells = [];
  let maxH = 1, maxW = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.round(c * cw), x1 = Math.round((c + 1) * cw);
      const y0 = Math.round(r * ch), y1 = Math.round((r + 1) * ch);
      const sw = x1 - x0, sh = y1 - y0;
      const sub = new Uint8Array(sw * sh * 4);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const si = ((y0 + y) * src.w + (x0 + x)) * 4;
          const di = (y * sw + x) * 4;
          sub[di] = src.data[si]; sub[di + 1] = src.data[si + 1]; sub[di + 2] = src.data[si + 2]; sub[di + 3] = src.data[si + 3];
        }
      }
      const cropped = cropToContent({ w: sw, h: sh, data: sub }, 2);
      // Compute horizontal center of mass (weighted by alpha) so characters don't jitter left/right between frames!
      let sumX = 0, sumA = 0;
      for (let y = 0; y < cropped.h; y++) {
        for (let x = 0; x < cropped.w; x++) {
          const a = cropped.data[(y * cropped.w + x) * 4 + 3];
          if (a > 30) { sumX += x * a; sumA += a; }
        }
      }
      const comX = sumA ? sumX / sumA : cropped.w / 2;
      if (cropped.h > maxH) maxH = cropped.h;
      if (cropped.w > maxW) maxW = cropped.w;
      cells.push({ r, c, img: cropped, comX });
    }
  }

  // Scale uniformly so the tallest pose fits cellH - 8px margin, preserving relative heights across poses
  const scale = Math.min((cellH - 8) / maxH, (cellW - 12) / maxW);
  for (const cell of cells) {
    const rw = Math.max(1, Math.round(cell.img.w * scale));
    const rh = Math.max(1, Math.round(cell.img.h * scale));
    const resized = resizeRgba(cell.img, rw, rh);
    const scaledComX = cell.comX * scale;
    // Align center-of-mass horizontally and feet flush with cell bottom (minus 2px padding)
    let ox = Math.round(cell.c * cellW + cellW / 2 - scaledComX);
    ox = Math.max(cell.c * cellW + 2, Math.min((cell.c + 1) * cellW - rw - 2, ox));
    const oy = (cell.r + 1) * cellH - rh - 2;
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const dy = oy + y, dx = ox + x;
        if (dx < 0 || dy < 0 || dx >= outW || dy >= outH) continue;
        const si = (y * rw + x) * 4;
        const di = (dy * outW + dx) * 4;
        out[di] = resized.data[si]; out[di + 1] = resized.data[si + 1];
        out[di + 2] = resized.data[si + 2]; out[di + 3] = resized.data[si + 3];
      }
    }
  }
  return { w: outW, h: outH, data: out };
}

// ------------------------------------------------------------------ CLI
const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'inspect') {
  for (const f of args) {
    const img = readPng(f);
    let semi = 0, brightEdge = 0, opaque = 0;
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        const i = (y * img.w + x) * 4;
        const a = img.data[i + 3];
        if (a > 240) opaque++;
        else if (a > 10) {
          semi++;
          const lum = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
          if (lum > 180) brightEdge++;
        }
      }
    }
    console.log(`${path.basename(f).padEnd(22)} ${String(img.w).padStart(4)}x${String(img.h).padEnd(4)} opaque=${String(opaque).padStart(6)} semi=${String(semi).padStart(5)} brightHalo=${brightEdge}`);
  }
} else if (cmd === 'defringe') {
  const [srcPath, dstPath] = args;
  const erode = args.includes('--erode') ? Number(args[args.indexOf('--erode') + 1]) : 0;
  const lum = args.includes('--lum') ? Number(args[args.indexOf('--lum') + 1]) : 175;
  const noTrim = args.includes('--no-trim');
  const dropSpecks = args.includes('--drop-specks');
  const img = readPng(srcPath);
  const cleaned = decontaminateEdges(img, {
    brightFringeLum: lum,
    trimBrightEdge: !noTrim,
    erodePasses: erode,
    dropSpecks,
  });
  writePng(dstPath, cleaned.w, cleaned.h, cleaned.data);
  console.log(`defringed ${path.basename(srcPath)} -> ${dstPath} (${cleaned.w}x${cleaned.h})`);
} else if (cmd === 'chroma') {
  const [srcPath, dstPath] = args;
  const cols = args.includes('--cols') ? Number(args[args.indexOf('--cols') + 1]) : 0;
  const rows = args.includes('--rows') ? Number(args[args.indexOf('--rows') + 1]) : 0;
  const cellW = args.includes('--cell-w') ? Number(args[args.indexOf('--cell-w') + 1]) : 220;
  const cellH = args.includes('--cell-h') ? Number(args[args.indexOf('--cell-h') + 1]) : 280;
  const height = args.includes('--height') ? Number(args[args.indexOf('--height') + 1]) : 0;
  const img = readPng(srcPath);
  let keyed = chromaKeyGreen(img);
  if (cols && rows) {
    keyed = packSpriteSheet(keyed, cols, rows, cellW, cellH);
  } else {
    keyed = cropToContent(keyed, 2);
    if (height && keyed.h !== height) {
      const nw = Math.round((keyed.w * height) / keyed.h);
      keyed = resizeRgba(keyed, nw, height);
    }
  }
  writePng(dstPath, keyed.w, keyed.h, keyed.data);
  console.log(`chroma ${path.basename(srcPath)} -> ${dstPath} (${keyed.w}x${keyed.h})`);
}
