// UI kit in the game's "dark academia" style: parchment, wooden/chalkboard buttons, ribbons, stars,
// plus the illustrated backgrounds of the menu screens. Every background first looks for a painted
// image in assets/ (see docs/art-prompts.md) and falls back to a procedural illustration.
import { W, H, COLORS as C } from './constants.js';
import { images } from './assets.js';
import { rng, chalkFont } from './draw.js';

export const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
export const serif = (px, { bold = false, italic = false } = {}) => `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${px}px ${SERIF}`;

export const INK = '#3b2414';
export const GOLD = '#e8b84a';
export const GOLD_DARK = '#9a6a1c';
export const PARCH = '#efe1bd';
export const BOARD = '#24352f';

export const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// ---------------------------------------------------------------- primitives
export function parchment(g, x, y, w, h, r = 10) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, '#f3e7c6'); gr.addColorStop(0.5, '#ead9ae'); gr.addColorStop(1, '#dcc38f');
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
  g.restore();
  // burnt / aged edge
  g.save();
  g.beginPath(); g.roundRect(x, y, w, h, r); g.clip();
  const edge = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  edge.addColorStop(0, 'rgba(120,80,30,0)'); edge.addColorStop(1, 'rgba(120,80,30,0.35)');
  g.fillStyle = edge; g.fillRect(x, y, w, h);
  g.restore();
  g.strokeStyle = 'rgba(90,55,20,0.75)'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); g.stroke();
}

/** Parchment ribbon banner with folded tails. */
export function ribbon(g, cx, cy, w, h, text, { font = serif(20, { italic: true, bold: true }), sub = null, subFont = serif(13, { italic: true }) } = {}) {
  const x = cx - w / 2, y = cy - h / 2, tail = 18;
  g.save();
  g.fillStyle = '#b89a62';
  for (const s of [-1, 1]) { // tails
    const ex = s < 0 ? x - tail : x + w + tail, ix = s < 0 ? x + 8 : x + w - 8;
    g.beginPath(); g.moveTo(ix, y + 8); g.lineTo(ex, y + 8); g.lineTo(ex + s * -10, y + h / 2 + 4); g.lineTo(ex, y + h + 2); g.lineTo(ix, y + h + 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(80,50,20,0.7)'; g.lineWidth = 1; g.stroke();
  }
  g.restore();
  parchment(g, x, y, w, h, 4);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font; g.fillText(text, cx, sub ? cy - 7 : cy + 1);
  if (sub) { g.font = subFont; g.fillStyle = '#5a3d22'; g.fillText(sub, cx, cy + 12); }
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

/** Button. style 'board' = green chalkboard with gold frame, 'wood' = wooden plank. */
export function button(g, r, label, { hover = false, style = 'board', disabled = false, icon = null, t = 0, glow = false } = {}) {
  g.save();
  if (glow || hover) {
    g.shadowColor = `rgba(255,205,100,${glow ? 0.55 + 0.25 * Math.sin(t * 3) : 0.6})`;
    g.shadowBlur = glow ? 18 : 12;
  }
  const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h);
  if (style === 'wood') { gr.addColorStop(0, hover ? '#9a6a3e' : '#865a33'); gr.addColorStop(1, '#5a3a1e'); }
  else { gr.addColorStop(0, hover ? '#355247' : '#2b4239'); gr.addColorStop(1, '#1a2924'); }
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 8); g.fill();
  g.restore();
  g.strokeStyle = disabled ? '#7d7466' : GOLD; g.lineWidth = 2;
  g.beginPath(); g.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 7); g.stroke();
  g.strokeStyle = 'rgba(232,184,74,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.roundRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10, 5); g.stroke();
  g.fillStyle = disabled ? '#9c9483' : style === 'wood' ? '#f6e6c0' : C.chalk;
  const text = (icon ? icon + '  ' : '') + label;
  let size = style === 'wood' ? Math.min(19, r.h * 0.45) : Math.min(18, r.h * 0.42);
  const fontFor = (s) => (style === 'wood' ? serif(s, { italic: true, bold: true }) : chalkFont(s, true));
  g.font = fontFor(size);
  while (size > 10 && g.measureText(text).width > r.w - 14) { size -= 1; g.font = fontFor(size); } // shrink to fit
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

