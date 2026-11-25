// Procedural drawing: chalkboard background, furniture, tokens, professor, door.
import { W, H, FLOOR_Y, TOKEN_R, PLAYER_W, PLAYER_H, PLATFORM_H, COLORS as C, CHALK_FONT, MATH_FONT } from './constants.js';
import { images } from './assets.js';

import { SPRITE_H } from './constants.js';
const BOOK_COLORS = ['#6e2622', '#2f4560', '#3e5a3c', '#8a6a3a', '#4f3450', '#5a2f1d', '#283a33'];

const FORMULAS = [
  'e^(iπ) + 1 = 0', '∑ 1/n² = π²/6', '∫ f(x) dx', 'a² + b² = c²', 'lim sin(x)/x = 1', '∂f/∂x',
  'E[X] = ∑ x·p(x)', 'P(A|B) = P(B|A)·P(A) / P(B)', '√2 ≈ 1.41421', '(a+b)² = a² + 2ab + b²',
  '∫∫ f(x,y) dx dy', '∑ k = n(n+1)/2', 'sin²x + cos²x = 1', 'ln e = 1', 'E = mc²',
];

export const chalkFont = (px, bold = false) => `${bold ? 'bold ' : ''}${px}px ${CHALK_FONT}`;
export const mathFont = (px, bold = false) => `${bold ? 'bold ' : ''}${px}px ${MATH_FONT}`;

