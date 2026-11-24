// Menu screens: character selection, campus map, school hallway, level rules, results, time-up.
// Each render function draws the screen and registers its clickable areas via game.button / game.hit.
import { W, H, FLOOR_Y, PLAYER_W, PLAYER_H, SPRITE_H, COLORS as C } from './constants.js';
import { LEVELS } from './levels.js';
import { SCHOOLS, levelIndexById, isComingSoon } from './schools.js';
import { schoolProgress, totalProgress, levelStats, isCompleted, nextLevelId, isUnlocked, starsMissing } from './progress.js';
import { S } from './mathEngine.js';
import { images } from './assets.js';
import { drawCharacter, drawToken, drawKey, drawSparkle, chalkFont, mathFont } from './draw.js';
import {
  serif, parchment, ribbon, star, stars, lockIcon, checkBanner, glowFrame, wrapText, withGray, drawBuilding, compass,
  inRect, INK, GOLD, hallwayDoors, drawHallwayProps,
} from './ui.js';

export const CHARACTERS = [
  { id: 'professor', label: 'Prof. Theodore', quote: "Mathematics is not just about numbers – it's about seeing the world differently." },
  { id: 'professorka', label: 'Prof. Margaret', quote: 'Small steps make big progress.' },
];

const centerText = (g, text, x, y, font, color) => {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.fillText(text, x, y); g.textAlign = 'left';
};

function boardPlaque(g, x, y, w, h, title, sub) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 10;
  g.fillStyle = '#5b3a1f'; g.beginPath(); g.roundRect(x - 5, y - 5, w + 10, h + 10, 6); g.fill();
  g.restore();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#2d433a'); gr.addColorStop(1, '#1b2a24');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = GOLD; g.lineWidth = 1.5; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  centerText(g, title, x + w / 2, y + (sub ? h * 0.48 : h * 0.62), chalkFont(sub ? 19 : 22, true), C.chalk);
  if (sub) centerText(g, sub, x + w / 2, y + h * 0.82, chalkFont(12), C.chalkDim);
}

function imgIcon(g, key, x, y, size) { // fit an image into a size×size box centred at (x, y)
  const img = images[key];
  if (!img) return;
  const s = size / Math.max(img.width, img.height);
  g.drawImage(img, x - (img.width * s) / 2, y - (img.height * s) / 2, img.width * s, img.height * s);
}

// ================================================================ 1. character selection
export function renderCharSelect(game, g) {
  g.drawImage(game.backgrounds.study, 0, 0, W, H);
  centerText(g, 'Q.E.D.', W / 2, 44, serif(40, { bold: true }), GOLD);
  centerText(g, 'Quod Erat Demonstrandum – a mathematical platformer', W / 2, 66, serif(15, { italic: true }), '#f0dfb8');
  boardPlaque(g, W / 2 - 190, 78, 380, 40, 'CHOOSE YOUR CHARACTER');

  CHARACTERS.forEach((c, i) => {
    const cx = W / 2 + (i === 0 ? -130 : 130);
    const card = { x: cx - 105, y: 136, w: 210, h: 250 };
    const sel = i === game.charIndex;
    const hover = game.hit(card, () => { game.charIndex = i; }, () => game.confirmCharacter());
    // frame + board
    g.save();
    if (sel) { g.shadowColor = `rgba(255,200,80,${0.55 + 0.3 * Math.sin(game.t * 3)})`; g.shadowBlur = 26; }
    g.fillStyle = sel ? '#c9a24c' : '#6b4a28'; g.beginPath(); g.roundRect(card.x - 6, card.y - 6, card.w + 12, card.h + 12, 8); g.fill();
    g.restore();
    const gr = g.createRadialGradient(cx, card.y + 120, 20, cx, card.y + 120, 180);
    gr.addColorStop(0, hover || sel ? '#2f4840' : '#283c35'); gr.addColorStop(1, '#16221d');
    g.fillStyle = gr; g.fillRect(card.x, card.y, card.w, card.h);
    if (sel) for (let k = 0; k < 6; k++) { // twinkles
      const a = game.t * 1.3 + k * 1.7;
      drawSparkle(g, cx + Math.cos(a) * 88, card.y + 120 + Math.sin(a * 1.3) * 100, 3 + 2 * Math.sin(a * 2), 0.8);
    }
    g.save(); g.globalAlpha = sel ? 1 : hover ? 0.9 : 0.72;
    drawCharacter(g, c.id, cx - PLAYER_W / 2, card.y + card.h - 14 - PLAYER_H, { scale: 2.25, facing: i === 0 ? 1 : -1 });
    g.restore();
    ribbon(g, cx, card.y + card.h + 8, 180, 34, c.label, { font: serif(18, { italic: true, bold: true }) });
    g.font = serif(13, { italic: true }); g.fillStyle = '#f0dfb8'; g.textAlign = 'center';
    wrapText(g, c.quote, 230).forEach((line, k) => g.fillText(line, cx, card.y + card.h + 44 + k * 16));
    g.textAlign = 'left';
  });

  game.button({ x: W / 2 - 110, y: 474, w: 220, h: 46 }, 'CONFIRM', () => game.confirmCharacter(), { glow: true });
  centerText(g, '← → choose · Enter confirm', W / 2, 534, serif(11, { italic: true }), 'rgba(240,223,184,0.7)');
}