export function star(g, x, y, r, filled = true, color = GOLD) {
  g.save();
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  if (filled) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    gr.addColorStop(0, '#fff1b0'); gr.addColorStop(1, color);
    g.fillStyle = gr; g.fill();
  }
  g.strokeStyle = filled ? GOLD_DARK : 'rgba(120,90,50,0.8)'; g.lineWidth = 1.4; g.stroke();
  g.restore();
}

export function stars(g, cx, cy, n, r = 9, gap = 4) {
  const total = 3 * r * 2 + 2 * gap;
  for (let i = 0; i < 3; i++) star(g, cx - total / 2 + r + i * (2 * r + gap), cy, r, i < n);
}

export function lockIcon(g, x, y, s = 1, color = '#d9d4c7') {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = color; g.lineWidth = 3.2;
  g.beginPath(); g.arc(0, -6, 7, Math.PI, 0); g.lineTo(7, 0); g.moveTo(-7, 0); g.lineTo(-7, -6); g.stroke();
  g.fillStyle = color; g.beginPath(); g.roundRect(-10, -1, 20, 16, 3); g.fill();
  g.fillStyle = '#3d3a35'; g.beginPath(); g.arc(0, 5, 2.6, 0, Math.PI * 2); g.fill(); g.fillRect(-1.2, 5, 2.4, 6);
  g.restore();
}

/** Green pennant with a white check mark (completed). */
export function checkBanner(g, x, y, w = 34, h = 44) {
  g.save();
  g.fillStyle = '#c9a24c'; g.fillRect(x - w / 2 - 3, y - 3, w + 6, 4);
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  gr.addColorStop(0, '#2f5a33'); gr.addColorStop(0.5, '#3f7343'); gr.addColorStop(1, '#2a4f2d');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.lineTo(x, y + h - 9); g.lineTo(x - w / 2, y + h); g.closePath(); g.fill();
  g.strokeStyle = '#c9a24c'; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - 8, y + h * 0.42); g.lineTo(x - 2, y + h * 0.58); g.lineTo(x + 9, y + h * 0.26); g.stroke();
  g.restore();
}

/** Pulsing golden glow around a rectangle (recommended / selected). */
export function glowFrame(g, r, t, radius = 10) {
  g.save();
  const a = 0.55 + 0.35 * Math.sin(t * 3);
  g.shadowColor = `rgba(255,200,80,${a})`; g.shadowBlur = 22;
  g.strokeStyle = `rgba(255,214,120,${0.7 + 0.3 * a})`; g.lineWidth = 3;
  g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, radius); g.stroke();
  g.restore();
}