export function rng(seed) { // mulberry32
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pre-render the static chalkboard for a level into an offscreen canvas. */
export function makeBackground(seed, dpr, level = null) {
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const r = rng(seed * 97 + 3);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));

  // slate board with a soft vignette
  const base = g.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, W * 0.75);
  base.addColorStop(0, '#2a3b36'); base.addColorStop(0.6, '#1f2e2a'); base.addColorStop(1, '#121c19');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // chalk-dust grain
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(230,236,228,${0.02 + r() * 0.05})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // half-erased smears (eraser strokes)
  g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(220,230,222,${0.025 + r() * 0.035})`;
    g.lineWidth = ri(18, 42);
    const sx = ri(-40, W), sy = ri(90, FLOOR_Y - 20);
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + ri(60, 140), sy + ri(-30, 30), sx + ri(160, 320), sy + ri(-20, 20)); g.stroke();
  }
  // big hand-written chalk formulas
  const spots = [[0.3, 0.27], [0.62, 0.25], [0.42, 0.47], [0.72, 0.6], [0.12, 0.72], [0.5, 0.78], [0.86, 0.42]];
  for (const [fx, fy] of spots) {
    g.save();
    g.globalAlpha = 0.13 + r() * 0.1;
    g.fillStyle = C.chalk;
    g.font = `${r() < 0.5 ? 'italic ' : ''}${ri(24, 36)}px ${CHALK_FONT}`;
    g.translate(fx * W + ri(-30, 30), fy * H + ri(-10, 10));
    g.rotate((r() - 0.5) * 0.06);
    g.fillText(FORMULAS[ri(0, FORMULAS.length - 1)], -120, 0);
    g.restore();
  }
  // chalk geometry: right triangle with angle mark, cone, circle with radius
  g.save();
  g.strokeStyle = C.chalk; g.fillStyle = C.chalk; g.lineWidth = 2; g.lineCap = 'round';
  g.globalAlpha = 0.17;
  const tx = ri(40, 200), ty = ri(250, 330);
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + 170, ty); g.lineTo(tx + 170, ty - 115); g.closePath(); g.stroke();
  g.beginPath(); g.arc(tx, ty, 34, -0.6, 0); g.stroke();
  g.strokeRect(tx + 158, ty - 12, 12, 12);
  g.font = `italic 20px ${CHALK_FONT}`; g.fillText('a', tx + 80, ty + 22); g.fillText('b', tx + 178, ty - 50); g.fillText('c', tx + 70, ty - 64);
  const cx = ri(640, 820), cy = ri(110, 160);
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 85, cy + 120); g.moveTo(cx, cy); g.lineTo(cx + 85, cy + 120); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + 120, 85, 20, 0, 0, Math.PI); g.stroke();
  g.setLineDash([6, 6]); g.beginPath(); g.ellipse(cx, cy + 120, 85, 20, 0, Math.PI, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 120); g.stroke(); g.setLineDash([]);
  const ox = ri(420, 560), oy = ri(300, 360), rr = ri(40, 60);
  g.beginPath(); g.arc(ox, oy, rr, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + rr * 0.8, oy - rr * 0.6); g.stroke();
  g.fillText('r', ox + rr * 0.3, oy - rr * 0.35);
  g.restore();

  // bookcases stand only in free floor gaps (not behind desks, ladders, the door or the spawn point)
  const BW = 80, blocked = [];
  if (level) {
    for (const [px, , pw, kind] of level.platforms) if (kind === 'desk') blocked.push([px - 12, px + pw + 12]);
    for (const [lx] of level.ladders ?? []) blocked.push([lx - 30, lx + 30]);
    blocked.push([level.doorX - 30, W], [0, level.spawn + 60]);
  }
  const free = [];
  for (let bx = 30; bx + BW < W - 30; bx += 10) if (!blocked.some(([a, b]) => bx < b && bx + BW > a)) free.push(bx);
  const placed = [];
  for (let tries = 0; tries < 40 && placed.length < 2 && free.length; tries++) {
    const bx = free[Math.floor(r() * free.length)];
    if (placed.every((p) => Math.abs(p - bx) > BW + 40)) placed.push(bx);
  }
  for (const bx of placed) drawBookcase(g, bx, r);

  // wooden frame: side posts + top beam
  const wood = (x, y, w, h, vertical) => {
    const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#2a180c'); gr.addColorStop(0.4, '#5e3b20'); gr.addColorStop(0.7, '#4a2d17'); gr.addColorStop(1, '#22130a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  wood(0, 0, W, 9, false);
  wood(0, 0, 14, H, true);
  wood(W - 14, 0, 14, H, true);
  return cv;
}

/** A single upright book: cover colour, shaded spine, gold bands. */
function drawUprightBook(g, x, base, w, h, col, r) {
  const grad = g.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, shade(col, -0.35)); grad.addColorStop(0.35, shade(col, 0.15)); grad.addColorStop(1, shade(col, -0.25));
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(x, base - h, w, h, 1.2); g.fill();
  g.fillStyle = 'rgba(214,180,110,0.75)';
  g.fillRect(x + 0.5, base - h + 3, w - 1, 1);
  g.fillRect(x + 0.5, base - 5, w - 1, 1);
  if (h > 18 && r() < 0.6) { g.fillStyle = 'rgba(240,225,190,0.55)'; g.fillRect(x + w / 2 - 0.6, base - h * 0.62, 1.2, h * 0.25); }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function drawBookcase(g, x, r) {
  const w = 82, h = 90, top = FLOOR_Y - h;
  if (images['prop.bookcase']) {
    const img = images['prop.bookcase'], bh = 128, bw = (bh * img.width) / img.height;
    g.drawImage(img, x, FLOOR_Y - bh, bw, bh);
    return;
  }
  const wood = g.createLinearGradient(x, 0, x + w, 0);
  wood.addColorStop(0, '#3a2414'); wood.addColorStop(0.5, '#4d321c'); wood.addColorStop(1, '#341f11');
  g.fillStyle = wood; g.fillRect(x, top, w, h);
  g.fillStyle = '#1d120a'; g.fillRect(x + 4, top + 4, w - 8, h - 8);
  for (let s = 0; s < 3; s++) {
    const base = top + 30 + s * 28;
    let bx = x + 6;
    while (bx < x + w - 12) {
      const bw = 4 + Math.floor(r() * 5), bh = 15 + Math.floor(r() * 9);
      const lean = r() < 0.08 && bx > x + 14;
      if (lean) { // one leaning book
        g.save(); g.translate(bx, base); g.rotate(-0.35);
        drawUprightBook(g, 0, 0, bw, bh, BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], r);
        g.restore(); bx += bw + 6;
      } else {
        drawUprightBook(g, bx, base, bw, bh, BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], r);
        bx += bw + (r() < 0.15 ? 3 : 0.5);
      }
    }
    g.fillStyle = '#5a3a21'; g.fillRect(x + 3, base, w - 6, 3);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 4, base + 3, w - 8, 2);
  }
  g.strokeStyle = C.ink; g.lineWidth = 2.5; g.strokeRect(x, top, w, h);
}

/** A small stack of lying books, resting on (x, base). Pure decoration. */
export function drawBookStack(g, x, base, seed) {
  if (images['prop.books']) {
    const img = images['prop.books'], h = 34, w = (h * img.width) / img.height;
    g.drawImage(img, x - w / 2, base - h, w, h);
    return;
  }
  const r = rng(seed);
  const n = 2 + Math.floor(r() * 3);
  let y = base;
  for (let i = 0; i < n; i++) {
    const bw = 26 + Math.floor(r() * 12), bh = 4 + Math.floor(r() * 3);
    const bx = x - bw / 2 + (r() - 0.5) * 5;
    const col = BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)];
    g.fillStyle = shade(col, -0.2); g.beginPath(); g.roundRect(bx, y - bh, bw, bh, 1.5); g.fill();
    g.fillStyle = '#e9dcc0'; g.fillRect(bx + 2, y - bh + 1.2, bw - 4, bh - 2.4); // page block
    g.fillStyle = 'rgba(120,100,70,0.5)';
    for (let k = 1; k < bh - 2; k += 1.3) g.fillRect(bx + 2, y - bh + 1.2 + k, bw - 4, 0.4);
    g.fillStyle = shade(col, 0.1); g.fillRect(bx + bw - 3, y - bh, 3, bh); // spine
    g.strokeStyle = 'rgba(20,12,6,0.8)'; g.lineWidth = 0.8; g.strokeRect(bx, y - bh, bw, bh);
    y -= bh;
  }
}

export function drawPlatform(g, p) {
  const [x, y, w, kind] = p;
  if (kind === 'desk' && images['prop.desk']) {
    // the walkable line sits in the middle of the visible table top
    const TOP = 0.12, bottom = FLOOR_Y + 6, h = (bottom - y) / (1 - TOP);
    // shadow cast on the board behind the desk + contact shadow on the ledge
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.beginPath(); g.roundRect(x + 8, y + 6, w, FLOOR_Y - y - 6, 6); g.fill();
    const sh = g.createRadialGradient(x + w / 2, bottom, 4, x + w / 2, bottom, w * 0.62);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(x + w / 2, bottom); g.scale(1, 0.12); g.translate(-(x + w / 2), -bottom);
    g.fillStyle = sh; g.beginPath(); g.arc(x + w / 2, bottom, w * 0.62, 0, Math.PI * 2); g.fill();
    g.restore();
    g.drawImage(images['prop.desk'], x - 4, y - TOP * h, w + 8, h);
    return;
  }
  if (kind !== 'desk' && images['prop.shelf']) {
    const img = images['prop.shelf'], h = Math.min(48, ((w + 10) * img.height) / img.width);
    g.fillStyle = 'rgba(0,0,0,0.18)'; // shadow on the board under the shelf
    g.beginPath(); g.roundRect(x + 2, y + 8, w + 6, h * 0.5, 4); g.fill();
    g.drawImage(img, x - 5, y - 2, w + 10, h);
    return;
  }
  g.lineWidth = 2; g.strokeStyle = C.ink; g.fillStyle = C.wood;
  if (kind === 'desk') {
    for (const lx of [x + 8, x + w - 16]) { g.fillRect(lx, y + PLATFORM_H, 8, FLOOR_Y - y - PLATFORM_H); g.strokeRect(lx, y + PLATFORM_H, 8, FLOOR_Y - y - PLATFORM_H); }
    g.fillRect(x + 6, y + PLATFORM_H + 4, w - 12, 13); g.strokeRect(x + 6, y + PLATFORM_H + 4, w - 12, 13);
  } else {
    for (const bx of [x + 10, x + w - 26]) {
      g.beginPath(); g.moveTo(bx, y + PLATFORM_H); g.lineTo(bx + 16, y + PLATFORM_H); g.lineTo(bx + 8, y + PLATFORM_H + 30); g.lineTo(bx + 3, y + PLATFORM_H + 30); g.closePath();
      g.fill(); g.stroke();
    }
  }
  g.beginPath(); g.roundRect(x, y, w, PLATFORM_H + 2, 3); g.fill(); g.stroke();
  g.strokeStyle = C.woodLight; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x + 4, y + 3); g.lineTo(x + w - 5, y + 3); g.stroke();
}

/** The floor is the chalkboard's wooden ledge. */
export function drawFloor(g) {
  const gr = g.createLinearGradient(0, FLOOR_Y, 0, H);
  gr.addColorStop(0, '#7a4f2c'); gr.addColorStop(0.12, '#5c3a1f'); gr.addColorStop(0.5, '#3d2513'); gr.addColorStop(1, '#24150a');
  g.fillStyle = gr; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  g.strokeStyle = 'rgba(30,16,8,0.45)'; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { // wood grain
    const y = FLOOR_Y + 10 + i * 10;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 60) g.lineTo(x, y + Math.sin(x * 0.013 + i) * 2); g.stroke();
  }
  g.strokeStyle = '#a8784a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, FLOOR_Y + 1); g.lineTo(W, FLOOR_Y + 1); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, FLOOR_Y - 3, W, 3); // shadow under the board
}

/** Wooden ladder from topY (a platform surface) down to bottomY. */
export function drawLadder(g, [x, topY, bottomY]) {
  const img = images['prop.ladder'];
  const top = topY - 16, h = bottomY - top;
  if (img) { g.drawImage(img, x - 18, top, 36, h); return; }
  g.strokeStyle = C.wood; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x - 12, top); g.lineTo(x - 12, bottomY); g.moveTo(x + 12, top); g.lineTo(x + 12, bottomY); g.stroke();
  g.lineWidth = 3; for (let y = top + 10; y < bottomY; y += 16) { g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + 12, y); g.stroke(); }
}

/** Yellow sponge (bounce pad) resting on surfaceY; squash 0..1 flattens it after a bounce. */
export function drawSponge(g, [x, surfaceY], squash = 0) {
  const img = images['prop.sponge'];
  const w = 42 * (1 + squash * 0.25), h = 28 * (1 - squash * 0.4);
  if (img) { g.drawImage(img, x - w / 2, surfaceY - h + 2, w, h); return; }
  g.fillStyle = '#e8c04a'; g.strokeStyle = C.ink; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(x - w / 2, surfaceY - h, w, h, 6); g.fill(); g.stroke();
}

/** Collectible bonus: 'chalk' (+time) or 'eraser' (+1 charge). */
export function drawPickup(g, kind, x, y, t) {
  const img = images[kind === 'chalk' ? 'prop.chalk' : 'prop.eraser'];
  const bob = Math.sin(t * 3 + x) * 2;
  g.save();
  const grad = g.createRadialGradient(x, y + bob, 4, x, y + bob, 26);
  grad.addColorStop(0, 'rgba(255,240,200,0.35)'); grad.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grad; g.fillRect(x - 26, y + bob - 26, 52, 52);
  if (img) { const w = 34, h = (w * img.height) / img.width; g.drawImage(img, x - w / 2, y + bob - h / 2, w, h); }
  else { g.fillStyle = kind === 'chalk' ? C.chalk : '#555'; g.fillRect(x - 12, y + bob - 4, 24, 8); }
  g.restore();
}

/** Chalk-dust cloud puff (progress 0..1). */
export function drawDustPuff(g, x, y, progress, size = 1) {
  const img = images['prop.dust'];
  g.save();
  g.globalAlpha = Math.max(0, 1 - progress) * 0.95;
  const w = (54 + progress * 40) * size, h = img ? (w * img.height) / img.width : w * 0.5;
  if (img) g.drawImage(img, x - w / 2, y - h * 0.85, w, h);
  else { g.fillStyle = C.chalk; g.beginPath(); g.ellipse(x, y - h / 3, w / 2, h / 3, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** Golden key, centred at (x, y), `size` px tall, optional rotation. */
export function drawKey(g, x, y, size = 22, rot = 0) {
  const img = images['prop.key'];
  g.save(); g.translate(x, y); g.rotate(rot);
  const glow = g.createRadialGradient(0, 0, 2, 0, 0, size);
  glow.addColorStop(0, 'rgba(255,214,120,0.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = glow; g.fillRect(-size, -size, size * 2, size * 2);
  if (img) { const w = (size * img.width) / img.height; g.drawImage(img, -w / 2, -size / 2, w, size); }
  else { g.fillStyle = C.gold; g.fillRect(-2, -size / 2, 4, size); g.beginPath(); g.arc(0, -size / 2, 5, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** Twinkling 4-point star. */
export function drawSparkle(g, x, y, r, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = '#fff3c4';
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  g.restore();
}

/** Small eraser icon for the HUD (dim = used). */
export function drawEraserIcon(g, x, y, dim) {
  const img = images['prop.eraser'];
  g.save(); g.globalAlpha = dim ? 0.25 : 1;
  if (img) { const w = 34, h = (w * img.height) / img.width; g.drawImage(img, x, y - h / 2, w, h); }
  else { g.fillStyle = '#777'; g.fillRect(x, y - 6, 30, 12); }
  g.restore();
}

export function drawToken(g, text, x, y, alpha, { highlight = false, negative = false, ghost = false } = {}) {
  g.save();
  g.globalAlpha = ghost ? 0.35 : alpha;
  const glowCol = negative ? C.violet : C.gold;
  const grad = g.createRadialGradient(x, y, TOKEN_R - 2, x, y, TOKEN_R + 13);
  grad.addColorStop(0, glowCol + '66'); grad.addColorStop(1, glowCol + '00');
  g.fillStyle = grad; g.beginPath(); g.arc(x, y, TOKEN_R + 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#16201c'; g.beginPath(); g.arc(x, y, TOKEN_R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = negative ? C.violet : C.chalk; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = C.chalk; g.font = mathFont(text.length > 1 ? 17 : 22, true);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 1);
  if (highlight) {
    g.globalAlpha = 1;
    g.strokeStyle = C.gold; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, TOKEN_R + 4, 0, Math.PI * 2); g.stroke();
    g.font = chalkFont(14); g.fillStyle = C.gold;
    g.fillText('F – pick up', x, y - TOKEN_R - 14);
  }
  g.restore();
}

/** Crisp tapered chalk speed-line drawn behind a dashing character (progress 0..1). */
export function drawDashLine(g, x, y, len, dir, progress, color = C.chalk) {
  const a = Math.max(0, 1 - progress);
  g.save();
  g.globalAlpha = a * 0.72;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, (1 - progress * 0.6) * 2.4);
  g.lineCap = 'round';
  const shift = dir * progress * 24;
  g.beginPath();
  g.moveTo(x + shift, y);
  g.lineTo(x + shift + dir * len * (1 - progress * 0.35), y);
  g.stroke();
  g.restore();
}

/** Fading ghost silhouette behind the character while dashing. */
export function drawDashAfterimage(g, who, ghost) {
  const k = ghost.t / ghost.dur;
  const alpha = Math.max(0, (1 - k) * 0.42);
  if (alpha <= 0.01) return;
  g.save();
  g.filter = 'brightness(1.22) sepia(0.28)';
  drawCharacter(g, who, ghost.x, ghost.y, {
    facing: ghost.facing, gdir: ghost.gdir, dashing: true, dashK: ghost.dashK,
    airborne: false, walking: false, alpha, noShadow: true,
  });
  g.restore();
}

/**
 * Elderly professor in side profile, ~15° forward lean.
 * (x, y) = top-left of the hitbox; facing = ±1; gdir = ±1 (−1 draws him upside down).
 */
export function drawCharacter(g, who, x, y, opts = {}) {
  const sheet = images[`char.${who}_sheet`];
  const img = images[`char.${who}`];
  const jump = images[`char.${who}_jump`];
  const usePortrait = opts.portrait || ((opts.scale ?? 1) > 1.2 && !opts.walking && !opts.airborne && !opts.climbing && !opts.dashing);
  if (usePortrait && img) drawSprite(g, img, x, y, opts);
  else if (sheet) drawSheetSprite(g, sheet, x, y, opts);
  else if (jump && opts.airborne && !opts.climbing) drawJumpSprite(g, jump, x, y, opts);
  else if (img) drawSprite(g, img, x, y, opts);
  else drawProfessor(g, x, y, { ...opts, female: who === 'professorka' });
}

/**
 * Animated 5×2 (or legacy 4×2) character sprite sheet (all poses face RIGHT, feet aligned to cell bottom):
 *   Row 0: walk cycle (0: stride A, 1: passing A, 2: stride B, 3: passing B), 4: dash launch
 *   Row 1: 0: idle, 1: jump rising, 2: jump falling, 3: ladder climb, 4: dash glide
 */
function drawSheetSprite(g, sheet, x, y, {
  facing = 1, walkT = 0, walking = false, airborne = false, gdir = 1,
  scale = 1, alpha = 1, climbing = false, vy = 0, squash = 0, t = 0,
  dashing = false, dashK = 0, noShadow = false,
} = {}) {
  const ROWS = 2;
  const COLS = Math.max(4, Math.round((sheet.width / sheet.height) * (280 / 220) * ROWS));
  const cw = sheet.width / COLS, ch = sheet.height / ROWS;
  let col = 0, row = 1; // default: idle
  let flipX = facing;
  let bob = 0, tilt = 0;

  if (dashing) {
    if (COLS >= 5) {
      col = 4;
      row = dashK < 0.32 ? 0 : 1; // Col 4 Row 0 = dash launch, Row 1 = dash glide
    } else {
      col = 1; row = 1;
    }
    tilt = 0.05;
  } else if (climbing) {
    col = 3; row = 1;
    // Alternate hand/foot climb side as the professor climbs rungs
    flipX = Math.floor(walkT * 7) % 2 === 0 ? 1 : -1;
    bob = Math.sin(walkT * 14) * 1.2 * scale;
  } else if (airborne) {
    const relVy = vy * gdir; // negative = rising, positive = falling
    col = relVy < 45 ? 1 : 2;
    row = 1;
    tilt = Math.max(-0.1, Math.min(0.1, relVy / 4500));
  } else if (walking) {
    col = Math.floor(walkT * 9.5) % 4;
    row = 0;
    bob = -Math.abs(Math.sin(walkT * Math.PI * 4.75)) * 1.6 * scale;
    tilt = 0.03; // subtle energetic forward lean while moving
  } else {
    col = 0; row = 1; // idle
  }

  const h = SPRITE_H * 1.04 * scale;
  const w = (h * cw) / ch;
  g.save();
  g.globalAlpha = alpha;
  const cx = x + PLAYER_W / 2;
  if (gdir > 0) g.translate(cx, y + PLAYER_H); else { g.translate(cx, y); g.scale(1, -1); }

  // Soft contact shadow beneath feet when grounded
  if (!noShadow && !airborne && !climbing && !dashing) {
    const sw = (walking ? 0.34 : 0.31) * w;
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(0, 0, sw, 2.8 * scale, 0, 0, Math.PI * 2); g.fill();
  }

  // Squash & stretch (positive squash = landing compress, negative = takeoff stretch) + idle breathing
  const breath = !walking && !airborne && !climbing && !dashing ? Math.sin(t * 2.4) * 0.012 : 0;
  const dashStretch = dashing ? 0.07 : 0;
  const sx = 1 + squash + dashStretch - breath * 0.5;
  const sy = 1 - squash - dashStretch * 0.6 + breath;

  g.translate(0, bob);
  g.scale(flipX * sx, sy);
  g.rotate(tilt);
  // Slight 1.5px downward offset accounts for the 2px bottom padding inside each packed sheet cell
  g.drawImage(sheet, col * cw, row * ch, cw, ch, -w / 2, -h + 1.5 * scale, w, h);
  g.restore();
}

/** Mid-air pose (art faces RIGHT), slightly smaller than standing, tilted with the jump arc. */
function drawJumpSprite(g, img, x, y, { facing = 1, gdir = 1, scale = 1, alpha = 1, vy = 0 } = {}) {
  const h = SPRITE_H * 0.86 * scale, w = (h * img.width) / img.height;
  g.save();
  g.globalAlpha = alpha;
  const cx = x + PLAYER_W / 2;
  if (gdir > 0) g.translate(cx, y + PLAYER_H); else { g.translate(cx, y); g.scale(1, -1); }
  g.scale(facing, 1);
  g.rotate(Math.max(-0.18, Math.min(0.18, (-vy * gdir) / 3000))); // lean forward going up, back when falling
  g.drawImage(img, -w / 2, -h, w, h);
  g.restore();
}

/** Character sprite (art faces left). Walk = bob + sway, jump = forward lean. */
function drawSprite(g, img, x, y, { facing = 1, walkT = 0, walking = false, airborne = false, gdir = 1, scale = 1, alpha = 1, climbing = false } = {}) {
  const h = SPRITE_H * scale, w = (h * img.width) / img.height;
  g.save();
  g.globalAlpha = alpha;
  if (climbing) { airborne = false; walking = true; }
  const cx = x + PLAYER_W / 2;
  if (gdir > 0) g.translate(cx, y + PLAYER_H); else { g.translate(cx, y); g.scale(1, -1); }
  g.scale(-facing, 1);
  // soft contact shadow
  if (!airborne && !climbing) {
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(0, 0, w * 0.45, 2.5 * scale, 0, 0, Math.PI * 2); g.fill();
  }
  const phase = walkT * 13;
  const bob = walking && !airborne ? -Math.abs(Math.sin(phase)) * 2 * scale : 0;
  const tilt = airborne ? -0.14 : walking ? -0.05 + Math.sin(phase) * 0.03 : 0;
  g.translate(0, bob);
  g.rotate(tilt);
  g.drawImage(img, -w / 2, -h, w, h);
  g.restore();
}

export function drawProfessor(g, x, y, { facing = 1, walkT = 0, walking = false, airborne = false, gdir = 1, scale = 1, female = false } = {}) {
  g.save();
  const cx = x + PLAYER_W / 2;
  if (gdir > 0) g.translate(cx, y + PLAYER_H); else { g.translate(cx, y); g.scale(1, -1); }
  g.scale(facing * scale, scale);
  // local coords: origin at feet, −y is up, +x is forward
  g.lineJoin = 'round'; g.lineCap = 'round';
  const swing = airborne ? 5 : walking ? Math.sin(walkT * 13) * 6 : 0;

  // legs
  g.strokeStyle = '#2f2c33'; g.lineWidth = 5;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 2, -18); g.lineTo(s * swing, -3); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.ellipse(s * swing + 2, -2, 6, 3, 0, 0, Math.PI * 2); g.fill();
  }

  if (female) { // knee-length skirt
    g.fillStyle = '#3b3640'; g.strokeStyle = C.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-6, -20); g.lineTo(6, -20); g.lineTo(9, -8); g.lineTo(-9, -8); g.closePath(); g.fill(); g.stroke();
  }

  // upper body, leaning forward 15°
  g.translate(0, -18);
  g.rotate(((female ? 10 : 15) * Math.PI) / 180);
  g.strokeStyle = C.ink; g.lineWidth = 1.5;
  // oversized tweed jacket / cardigan
  g.fillStyle = female ? '#6d3b40' : C.tweed;
  g.beginPath(); g.roundRect(-10, -24, 19, 27, 6); g.fill(); g.stroke();
  g.strokeStyle = female ? '#52282d' : C.tweedDark; g.lineWidth = 1;
  for (let i = -20; i < 2; i += 5) { g.beginPath(); g.moveTo(-8, i); g.lineTo(7, i + 2); g.stroke(); }
  // shirt collar
  g.fillStyle = C.chalk; g.beginPath(); g.moveTo(3, -24); g.lineTo(9, -24); g.lineTo(5, -17); g.closePath(); g.fill();
  // arm reaching forward with chalk
  const armLift = airborne ? -6 : 0;
  g.strokeStyle = C.tweedDark; g.lineWidth = 5;
  g.beginPath(); g.moveTo(1, -20); g.lineTo(8, -10 + armLift); g.lineTo(15, -14 + armLift); g.stroke();
  g.fillStyle = C.skin; g.beginPath(); g.arc(16, -14 + armLift, 2.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.chalk; g.fillRect(17, -17 + armLift, 6, 2.5);

  // head (bald on top, tuft at the back)
  g.translate(1, -31);
  g.fillStyle = C.skin; g.strokeStyle = C.ink; g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(8, 1, 2, 0, Math.PI * 2); g.fill(); // nose
  if (female) { // grey hair with a bun at the back
    g.fillStyle = '#c9c6c0';
    g.beginPath(); g.arc(-1, -1, 8.4, Math.PI * 0.95, Math.PI * 2.08); g.fill();
    g.beginPath(); g.arc(-9, -3, 4.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#9d9890'; g.lineWidth = 0.8; g.beginPath(); g.arc(-9, -3, 2.2, 0, Math.PI * 2); g.stroke();
  } else {
    g.fillStyle = '#ffffff';
    for (const [hx, hy, hr] of [[-8, 1, 3.2], [-9, 4, 3], [-6, 6, 2.6], [-9, -2, 2.4]]) { g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.fill(); }
  }
  // round glasses
  g.strokeStyle = C.ink; g.lineWidth = 1.2;
  g.beginPath(); g.arc(4, -1, 2.8, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(1.2, -1); g.lineTo(-4, -2); g.stroke();
  if (female) { // lips + pearl earring
    g.strokeStyle = '#9a4a4a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(4, 4.5); g.lineTo(7, 4.2); g.stroke();
    g.fillStyle = '#f4efe6'; g.beginPath(); g.arc(-3, 4, 1.2, 0, Math.PI * 2); g.fill();
  } else { // mustache
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(5, 4.5, 4, 1.8, 0.2, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export function drawDoor(g, d, label, labelColor, glow, t, open = false) {
  if (glow) {
    g.save();
    g.globalAlpha = 0.3 + 0.15 * Math.sin(t * 4);
    const grad = g.createRadialGradient(d.x + d.w / 2, d.y + d.h / 2, 10, d.x + d.w / 2, d.y + d.h / 2, 90);
    grad.addColorStop(0, C.green); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(d.x - 60, d.y - 50, d.w + 120, d.h + 100);
    g.restore();
  }
  if (images['prop.door']) {
    const img = images['prop.door'], h = d.h + 24, w = (h * img.width) / img.height;
    const left = d.x + d.w / 2 - w / 2;
    const openImg = images['prop.door_open'];
    if (open && openImg) {
      const ow = (h * openImg.width) / openImg.height;
      g.drawImage(openImg, left, d.y + d.h - h, ow, h);
    } else {
      g.drawImage(img, left, d.y + d.h - h, w, h);
    }
    g.font = mathFont(19, true); g.fillStyle = labelColor; g.textAlign = 'center';
    g.fillText(label, d.x + d.w / 2, d.y + d.h - h - 8);
    g.textAlign = 'left';
    return;
  }
  g.lineWidth = 2; g.strokeStyle = C.ink;
  g.fillStyle = '#8d8b80';
  g.beginPath(); g.roundRect(d.x - 7, d.y - 10, d.w + 14, d.h + 10, [30, 30, 0, 0]); g.fill(); g.stroke();
  g.fillStyle = '#5a3721';
  g.beginPath(); g.roundRect(d.x, d.y, d.w, d.h, [25, 25, 0, 0]); g.fill(); g.stroke();
  g.strokeStyle = '#3e2414'; g.lineWidth = 1.5;
  for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(d.x + (i * d.w) / 3, d.y + 14); g.lineTo(d.x + (i * d.w) / 3, d.y + d.h); g.stroke(); }
  g.fillStyle = C.gold; g.beginPath(); g.arc(d.x + d.w - 10, d.y + d.h / 2 + 8, 3.5, 0, Math.PI * 2); g.fill();
  g.font = mathFont(19, true); g.fillStyle = labelColor; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(label, d.x + d.w / 2, d.y - 18);
  g.textAlign = 'left';
}