const roomNumber = (levelId) => {
  const s = SCHOOLS.find((sc) => sc.levels.includes(levelId));
  return s ? s.levels.indexOf(levelId) + 1 : 1;
};

// ================================================================ 2. world map
export function schoolState(game, school) {
  if (isComingSoon(school)) return 'soon';
  if (!isUnlocked(game.progress, school)) return 'locked';
  const { done, total } = schoolProgress(game.progress, school);
  return done === 0 ? 'new' : done >= total ? 'done' : 'progress';
}

/** Painted campus map: buildings come from the picture, state/hover are blended on top. */
function renderPaintedMap(game, g) {
  g.drawImage(game.backgrounds.map, 0, 0, W, H);
  SCHOOLS.forEach((s, i) => {
    const a = s.art, state = schoolState(game, s), patch = game.mapPatches[s.id];
    const hover = game.hit(a, () => game.goHallway(s.id));
    const focus = hover || i === game.mapSel;
    const gray = state === 'locked' || state === 'soon' ? 1 : 0; // open schools in colour, locked ones grey
    if (patch && gray > 0) { g.save(); g.globalAlpha = gray; g.drawImage(patch.gray, a.x, a.y, a.w, a.h); g.restore(); }
    if (state === 'progress' || state === 'new' || (focus && state === 'done')) {
      const cx = a.x + a.w / 2, cy = a.y + a.h * 0.45;
      g.save();
      g.translate(cx, cy); g.scale(1, a.h / a.w);
      const gl = g.createRadialGradient(0, 0, a.w * 0.2, 0, 0, a.w * 0.62);
      gl.addColorStop(0, 'rgba(255,214,120,0)'); gl.addColorStop(0.75, `rgba(255,205,90,${0.28 + 0.14 * Math.sin(game.t * 3)})`); gl.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, a.w * 0.62, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    if (focus && patch) { g.save(); g.globalAlpha = 0.55; if (gray > 0.9) g.filter = 'grayscale(1)'; g.drawImage(patch.bright, a.x, a.y, a.w, a.h); g.restore(); }
    // progress badge
    const locked = state === 'locked';
    const chip = { x: a.chip.x - (locked ? 76 : 48), y: a.chip.y, w: locked ? 152 : 96, h: 22 };
    g.fillStyle = 'rgba(28,24,18,0.88)'; g.beginPath(); g.roundRect(chip.x, chip.y, chip.w, chip.h, 11); g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 1.2; g.stroke();
    if (locked) {
      lockIcon(g, chip.x + 15, chip.y + 10, 0.55);
      g.font = serif(12, { bold: true, italic: true }); g.fillStyle = '#f3e7c6'; g.textAlign = 'center';
      g.fillText(`Need ${s.unlock}`, chip.x + 60, chip.y + 16); g.textAlign = 'left';
      star(g, chip.x + 98, chip.y + 11, 7, true);
      g.font = serif(11, { italic: true }); g.fillStyle = '#e9dcc0'; g.fillText('to open', chip.x + 109, chip.y + 15);
    } else if (state === 'soon') {
      lockIcon(g, chip.x + 15, chip.y + 10, 0.55);
      centerText(g, 'Coming soon', chip.x + 56, chip.y + 15, serif(11, { italic: true }), '#e9dcc0');
    } else {
      const { done, total } = schoolProgress(game.progress, s);
      star(g, chip.x + 16, chip.y + 11, 7, state !== 'new');
      centerText(g, `${done} / ${total}`, chip.x + 56, chip.y + 16, serif(13, { bold: true }), '#f3e7c6');
    }
    if (state === 'done') star(g, a.x + a.w - 18, a.y + 18, 15, true);
  });
  // total progress (bottom-right, over the scroll) + back button (bottom-left, over the books)
  const tp = totalProgress(game.progress);
  parchment(g, 742, 488, 204, 44, 8);
  g.font = serif(13, { italic: true, bold: true }); g.fillStyle = INK; g.fillText('Total progress', 754, 505);
  g.fillStyle = 'rgba(60,40,20,0.25)'; g.beginPath(); g.roundRect(754, 513, 130, 10, 5); g.fill();
  g.fillStyle = '#3f7343'; g.beginPath(); g.roundRect(754, 513, Math.max(0.001, 130 * (tp.total ? tp.done / tp.total : 0)), 10, 5); g.fill();
  g.font = serif(13, { bold: true }); g.fillStyle = INK; g.fillText(`${tp.done} / ${tp.total}`, 892, 523);
  game.button({ x: 12, y: 492, w: 184, h: 38 }, 'Change Character', () => game.goCharSelect(), { style: 'wood', icon: '←' });
  renderToast(game, g);
}

/** Short parchment message at the bottom of the map (e.g. "this school is still locked"). */
function renderToast(game, g) {
  const tm = game.toast;
  if (!tm) return;
  const age = game.t - tm.t0;
  if (age > 3.2) { game.toast = null; return; }
  g.save();
  g.globalAlpha = Math.min(1, age * 5, (3.2 - age) * 3);
  g.font = serif(15, { italic: true, bold: true });
  const w = Math.min(560, g.measureText(tm.text).width + 60);
  parchment(g, W / 2 - w / 2, 270, w, 40, 8);
  if (tm.lock) lockIcon(g, W / 2 - w / 2 + 22, 288, 0.6, '#6b5a3a');
  centerText(g, tm.text, W / 2 + (tm.lock ? 10 : 0), 296, serif(15, { italic: true, bold: true }), INK);
  g.restore();
}

export function renderMap(game, g) {
  if (images['ui.map'] && game.mapPatches) return renderPaintedMap(game, g);
  g.drawImage(game.backgrounds.map, 0, 0, W, H);
  let hovered = null;
  SCHOOLS.forEach((s, i) => {
    const state = schoolState(game, s);
    const { x, y } = s.map;
    const area = { x: x - 80, y: y - 120, w: 160, h: 170 };
    const hover = game.hit(area, () => game.goHallway(s.id));
    const focus = hover || i === game.mapSel;
    if (focus) hovered = s;
    const gray = state === 'locked' || state === 'soon' ? 1 : 0; // open schools in colour, locked ones grey
    if (state === 'progress' || (focus && state !== 'soon')) {
      g.save(); g.globalAlpha = 0.9;
      const gl = g.createRadialGradient(x, y - 50, 10, x, y - 50, 95);
      gl.addColorStop(0, `rgba(255,214,120,${0.35 + 0.15 * Math.sin(game.t * 3)})`); gl.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gl; g.fillRect(x - 100, y - 150, 200, 200); g.restore();
    }
    g.save();
    if (focus) g.translate(0, -3);
    withGray(g, gray, () => {
      if (focus) g.filter = `${g.filter === 'none' ? '' : g.filter} brightness(1.12)`;
      drawBuilding(g, s, x, y, 1);
    });
    g.restore();
    ribbon(g, x, y + 22, 176, 30, s.name, { font: serif(s.name.length > 24 ? 13 : 15, { italic: true, bold: true }) });
    // progress chip
    const chip = { x: x - 44, y: y + 40, w: 88, h: 22 };
    g.fillStyle = 'rgba(28,24,18,0.85)'; g.beginPath(); g.roundRect(chip.x, chip.y, chip.w, chip.h, 11); g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 1.2; g.stroke();
    if (state === 'soon') {
      lockIcon(g, chip.x + 15, chip.y + 10, 0.55);
      centerText(g, 'Coming soon', chip.x + 52, chip.y + 15, serif(11, { italic: true }), '#e9dcc0');
    } else {
      const { done, total } = schoolProgress(game.progress, s);
      star(g, chip.x + 16, chip.y + 11, 7, state !== 'new');
      centerText(g, `${done} / ${total}`, chip.x + 54, chip.y + 16, serif(13, { bold: true }), '#f3e7c6');
    }
    if (state === 'done') { star(g, x + 52, y - 96, 13, true); }
  });

  // title plaque + total progress
  boardPlaque(g, 18, 14, 330, 58, 'THE MATHEMATICAL WORLD', 'Explore the schools. Master the levels.');
  const tp = totalProgress(game.progress);
  parchment(g, 690, 16, 252, 54, 8);
  g.font = serif(14, { italic: true, bold: true }); g.fillStyle = INK; g.fillText('Total progress', 704, 36);
  g.fillStyle = 'rgba(60,40,20,0.25)'; g.beginPath(); g.roundRect(704, 46, 160, 12, 6); g.fill();
  g.fillStyle = '#3f7343'; g.beginPath(); g.roundRect(704, 46, Math.max(0.001, 160 * (tp.total ? tp.done / tp.total : 0)), 12, 6); g.fill();
  g.font = serif(14, { bold: true }); g.fillStyle = INK; g.fillText(`${tp.done} / ${tp.total}`, 874, 57);

  compass(g, 900, 484, 0.75);
  game.button({ x: 16, y: 486, w: 190, h: 40 }, 'Change Character', () => game.goCharSelect(), { style: 'wood', icon: '←' });

  const info = hovered ?? SCHOOLS[game.mapSel];
  if (info) {
    parchment(g, W / 2 - 170, 494, 340, 36, 6);
    const txt = isComingSoon(info) ? `${info.name} – coming soon` : `${info.motto}  ·  click to enter`;
    centerText(g, txt, W / 2, 517, serif(13, { italic: true }), INK);
  }
}

// ================================================================ 3. school hallway
const PER_PAGE = 8;

export function hallwayItems(school) {
  return [
    ...school.levels.map((id) => ({ id, level: LEVELS[levelIndexById(id)], soon: false })),
    ...school.planned.map((name) => ({ id: `soon:${name}`, name, soon: true })),
  ];
}

/** One classroom door on a side wall (skewed with the wall). Completed rooms show the open door. */
function drawHallDoor(g, d, { open, gray, glow, t }) {
  const closed = images['prop.door'], opened = images['prop.door_open'];
  const h = d.h, w = closed ? ((h * closed.width) / closed.height) * 0.86 : h * 0.45;
  if (open) { // warm light spilling onto the floor
    const lx = d.x, ly = d.bottom - 4;
    g.save(); g.translate(lx, ly); g.scale(1, 0.3);
    const gl = g.createRadialGradient(0, 0, 4, 0, 0, 90 * d.s);
    gl.addColorStop(0, 'rgba(255,220,140,0.55)'); gl.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 90 * d.s, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.save();
  g.translate(d.x, d.bottom);
  g.transform(1, d.skew, 0, 1, 0, 0);
  if (d.side > 0) g.scale(-1, 1); // right wall: mirrored so the doors face the corridor
  if (glow) { g.shadowColor = `rgba(255,200,80,${0.7 + 0.3 * Math.sin(t * 3)})`; g.shadowBlur = 26; }
  if (gray > 0) g.filter = `grayscale(${gray}) brightness(${1 - gray * 0.12})`;
  if (open && opened) g.drawImage(opened, -w / 2, -h, ((h * opened.width) / opened.height) * 0.86, h);
  else if (closed) g.drawImage(closed, -w / 2, -h, w, h);
  else { g.fillStyle = '#6b4526'; g.fillRect(-w / 2, -h, w, h); }
  g.restore();
  return w;
}

export function renderHallway(game, g) {
  const school = SCHOOLS.find((s) => s.id === game.schoolId);
  g.drawImage(game.backgrounds.hallway, 0, 0, W, H);
  const items = hallwayItems(school);
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  game.hallPage = Math.min(game.hallPage, pages - 1);
  const pageItems = items.slice(game.hallPage * PER_PAGE, (game.hallPage + 1) * PER_PAGE);
  const recommended = nextLevelId(game.progress, school);
  const doors = hallwayDoors(pageItems.length);
  let hoverX = null;

  // back doors first so the front ones overlap them
  const order = pageItems.map((it, k) => k).sort((a, b) => doors[a].s - doors[b].s);
  for (const k of order) {
    const it = pageItems[k], d = doors[k];
    const idx = game.hallPage * PER_PAGE + k;
    const done = !it.soon && isCompleted(game.progress, it.id);
    const rec = !it.soon && it.id === recommended;
    const doorW = (d.h * 0.527) * 0.86;
    const plaque = { w: 78 * d.s + 8, h: (done ? 62 : 50) * d.s + 10 }; // narrower than the door spacing → no overlap
    plaque.x = d.x - plaque.w / 2; plaque.y = d.bottom - d.h - plaque.h - 4 + d.skew * 0;
    const area = { x: d.x - doorW / 2 - 6, y: plaque.y - 4, w: doorW + 12, h: d.bottom - plaque.y + 4 };
    const hover = !it.soon && game.hit(area, () => game.goRules(levelIndexById(it.id)));
    const focus = hover || (!it.soon && idx === game.hallSel);
    if (focus) hoverX = d.x;
    let gray = done ? 0 : rec ? 0.3 : 1;
    let open = done;
    if (game.doorAnim && game.doorAnim.id === it.id) { // first clear: colour in, then swing open
      const k2 = (game.t - game.doorAnim.t0) / 1.4;
      gray = Math.max(0, Math.min(1, 1 - k2));
      open = k2 > 0.65;
    }
    g.save();
    if (focus) g.translate(0, -3);
    drawHallDoor(g, d, { open, gray, glow: rec || focus, t: game.t });
    // symbol chalked on the closed door's window
    if (!open) {
      g.save(); g.translate(d.x, d.bottom - d.h * 0.8); g.transform(1, d.skew, 0, 1, 0, 0);
      g.font = serif(18 * d.s + 2, { bold: true, italic: true }); g.fillStyle = `rgba(244,239,230,${0.9 - gray * 0.3})`; g.textAlign = 'center';
      g.fillText(it.soon ? '?' : it.level.symbol, 0, 6); g.textAlign = 'left'; g.restore();
    }
    // hanging room sign
    withGray(g, it.soon ? 0.8 : 0, () => parchment(g, plaque.x, plaque.y, plaque.w, plaque.h, 5));
    const title = it.soon ? it.name : it.level.name.replace(/^\d+\.\s*/, '');
    centerText(g, `Room ${idx + 1}`, d.x, plaque.y + 10 * d.s + 5, serif(9 * d.s + 2.5, { italic: true }), '#5a3d22');
    g.font = serif(11 * d.s + 2.5, { bold: true, italic: true }); g.fillStyle = INK; g.textAlign = 'center';
    const lines = wrapText(g, title, plaque.w - 8).slice(0, 2);
    const lh = 11 * d.s + 3;
    lines.forEach((line, j) => g.fillText(line, d.x, plaque.y + 22 * d.s + 9 + (lines.length > 1 ? 0 : lh * 0.35) + j * lh));
    g.textAlign = 'left';
    if (done) {
      const st = levelStats(game.progress, it.id);
      stars(g, d.x, plaque.y + plaque.h - 9 * d.s - 3, st?.bestStars ?? 0, 5 * d.s + 1.5, 1.5);
      checkBanner(g, plaque.x + plaque.w - 4, plaque.y - 6, 16 * d.s + 4, 22 * d.s + 5);
    }
    if (it.soon) { lockIcon(g, d.x, d.bottom - d.h * 0.45, d.s); }
    if (rec) centerText(g, 'NEXT', d.x, d.bottom - d.h * 0.35, chalkFont(13 * d.s + 2, true), '#ffe7a6');
    g.restore();
  }

  drawHallwayProps(g);

  // header
  game.button({ x: 14, y: 14, w: 150, h: 40 }, 'Back to Map', () => game.goMap(), { style: 'wood', icon: '←' });
  ribbon(g, W / 2, 38, 360, 44, school.name, { font: serif(24, { italic: true, bold: true }) });
  const { done, total } = schoolProgress(game.progress, school);
  const chip = { x: W / 2 - 80, y: 66, w: 160, h: 26 };
  g.fillStyle = 'rgba(28,20,12,0.88)'; g.beginPath(); g.roundRect(chip.x, chip.y, chip.w, chip.h, 13); g.fill();
  g.strokeStyle = GOLD; g.lineWidth = 1.2; g.stroke();
  if (isComingSoon(school)) centerText(g, 'Coming soon', W / 2, chip.y + 18, serif(13, { italic: true, bold: true }), '#f3e7c6');
  else { star(g, chip.x + 20, chip.y + 13, 8, done > 0); centerText(g, `${done} / ${total} completed`, W / 2 + 10, chip.y + 18, serif(14, { italic: true, bold: true }), '#f3e7c6'); }
  if (!isComingSoon(school)) {
    const nextId = recommended ?? school.levels[0];
    game.button({ x: W - 214, y: 14, w: 200, h: 40 }, recommended ? 'Play Next Level' : 'Replay Room 1', () => game.goRules(levelIndexById(nextId)), { icon: '▶', glow: !!recommended });
  }
  if (pages > 1) {
    game.button({ x: 440, y: 470, w: 36, h: 36 }, '‹', () => { game.hallPage = Math.max(0, game.hallPage - 1); }, { style: 'wood', disabled: game.hallPage === 0 });
    game.button({ x: 484, y: 470, w: 36, h: 36 }, '›', () => { game.hallPage = Math.min(pages - 1, game.hallPage + 1); }, { style: 'wood', disabled: game.hallPage === pages - 1 });
  }

  // the chosen character stands on the carpet, presenting the classrooms
  const facing = hoverX === null ? 1 : hoverX < W / 2 ? -1 : 1;
  drawCharacter(g, game.character, W / 2 - PLAYER_W / 2, 530 - PLAYER_H, { scale: 1.45, facing });
  centerText(g, isComingSoon(school) ? 'This school is still being built – its classrooms will open soon.' : 'Click a classroom · ← → choose · Enter open · Esc back to map',
    W / 2, 116, serif(12, { italic: true }), 'rgba(240,223,184,0.9)');

  // sparkles while a door is colouring in / opening
  if (game.doorAnim && game.t - game.doorAnim.t0 < 1.8 && game.t > game.doorAnim.t0 && Math.random() < 0.7) {
    const k = pageItems.findIndex((it) => it.id === game.doorAnim.id);
    if (k >= 0) { const d = doors[k]; game.effects.push({ kind: 'spark', x: d.x + (Math.random() - 0.5) * d.h * 0.45, y: d.bottom - Math.random() * d.h, vx: 0, vy: -20, t: 0, dur: 0.8 }); }
  }
}

// ================================================================ 4. level rules
const MECHANICS = [
  ['wrong', 'Wrong symbol: −3 seconds'],
  ['prop.sponge', 'Yellow sponge: bounce higher'],
  ['prop.chalk', 'Chalk: +5 seconds'],
  ['prop.eraser', 'Eraser: undo a mistake'],
  ['prop.ladder', 'Ladder: climb up or down'],
  ['prop.key', 'Golden key: unlocks the exit door'],
  ['prop.door_open', 'Open door: level complete'],
];
// matches the real key bindings in main.js
const CONTROLS = [
  ['← →', 'Move'], ['↑ ↓', 'Climb ladders'], ['Space', 'Jump (↑ too)'], ['F', 'Pick up'],
  ['E', 'Eraser'], ['R', 'Reset'], ['↓', 'Drop down'], ['Esc', 'Leave level'],
];

function keyCap(g, x, y, label) {
  g.font = chalkFont(13, true);
  const w = Math.max(26, g.measureText(label).width + 14);
  g.strokeStyle = C.chalk; g.lineWidth = 1.4;
  g.beginPath(); g.roundRect(x, y - 14, w, 19, 4); g.stroke();
  g.fillStyle = C.chalk; g.textAlign = 'center'; g.fillText(label, x + w / 2, y + 1); g.textAlign = 'left';
  return w;
}

export function renderRules(game, g) {
  const level = LEVELS[game.rulesLevel];
  const room = roomNumber(level.id);
  g.drawImage(game.backgrounds.classroom, 0, 0, W, H);
  // header
  centerText(g, 'LEVEL RULES', 470, 52, chalkFont(30, true), C.chalk);
  g.strokeStyle = C.chalk; g.lineWidth = 1.5; g.beginPath(); g.moveTo(370, 62); g.quadraticCurveTo(470, 66, 570, 61); g.stroke();
  centerText(g, `Room ${room} · ${level.name.replace(/^\d+\.\s*/, '')}`, 470, 84, chalkFont(17), '#d9e6dd');
  // target box
  g.strokeStyle = C.chalk; g.lineWidth = 1.6; g.strokeRect(760, 28, 160, 44);
  centerText(g, `TARGET: ${level.targetText}`, 840, 57, chalkFont(21, true), C.chalk);

  // --- Objective (left column)
  g.font = chalkFont(17, true); g.fillStyle = '#ffe7a6'; g.fillText('Objective', 226, 120);
  const obj = [
    ['token', 'Collect numbers and operators in the correct order to reach the target.'],
    ['order', 'Respect the order of mathematical operations.'],
    ['key', 'Solve the expression, collect the key and reach the exit door.'],
  ];
  obj.forEach(([icon, text], i) => {
    const y = 148 + i * 44;
    if (icon === 'token') drawToken(g, '3', 244, y - 2, 1, {});
    else if (icon === 'order') { g.font = mathFont(15, true); g.fillStyle = C.chalk; g.fillText('×÷', 230, y - 6); g.fillText('+−', 230, y + 10); }
    else imgIcon(g, 'prop.key', 244, y - 2, 30);
    g.font = chalkFont(12.5); g.fillStyle = C.chalk;
    wrapText(g, text, 270).slice(0, 2).forEach((l, k) => g.fillText(l, 272, y - 6 + k * 15));
  });
  // this room's rule + its expression
  g.font = chalkFont(16, true); g.fillStyle = '#ffe7a6'; g.fillText(`This room: ${level.name.replace(/^\d+\.\s*/, '')}`, 226, 300);
  g.font = chalkFont(12.5); g.fillStyle = C.chalk;
  wrapText(g, level.rule, 310).slice(0, 4).forEach((l, k) => g.fillText(l, 228, 322 + k * 16));
  // template preview
  let tx = 228;
  const ty = 400;
  g.font = mathFont(15);
  for (const p of level.template) {
    if (p === S) { g.strokeStyle = C.chalk; g.lineWidth = 1.2; g.strokeRect(tx, ty - 16, 22, 22); tx += 28; }
    else { g.fillStyle = C.chalk; g.fillText(p, tx, ty); tx += g.measureText(p).width + 6; }
  }
  g.fillStyle = '#ffe7a6'; g.fillText(`= ${level.targetText}`, tx, ty);

  // --- Mechanics (right column)
  g.font = chalkFont(17, true); g.fillStyle = '#ffe7a6'; g.fillText('Game mechanics', 590, 120);
  MECHANICS.forEach(([icon, text], i) => {
    const y = 144 + i * 28;
    if (icon === 'wrong') {
      drawToken(g, '7', 606, y - 4, 1, {});
      g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(594, y - 16); g.lineTo(618, y + 8); g.moveTo(618, y - 16); g.lineTo(594, y + 8); g.stroke();
    } else imgIcon(g, icon, 606, y - 4, icon === 'prop.ladder' || icon === 'prop.door_open' ? 30 : 34);
    g.font = chalkFont(13); g.fillStyle = C.chalk; g.fillText(text, 634, y + 1);
  });

  // --- Controls (bottom row)
  g.font = chalkFont(16, true); g.fillStyle = '#ffe7a6'; g.fillText('Controls', 590, 348);
  CONTROLS.forEach(([k, label], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 590 + col * 168, y = 372 + row * 22;
    const w = keyCap(g, x, y, k);
    g.font = chalkFont(12); g.fillStyle = '#d9e6dd'; g.fillText(label, x + w + 6, y);
  });

  // professor beside the board, pointing at it
  const feet = 486, cx = 104, scale = 2.35;
  drawCharacter(g, game.character, cx - PLAYER_W / 2, feet - PLAYER_H, { scale, facing: 1 });
  const h = SPRITE_H * scale;
  g.strokeStyle = '#6b4423'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + h * 0.15, feet - h * 0.72); g.lineTo(cx + h * 0.15 + 92, feet - h * 0.72 - 54); g.stroke();
  g.fillStyle = C.chalk; g.beginPath(); g.arc(cx + h * 0.15 + 92, feet - h * 0.72 - 54, 2.5, 0, Math.PI * 2); g.fill();

  game.button({ x: 226, y: 482, w: 150, h: 44 }, 'Back', () => game.goHallway(game.schoolId), { style: 'wood', icon: '←' });
  game.button({ x: 560, y: 480, w: 230, h: 48 }, 'START LEVEL', () => game.startLevel(game.rulesLevel), { glow: true, icon: '▶' });
  centerText(g, 'Enter = start · Esc = back', 870, 510, serif(11, { italic: true }), 'rgba(240,223,184,0.75)');
}

// ================================================================ 5. results
export function renderResults(game, g) {
  const r = game.results;
  const level = LEVELS[r.levelIndex];
  g.drawImage(game.background, 0, 0, W, H);
  g.fillStyle = 'rgba(12,18,15,0.6)'; g.fillRect(0, 0, W, H);
  const P = { x: 150, y: 22, w: 560, h: 492 };
  parchment(g, P.x, P.y, P.w, P.h, 12);
  centerText(g, 'Q.E.D. – Level Completed!', P.x + P.w / 2, 70, serif(30, { bold: true, italic: true }), INK);
  centerText(g, `Room ${roomNumber(level.id)} · ${level.name.replace(/^\d+\.\s*/, '')}`, P.x + P.w / 2, 94, serif(15, { italic: true }), '#5a3d22');
  if (r.unlocked?.length) {
    const names = r.unlocked.map((id) => SCHOOLS.find((s) => s.id === id).name).join(', ');
    g.save(); g.globalAlpha = 0.75 + 0.25 * Math.sin(game.t * 4);
    centerText(g, `🔓 New school unlocked: ${names}!`, P.x + P.w / 2, 378, serif(16, { bold: true, italic: true }), '#2f5a33');
    g.restore();
  }
  // solved expression on a mini board
  const B = { x: P.x + 40, y: 108, w: P.w - 80, h: 60 };
  g.fillStyle = '#5b3a1f'; g.fillRect(B.x - 4, B.y - 4, B.w + 8, B.h + 8);
  g.fillStyle = '#21322b'; g.fillRect(B.x, B.y, B.w, B.h);
  centerText(g, `${r.expression} = ${level.targetText}`, B.x + B.w / 2, B.y + 39, mathFont(r.expression.length > 30 ? 18 : 24, true), C.chalk);
  // stars pop in one by one
  const since = game.t - r.t0;
  for (let i = 0; i < 3; i++) {
    const k = Math.max(0, Math.min(1, (since - 0.25 - i * 0.3) / 0.25));
    const filled = i < r.stars && k > 0;
    const rr = 24 * (filled ? 0.6 + 0.4 * k + 0.15 * Math.sin(Math.min(1, k) * Math.PI) : 1);
    star(g, P.x + P.w / 2 + (i - 1) * 64, 208, rr, filled);
  }
  if (r.newBest) centerText(g, '★ New best score! ★', P.x + P.w / 2, 252, serif(15, { bold: true, italic: true }), '#8a5a12');
  // statistics
  const rows = [
    ['Result', `${r.value}`],
    ['Correct symbols', `${r.correct}`],
    ['Mistakes', `${r.mistakes}`],
    ['Time left', `${Math.floor(r.timeLeft)} s`],
    ['Score', `${r.score}`],
    ['Best score', `${r.bestScore}`],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = P.x + 60 + col * 240, y = 284 + row * 34;
    g.font = serif(15, { italic: true }); g.fillStyle = '#5a3d22'; g.fillText(k, x, y);
    g.font = serif(17, { bold: true }); g.fillStyle = INK; g.textAlign = 'right'; g.fillText(v, x + 200, y); g.textAlign = 'left';
    g.strokeStyle = 'rgba(90,55,20,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 9); g.lineTo(x + 200, y + 9); g.stroke();
  });
  // buttons
  const hasNext = r.nextIndex !== null;
  const bw = 120, by = 404;
  const bx = P.x + (P.w - (4 * bw + 3 * 10)) / 2;
  game.button({ x: bx, y: by, w: bw, h: 42 }, 'Next Level', () => game.goRules(r.nextIndex), { disabled: !hasNext, glow: hasNext });
  game.button({ x: bx + (bw + 10), y: by, w: bw, h: 42 }, 'Replay', () => game.startLevel(r.levelIndex));
  game.button({ x: bx + 2 * (bw + 10), y: by, w: bw, h: 42 }, 'Back to School', () => game.goHallway(game.schoolId), { style: 'wood' });
  game.button({ x: bx + 3 * (bw + 10), y: by, w: bw, h: 42 }, 'Back to Map', () => game.goMap(), { style: 'wood' });
  centerText(g, hasNext ? 'Enter = next level · R = replay · Esc = school' : 'Last room of this school! · R = replay · Esc = school',
    P.x + P.w / 2, 476, serif(12, { italic: true }), '#5a3d22');
  // celebrating character with the key
  const bob = Math.sin(game.t * 4) * 8;
  drawCharacter(g, game.character, 830 - PLAYER_W / 2, 330 - PLAYER_H + bob, { scale: 1.9, airborne: true, facing: -1, vy: -200 });
  drawKey(g, 790, 220 + bob, 34, -0.4 + Math.sin(game.t * 2) * 0.1);
  if (Math.random() < 0.3) game.effects.push({ kind: 'spark', x: 760 + Math.random() * 140, y: 160 + Math.random() * 200, vx: 0, vy: -20, t: 0, dur: 0.9 });
}

// ================================================================ time up (overlay on the level)
export function renderTimeUp(game, g) {
  g.fillStyle = 'rgba(12,18,15,0.7)'; g.fillRect(0, 0, W, H);
  parchment(g, W / 2 - 230, 140, 460, 250, 12);
  centerText(g, "Time's up!", W / 2, 196, serif(36, { bold: true, italic: true }), '#8c2f2a');
  centerText(g, 'The bell rang before the proof was finished.', W / 2, 228, serif(15, { italic: true }), '#5a3d22');
  centerText(g, game.expressionText(), W / 2, 266, mathFont(20, true), INK);
  game.button({ x: W / 2 - 200, y: 306, w: 190, h: 46 }, 'Try Again', () => game.startLevel(game.levelIndex), { glow: true });
  game.button({ x: W / 2 + 10, y: 306, w: 190, h: 46 }, 'Back to School', () => game.goHallway(game.schoolId), { style: 'wood' });
  centerText(g, 'Enter = try again · Esc = school', W / 2, 374, serif(12, { italic: true }), '#5a3d22');
}

export { inRect };