export function wrapText(g, text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws an image (or fallback fn) with an optional grayscale amount 0..1 (uses canvas filters). */
export function withGray(g, amount, fn) {
  if (amount <= 0) return fn();
  g.save();
  g.filter = `grayscale(${amount}) brightness(${1 - amount * 0.12}) contrast(${1 - amount * 0.1})`;
  fn();
  g.restore();
}

// ---------------------------------------------------------------- backgrounds
function offscreen(dpr, paint) {
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  paint(g);
  return cv;
}

function cover(g, img) { // draw image covering the canvas
  const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
  g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function blot(g, x, y, rx, ry, color, alpha) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = color;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore();
}

function tree(g, x, y, s, r, color = '#4f6b34') {
  g.fillStyle = '#5a4128'; g.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 8 * s);
  for (let i = 0; i < 4; i++) blot(g, x + (r() - 0.5) * 8 * s, y - 10 * s - r() * 6 * s, 7 * s, 6 * s, i % 2 ? color : '#6b8a43', 0.95);
  g.strokeStyle = 'rgba(40,30,15,0.35)'; g.lineWidth = 0.8;
  g.beginPath(); g.arc(x, y - 12 * s, 9 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
}

function conifer(g, x, y, s) {
  g.fillStyle = '#3d5a35';
  g.beginPath(); g.moveTo(x, y - 26 * s); g.lineTo(x + 7 * s, y); g.lineTo(x - 7 * s, y); g.closePath(); g.fill();
  g.fillStyle = '#2f4a2b';
  g.beginPath(); g.moveTo(x, y - 26 * s); g.lineTo(x + 7 * s, y); g.lineTo(x, y); g.closePath(); g.fill();
}

/** The Mathematical World – illustrated parchment landscape (without buildings/labels). */
export function makeMapBackground(dpr, schools) {
  return offscreen(dpr, (g) => {
    if (images['ui.map']) return cover(g, images['ui.map']);
    const r = rng(4242);
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#c9cfa6'); base.addColorStop(0.25, '#9fb07a'); base.addColorStop(1, '#7f9459');
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    // sky + mountains
    const sky = g.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#d8dcc6'); sky.addColorStop(1, 'rgba(216,220,198,0)');
    g.fillStyle = sky; g.fillRect(0, 0, W, 120);
    for (let i = 0; i < 9; i++) {
      const mx = i * 120 + r() * 60, mh = 60 + r() * 50;
      g.fillStyle = i % 2 ? '#8e9a9a' : '#a2acaa';
      g.beginPath(); g.moveTo(mx - 110, 120); g.lineTo(mx, 120 - mh); g.lineTo(mx + 120, 120); g.closePath(); g.fill();
      g.fillStyle = 'rgba(240,240,235,0.6)';
      g.beginPath(); g.moveTo(mx - 14, 120 - mh + 16); g.lineTo(mx, 120 - mh); g.lineTo(mx + 15, 120 - mh + 17); g.closePath(); g.fill();
    }
    // watercolour meadows
    for (let i = 0; i < 90; i++) blot(g, r() * W, 110 + r() * (H - 100), 30 + r() * 90, 14 + r() * 40, ['#a9b97c', '#8ca462', '#b9c38a', '#7c9454'][i % 4], 0.25);
    // river
    g.lineCap = 'round';
    const river = [[960, 150], [860, 200], [760, 330], [700, 370], [520, 360], [470, 400], [520, 470], [480, 540]];
    for (const [wdt, col] of [[30, '#5b7f8f'], [20, '#7fa7b5'], [8, '#b4d0d6']]) {
      g.strokeStyle = col; g.lineWidth = wdt;
      g.beginPath(); g.moveTo(...river[0]);
      for (let i = 1; i < river.length - 1; i++) { const [x1, y1] = river[i], [x2, y2] = river[i + 1]; g.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); }
      g.lineTo(...river[river.length - 1]); g.stroke();
    }
    // paths between schools
    g.setLineDash([]);
    const hub = { x: 500, y: 330 };
    for (const s of schools) {
      for (const [wdt, col] of [[11, '#c8b48a'], [7, '#e2d3ae']]) {
        g.strokeStyle = col; g.lineWidth = wdt;
        g.beginPath(); g.moveTo(hub.x, hub.y); g.quadraticCurveTo((hub.x + s.map.x) / 2 + 30, (hub.y + s.map.y) / 2 - 30, s.map.x, s.map.y + 8); g.stroke();
      }
    }
    // fountain plaza
    blot(g, hub.x, hub.y, 34, 16, '#ddd0ad', 1);
    blot(g, hub.x, hub.y - 2, 14, 7, '#7fa7b5', 1);
    g.fillStyle = '#cfc4a6'; g.fillRect(hub.x - 2, hub.y - 14, 4, 12);
    // bridges
    for (const [bx, by] of [[715, 352], [497, 395]]) {
      g.strokeStyle = '#9c8b6c'; g.lineWidth = 9;
      g.beginPath(); g.arc(bx, by + 14, 18, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
    // trees, avoiding buildings and the river
    const near = (x, y) => schools.some((s) => Math.abs(s.map.x - x) < 78 && y > s.map.y - 110 && y < s.map.y + 42);
    const pts = [];
    for (let i = 0; i < 230; i++) { const x = r() * W, y = 125 + r() * (H - 135); if (!near(x, y)) pts.push([x, y]); }
    pts.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of pts) { const s = 0.55 + (y / H) * 0.7; if (r() < 0.45) conifer(g, x, y, s); else tree(g, x, y, s, r); }
    // aged-paper vignette
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    v.addColorStop(0, 'rgba(90,60,20,0)'); v.addColorStop(1, 'rgba(90,60,20,0.45)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  });
}

/**
 * For the painted map: per school, a grey and a brightened copy of its building region with feathered
 * (elliptical) edges, so state and hover can be blended over the coloured painting.
 */
export function makeMapPatches(dpr, mapCanvas, schools) {
  const patches = {};
  for (const s of schools) {
    if (!s.art) continue;
    const { x, y, w, h } = s.art;
    const make = (filter) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      const g = cv.getContext('2d');
      g.filter = filter;
      g.drawImage(mapCanvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, cv.width, cv.height);
      g.filter = 'none';
      g.globalCompositeOperation = 'destination-in';
      g.translate(cv.width / 2, cv.height / 2); g.scale(cv.width / 2, cv.height / 2);
      const m = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.72, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(-1, -1, 2, 2);
      return cv;
    };
    patches[s.id] = { gray: make('grayscale(1) brightness(0.92) contrast(0.95)'), bright: make('brightness(1.18) saturate(1.15)') };
  }
  return patches;
}

/**
 * Perspective university corridor: vaulted ceiling, arched window at the far end, chalkboards on both
 * side walls, checkered floor with a red carpet. Doors are drawn by the game on top (see hallwayDoors).
 */
export const HALL = { farX0: 400, farX1: 560, farTop: 172, floorFar: 448, floorNear: 522, ceilNear: 70 };

// y of the wall/floor and wall/ceiling junction lines at a given x (left wall: x < 480)
const wallLine = (x, near, far) => { const d = x < 480 ? x / HALL.farX0 : (W - x) / (W - HALL.farX1); return near + (far - near) * Math.min(1, d); };
export const floorY = (x) => wallLine(x, HALL.floorNear, HALL.floorFar);
export const ceilY = (x) => wallLine(x, HALL.ceilNear, HALL.farTop);

/** Positions of n doors along the two side walls (left wall first, front to back). */
export function hallwayDoors(n) {
  const left = Math.floor(n / 2), right = n - left, out = [];
  const place = (count, side) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.35 : i / (count - 1);          // 0 = front, 1 = back
      const xs = 78 + t * 262;                                   // distance from the screen edge
      const x = side < 0 ? xs : W - xs;
      const s = 1 - 0.36 * t;                                    // perspective scale
      // skew follows the wall/floor line (rises towards the far end of the corridor)
      out.push({ x, bottom: floorY(x) + 6, h: 238 * s, s, side, skew: side < 0 ? -0.185 : 0.185 });
    }
  };
  place(left, -1);
  const r = []; const keep = out.length;
  place(right, 1);
  // right wall: order front→back from the right edge, but rooms continue from the back of the left wall
  r.push(...out.splice(keep).reverse());
  return [...out, ...r];
}

export function makeHallwayBackground(dpr) {
  return offscreen(dpr, (g) => {
    if (images['ui.hallway']) return cover(g, images['ui.hallway']);
    const r = rng(77);
    const { farX0, farX1, farTop, floorFar } = HALL;
    const poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };

    // ceiling / vault
    const ceil = g.createLinearGradient(0, 0, 0, farTop);
    ceil.addColorStop(0, '#2f2216'); ceil.addColorStop(1, '#6b5338');
    g.fillStyle = ceil; g.fillRect(0, 0, W, farTop + 4);
    for (let k = 0; k < 7; k++) { // receding arches
      const d = k / 6, cx = 480, half = 480 - d * (480 - (farX1 - farX0) / 2 - 10), y = HALL.ceilNear + d * (farTop - HALL.ceilNear);
      g.strokeStyle = k % 2 ? '#7a5f3f' : '#c2a47a'; g.lineWidth = 10 - d * 6;
      g.beginPath(); g.ellipse(cx, y + 20, half, 70 - d * 40, 0, Math.PI, 0); g.stroke();
    }
    // side walls (stone)
    const wallGrad = (x0, x1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#8d7354'); gr.addColorStop(1, '#b89c74'); return gr; };
    poly([[0, HALL.ceilNear], [farX0, farTop], [farX0, floorFar], [0, HALL.floorNear]], wallGrad(0, farX0));
    poly([[W, HALL.ceilNear], [farX1, farTop], [farX1, floorFar], [W, HALL.floorNear]], wallGrad(W, farX1));
    g.strokeStyle = 'rgba(60,40,22,0.25)'; g.lineWidth = 1;
    for (let k = 1; k < 12; k++) { // stone courses converging to the far wall
      const f = k / 12;
      for (const side of [-1, 1]) {
        const xNear = side < 0 ? 0 : W, xFar = side < 0 ? farX0 : farX1;
        g.beginPath();
        g.moveTo(xNear, HALL.ceilNear + f * (HALL.floorNear - HALL.ceilNear));
        g.lineTo(xFar, farTop + f * (floorFar - farTop)); g.stroke();
      }
    }
    // far wall + window + small bookcases
    g.fillStyle = '#a2876a'; g.fillRect(farX0, farTop, farX1 - farX0, floorFar - farTop);
    const wx = 438, ww = 84, wy = 214, wh = 200;
    const sky = g.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#fff6d8'); sky.addColorStop(0.6, '#d9e6c8'); sky.addColorStop(1, '#9fbf8a');
    g.fillStyle = sky; g.beginPath(); g.roundRect(wx, wy, ww, wh, [ww / 2, ww / 2, 0, 0]); g.fill();
    g.strokeStyle = '#4a3420'; g.lineWidth = 3; g.stroke();
    g.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(wx + (i * ww) / 4, wy + 10); g.lineTo(wx + (i * ww) / 4, wy + wh); g.stroke(); }
    for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(wx, wy + 30 + j * 30); g.lineTo(wx + ww, wy + 30 + j * 30); g.stroke(); }
    for (const bx of [farX0 + 4, farX1 - 30]) {
      g.fillStyle = '#4a2f18'; g.fillRect(bx, 300, 26, floorFar - 300);
      for (let s = 0; s < 4; s++) for (let b = 0; b < 5; b++) {
        g.fillStyle = ['#6e2622', '#2f4560', '#3e5a3c', '#8a6a3a'][(s + b) % 4];
        g.fillRect(bx + 2 + b * 4.6, 306 + s * 36, 3.6, 28);
      }
    }
    // light falling in from the window
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffe9b0';
    g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + ww, wy + wh); g.lineTo(640, H); g.lineTo(320, H); g.closePath(); g.fill(); g.restore();
    // floor: checker tiles converging to the vanishing point
    poly([[0, HALL.floorNear], [farX0, floorFar], [farX1, floorFar], [W, HALL.floorNear], [W, H], [0, H]], '#5d4834');
    const vp = { x: 480, y: 300 };
    for (let row = 0; row < 7; row++) {
      const y0 = floorFar + ((H - floorFar) * row ** 1.5) / 7 ** 1.5, y1 = floorFar + ((H - floorFar) * (row + 1) ** 1.5) / 7 ** 1.5;
      for (let col = -12; col < 12; col++) {
        if ((row + col) % 2 === 0) continue;
        const at = (y, c) => vp.x + ((c * 34) * (y - vp.y)) / (floorFar - vp.y);
        g.fillStyle = 'rgba(235,220,190,0.13)';
        g.beginPath(); g.moveTo(at(y0, col), y0); g.lineTo(at(y0, col + 1), y0); g.lineTo(at(y1, col + 1), y1); g.lineTo(at(y1, col), y1); g.closePath(); g.fill();
      }
    }
    // carpet with golden border
    poly([[462, floorFar], [498, floorFar], [628, H], [332, H]], '#7a2c22');
    g.strokeStyle = '#c99a4a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(466, floorFar + 2); g.lineTo(344, H); g.moveTo(494, floorFar + 2); g.lineTo(616, H); g.stroke();
    g.strokeStyle = 'rgba(201,154,74,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(470, floorFar + 4); g.lineTo(358, H); g.moveTo(490, floorFar + 4); g.lineTo(602, H); g.stroke();
    // chalkboards on both side walls (skewed with the wall)
    for (const side of [-1, 1]) {
      g.save();
      g.translate(side < 0 ? 96 : W - 96, 96);
      g.transform(1, side < 0 ? 0.2 : -0.2, 0, 1, 0, 0);
      const bw = 230 * (side < 0 ? 1 : -1);
      g.fillStyle = '#4b3019'; g.fillRect(Math.min(0, bw) - 6, -6, Math.abs(bw) + 12, 96);
      g.fillStyle = '#26372f'; g.fillRect(Math.min(0, bw), 0, Math.abs(bw), 84);
      g.fillStyle = 'rgba(244,239,230,0.75)'; g.strokeStyle = 'rgba(244,239,230,0.75)'; g.lineWidth = 1.5;
      const x0 = Math.min(0, bw) + 14;
      g.font = `italic 18px ${'"Segoe Print", "Comic Sans MS", cursive'}`;
      if (side < 0) {
        g.beginPath(); g.moveTo(x0, 70); g.lineTo(x0 + 60, 70); g.lineTo(x0 + 18, 16); g.closePath(); g.stroke();
        g.fillText('a² + b² = c²', x0 + 74, 52); g.fillText('∑', x0 + 190, 40);
      } else {
        g.fillText('∫ f(x) dx', x0, 56);
        g.beginPath(); g.moveTo(x0 + 100, 70); g.lineTo(x0 + 200, 70); g.moveTo(x0 + 110, 76); g.lineTo(x0 + 110, 12); g.stroke();
        g.beginPath(); g.moveTo(x0 + 112, 68); g.bezierCurveTo(x0 + 140, 68, x0 + 145, 18, x0 + 155, 18); g.bezierCurveTo(x0 + 165, 18, x0 + 170, 68, x0 + 198, 68); g.stroke();
        g.fillText('P(A)', x0 + 150, 14);
      }
      g.restore();
    }
    // hanging lantern
    g.strokeStyle = '#2b1d10'; g.lineWidth = 2; g.beginPath(); g.moveTo(480, 92); g.lineTo(480, 128); g.stroke();
    const glow = g.createRadialGradient(480, 146, 4, 480, 146, 90);
    glow.addColorStop(0, 'rgba(255,214,130,0.75)'); glow.addColorStop(1, 'rgba(255,214,130,0)');
    g.fillStyle = glow; g.fillRect(380, 56, 200, 180);
    g.fillStyle = '#3a2a16'; g.beginPath(); g.moveTo(468, 132); g.lineTo(492, 132); g.lineTo(486, 126); g.lineTo(474, 126); g.closePath(); g.fill();
    g.fillStyle = '#ffd88a'; g.fillRect(470, 133, 20, 24); g.fillStyle = '#3a2a16'; g.fillRect(468, 157, 24, 4);
    // ivy in the top corners
    for (let i = 0; i < 110; i++) {
      const left = i % 2 === 0, x = left ? r() * 120 : W - r() * 120, y = r() * 150 * (1 - Math.abs(left ? x : W - x) / 160);
      blot(g, x, y, 7, 5, ['#5f7a35', '#7d9a45', '#a9b54a'][i % 3], 0.9);
    }
    // vignette
    const v = g.createRadialGradient(W / 2, H * 0.5, 140, W / 2, H * 0.5, W * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,0.5)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  });
}

/** Foreground props of the corridor, drawn in front of the doors: book stack (left), brass globe (right). */
export function drawHallwayProps(g) {
  const books = images['prop.books'];
  if (books) g.drawImage(books, -14, H - 70, (70 * books.width) / books.height, 70);
  g.save(); g.translate(930, 498); g.scale(0.75, 0.75);
  {
    g.fillStyle = '#6b4a24'; g.fillRect(-40, 52, 80, 18);
    g.strokeStyle = '#b8873e'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 50); g.lineTo(0, 30); g.stroke();
    const globe = g.createRadialGradient(-8, -10, 4, 0, 0, 30);
    globe.addColorStop(0, '#e9d7a4'); globe.addColorStop(1, '#a8823f');
    g.fillStyle = globe; g.beginPath(); g.arc(0, 0, 28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a5a26'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, 12, 28, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-28, 0); g.lineTo(28, 0); g.stroke();
    g.strokeStyle = '#c99a4a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 34, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
  }
  g.restore();
}

/** Professor's study (character selection). */
export function makeStudyBackground(dpr, drawBookcaseImg) {
  return offscreen(dpr, (g) => {
    if (images['ui.study']) return cover(g, images['ui.study']);
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#2c1c10'); wall.addColorStop(0.6, '#4a3019'); wall.addColorStop(1, '#2b1a0d');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    // wood panelling
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 80) { g.strokeRect(x + 8, 300, 64, 150); }
    // window with light on the right
    g.fillStyle = '#1b130b'; g.fillRect(800, 60, 120, 210);
    const sky = g.createLinearGradient(0, 70, 0, 260);
    sky.addColorStop(0, '#f6e3b0'); sky.addColorStop(1, '#d6b779');
    g.fillStyle = sky; g.beginPath(); g.roundRect(808, 68, 104, 194, [52, 52, 0, 0]); g.fill();
    g.strokeStyle = '#3a2614'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(860, 68); g.lineTo(860, 262); g.moveTo(808, 165); g.lineTo(912, 165); g.stroke();
    g.save(); g.globalAlpha = 0.16; g.fillStyle = '#ffe2a0';
    g.beginPath(); g.moveTo(808, 120); g.lineTo(912, 90); g.lineTo(700, H); g.lineTo(450, H); g.closePath(); g.fill(); g.restore();
    // bookcases on the left
    if (drawBookcaseImg) { drawBookcaseImg(g, 10, 120, 150); drawBookcaseImg(g, 120, 140, 150); }
    // rug
    g.fillStyle = '#5e2620'; g.beginPath(); g.ellipse(W / 2, 520, 360, 40, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#b8873e'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, 520, 340, 34, 0, 0, Math.PI * 2); g.stroke();
    // warm lamp light
    const lamp = g.createRadialGradient(W / 2, 200, 40, W / 2, 200, 520);
    lamp.addColorStop(0, 'rgba(255,200,120,0.18)'); lamp.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = lamp; g.fillRect(0, 0, W, H);
  });
}

/** Classroom wall with a big empty chalkboard (rules screen). Board area: x 200–940, y 14–452. */
export function makeClassroomBackground(dpr) {
  return offscreen(dpr, (g) => {
    if (images['ui.classroom']) return cover(g, images['ui.classroom']);
    const r = rng(9);
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#3b2715'); wall.addColorStop(1, '#22160b');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    // board frame
    g.fillStyle = '#5b3a1f'; g.fillRect(192, 6, 756, 456);
    g.fillStyle = '#7a5130'; g.fillRect(196, 10, 748, 448);
    const board = g.createRadialGradient(570, 220, 60, 570, 220, 460);
    board.addColorStop(0, '#2c3e37'); board.addColorStop(1, '#17241f');
    g.fillStyle = board; g.fillRect(206, 18, 728, 432);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(230,236,228,${0.02 + r() * 0.04})`; g.fillRect(206 + r() * 728, 18 + r() * 432, 1.2, 1.2); }
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = `rgba(220,230,222,${0.03 + r() * 0.03})`; g.lineWidth = 20 + r() * 20;
      const sx = 220 + r() * 600, sy = 40 + r() * 380;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 80, sy + (r() - 0.5) * 40, sx + 200, sy + (r() - 0.5) * 30); g.stroke();
    }
    // chalk ledge
    g.fillStyle = '#6a4425'; g.fillRect(196, 452, 752, 12);
    g.fillStyle = C.chalk; g.fillRect(260, 448, 22, 5); g.fillRect(300, 449, 14, 4);
    // floor
    g.fillStyle = '#2a1a0d'; g.fillRect(0, 488, W, H - 488);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 486, W, 4);
  });
}

// ---------------------------------------------------------------- buildings
const STONE = '#dccaa2', STONE_D = '#b79e75', ROOF = '#8c3b2b', SLATE = '#5e6872', WIN = '#ffd27a';

function windows(g, x, y, cols, rows, w, h, gapX, gapY) {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = x + i * (w + gapX), wy = y + j * (h + gapY);
    g.fillStyle = WIN; g.beginPath(); g.roundRect(wx, wy, w, h, [w / 2, w / 2, 0, 0]); g.fill();
    g.strokeStyle = 'rgba(60,35,15,0.7)'; g.lineWidth = 1; g.stroke();
  }
}

/** Placeholder building in the map style. (x, y) = bottom centre. */
export function drawBuilding(g, school, x, y, s = 1) {
  const img = images[`building.${school.id}`];
  if (img) { const h = 120 * s, w = (h * img.width) / img.height; g.drawImage(img, x - w / 2, y - h, w, h); return; }
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round';
  const ink = 'rgba(55,35,18,0.85)';
  const body = (bx, by, bw, bh, col = STONE) => { g.fillStyle = col; g.fillRect(bx, by, bw, bh); g.strokeStyle = ink; g.lineWidth = 1.2; g.strokeRect(bx, by, bw, bh); };
  const roof = (bx, by, bw, bh, col = ROOF) => { g.fillStyle = col; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw / 2, by - bh); g.lineTo(bx + bw, by); g.closePath(); g.fill(); g.strokeStyle = ink; g.stroke(); };
  const spire = (bx, by, bw, bh, col = SLATE) => { g.fillStyle = col; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw / 2, by - bh); g.lineTo(bx + bw, by); g.closePath(); g.fill(); g.strokeStyle = ink; g.stroke(); };
  const dome = (cx, by, rr, col = '#7d8b8f') => { g.fillStyle = col; g.beginPath(); g.arc(cx, by, rr, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = ink; g.stroke(); g.fillStyle = '#c9a24c'; g.fillRect(cx - 1.5, by - rr - 8, 3, 8); };
  const emblem = (cx, cy, rr) => {
    g.fillStyle = '#f3e7c6'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#9a6a1c'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#5a2f14'; g.font = serif(rr * 1.25, { bold: true, italic: true }); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(school.symbol, cx, cy + 1); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  };
  // ground shadow
  g.fillStyle = 'rgba(40,30,10,0.3)'; g.beginPath(); g.ellipse(0, 2, 72, 9, 0, 0, Math.PI * 2); g.fill();
  switch (school.style) {
    case 'classical':
      body(-62, -58, 124, 58); windows(g, -54, -48, 6, 2, 9, 14, 10, 8);
      body(-36, -64, 72, 64, '#e6d6b2');
      for (let i = 0; i < 6; i++) { g.fillStyle = '#f2e6c8'; g.fillRect(-32 + i * 12.5, -58, 6, 52); g.strokeStyle = ink; g.lineWidth = 0.8; g.strokeRect(-32 + i * 12.5, -58, 6, 52); }
      roof(-42, -64, 84, 26, '#e3d2ad'); emblem(0, -76, 9);
      roof(-66, -58, 30, 14); roof(36, -58, 30, 14);
      break;
    case 'gothic':
      body(-52, -62, 104, 62); windows(g, -44, -54, 6, 2, 8, 16, 8, 8);
      body(-14, -90, 28, 90, '#d4c09a'); spire(-18, -90, 36, 42);
      for (const tx of [-58, 44]) { body(tx, -78, 14, 78, '#d4c09a'); spire(tx - 3, -78, 20, 28); }
      roof(-52, -62, 104, 18, SLATE); emblem(0, -66, 9);
      break;
    case 'dome':
      body(-60, -50, 120, 50); windows(g, -52, -42, 7, 2, 8, 12, 7.5, 6);
      body(-30, -70, 60, 20, '#e6d6b2');
      for (let i = 0; i < 6; i++) { g.fillStyle = '#f2e6c8'; g.fillRect(-26 + i * 9.5, -68, 4, 18); }
      dome(0, -70, 30); emblem(0, -36, 9);
      break;
    case 'castle':
      body(-58, -60, 116, 60); windows(g, -50, -52, 6, 2, 9, 15, 9, 8);
      for (const tx of [-66, -10, 46]) { body(tx, -86, 20, 86, '#cdb894'); spire(tx - 4, -86, 28, 30, SLATE); }
      emblem(0, -36, 9);
      break;
    case 'observatory':
      body(-56, -48, 112, 48); windows(g, -48, -40, 6, 2, 9, 12, 9, 6);
      body(-24, -66, 48, 18, '#e6d6b2');
      dome(0, -66, 26, '#8d9a9c');
      g.save(); g.translate(8, -84); g.rotate(-0.6); g.fillStyle = '#6f5a3a'; g.fillRect(0, -4, 34, 8); g.strokeStyle = ink; g.strokeRect(0, -4, 34, 8); g.restore();
      emblem(-34, -26, 8);
      break;
    default: // grand
      body(-72, -66, 144, 66); windows(g, -64, -58, 9, 2, 8, 16, 7.5, 9);
      body(-22, -100, 44, 100, '#d4c09a'); spire(-26, -100, 52, 48);
      for (const tx of [-80, 62]) { body(tx, -88, 18, 88, '#d4c09a'); spire(tx - 4, -88, 26, 32); }
      roof(-72, -66, 144, 20, SLATE); emblem(0, -76, 10);
      g.fillStyle = '#8c2f2a'; g.fillRect(-46, -60, 8, 22); g.fillRect(38, -60, 8, 22);
  }
  g.restore();
}

export function compass(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  parchment(g, -46, -46, 92, 92, 46);
  g.fillStyle = '#5a3a1e';
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate((i * Math.PI) / 2);
    g.beginPath(); g.moveTo(0, -36); g.lineTo(6, 0); g.lineTo(-6, 0); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = '#c9a24c'; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
  g.font = serif(11, { bold: true }); g.textAlign = 'center'; g.fillStyle = INK;
  g.fillText('N', 0, -38); g.fillText('S', 0, 45); g.fillText('E', 42, 4); g.fillText('W', -42, 4);
  g.textAlign = 'left';
  g.restore();
}
