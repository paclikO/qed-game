// Developer Sandbox overlay & debug renderer.
// Active only when loaded via dev.html (window.QED_DEV = true) or ?dev=1 / ?sandbox=1.
// Never loaded/shown to normal players on index.html, and uses isolated localStorage (qed.progress.dev.v1).
import * as K from './constants.js';
import { LEVELS } from './levels.js';
import { SCHOOLS, levelIndexById, schoolOfLevel } from './schools.js';
import { CHARACTERS } from './screens.js';
import { loadProgress, saveProgress } from './progress.js';

export function isDevMode() {
  if (typeof globalThis === 'undefined') return false;
  if (globalThis.QED_DEV === true) return true;
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search);
    if (q.has('dev') && q.get('dev') !== '0' && q.get('dev') !== 'false') return true;
    if (q.has('sandbox') && q.get('sandbox') !== '0' && q.get('sandbox') !== 'false') return true;
  }
  return false;
}

/** Draw hitboxes, pickup radii, platforms, ladders, sponges, and live player telemetry on the canvas. */
export function renderDevOverlay(game, g) {
  if (game.state !== 'play' && game.state !== 'exit') return;
  const p = game.player;
  g.save();
  g.lineWidth = 1.25;

  // Floor & ceiling lines
  g.strokeStyle = 'rgba(120,255,180,0.45)';
  g.beginPath();
  g.moveTo(0, K.FLOOR_Y); g.lineTo(K.W, K.FLOOR_Y);
  g.moveTo(0, K.CEIL_Y); g.lineTo(K.W, K.CEIL_Y);
  g.stroke();

  // Platforms (walkable collision boxes)
  g.strokeStyle = 'rgba(255,214,120,0.8)';
  for (const [x, y, w] of game.level.platforms) {
    g.strokeRect(x, y, w, K.PLATFORM_H);
  }

  // Ladders
  g.strokeStyle = 'rgba(120,200,255,0.85)';
  for (const [lx, top, bot] of game.ladders) {
    g.strokeRect(lx - 16, top, 32, bot - top);
  }

  // Sponges
  g.strokeStyle = 'rgba(255,255,90,0.9)';
  for (const s of game.sponges) {
    g.strokeRect(s.x - 20, s.y - 18, 40, 18);
  }

  // Tokens + pickup reach circle
  for (const tok of game.tokens) {
    if (tok.collected) continue;
    const pos = game.tokenPos(tok);
    g.strokeStyle = 'rgba(200,160,255,0.5)';
    g.beginPath(); g.arc(pos.x, pos.y, K.TOKEN_R + 22, 0, Math.PI * 2); g.stroke();
  }

  // Door hitbox
  const d = game.door;
  g.strokeStyle = 'rgba(134,227,154,0.9)';
  g.strokeRect(d.x, d.y, d.w, d.h);

  // Player physics hitbox
  g.strokeStyle = '#ff6b6b';
  g.lineWidth = 1.6;
  g.strokeRect(p.x, p.y, K.PLAYER_W, K.PLAYER_H);

  // Telemetry box (bottom-left above floor)
  const lines = [
    `DEV · ${game.level.id} (#${game.levelIndex + 1}/${LEVELS.length})`,
    `pos=(${p.x.toFixed(0)}, ${p.y.toFixed(0)}) v=(${p.vx.toFixed(0)}, ${p.vy.toFixed(0)})`,
    `ground=${p.onGround ? 1 : 0} climb=${p.climbing ? 1 : 0} gdir=${p.gdir} airDash=${p.airDash ? 1 : 0} dashCd=${p.dashCd.toFixed(2)}`,
    `timer=${game.dev.freezeTimer ? 'FROZEN' : game.timeLeft.toFixed(1) + 's'} erasers=${game.erasers} key=${game.hasKey ? 1 : 0}`,
  ];
  g.fillStyle = 'rgba(10,16,14,0.82)';
  g.fillRect(18, 92, 336, 62);
  g.strokeStyle = 'rgba(255,214,120,0.5)';
  g.lineWidth = 1;
  g.strokeRect(18, 92, 336, 62);
  g.font = '11px ui-monospace, Consolas, monospace';
  g.fillStyle = '#d8f3dc';
  lines.forEach((line, i) => g.fillText(line, 24, 106 + i * 14));
  g.restore();
}

/** Mount the collapsible HTML Developer Sandbox toolbar above the canvas. */
export function mountDevSandbox(game) {
  if (typeof document === 'undefined') return;
  globalThis.QED_DEV_UNLOCK_ALL = game.dev.unlockAll;

  const style = document.createElement('style');
  style.textContent = `
    body.qed-dev-open {
      flex-direction: column;
      justify-content: flex-start;
    }
    body.qed-dev-open #game {
      width: min(100vw, calc((100vh - 42px) * 16 / 9));
      height: min(calc(100vh - 42px), calc(100vw * 9 / 16));
      margin: auto;
    }
    #qed-dev-bar {
      position: relative; z-index: 9999; width: 100%; box-sizing: border-box;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px;
      padding: 5px 10px;
      background: rgba(18, 28, 24, 0.96); border-bottom: 1px solid #c9a24c;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      color: #f4efe6; font: 12px/1.2 system-ui, -apple-system, sans-serif;
    }
    #qed-dev-bar.collapsed {
      position: fixed; top: 8px; left: 10px; width: auto;
      padding: 4px 8px; border: 1px solid #c9a24c; border-radius: 8px;
    }
    #qed-dev-bar.collapsed .dev-body { display: none; }
    #qed-dev-bar .dev-body { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    #qed-dev-bar .dev-badge {
      background: #c9a24c; color: #1a140b; font-weight: 700; padding: 3px 7px;
      border-radius: 5px; border: none; cursor: pointer; font-size: 11px; letter-spacing: 0.4px;
    }
    #qed-dev-bar select, #qed-dev-bar button.dev-btn {
      background: #24362f; color: #f4efe6; border: 1px solid #567063; border-radius: 5px;
      padding: 3px 7px; font: inherit; cursor: pointer;
    }
    #qed-dev-bar button.dev-btn:hover { background: #314940; border-color: #c9a24c; }
    #qed-dev-bar button.dev-btn.active { background: #3d6347; border-color: #86e39a; color: #fff; }
    #qed-dev-bar select { max-width: 195px; }
    #qed-dev-bar .dev-sep { width: 1px; height: 18px; background: rgba(244,239,230,0.2); }
  `;
  document.head.appendChild(style);
  document.body.classList.add('qed-dev-open');

  const bar = document.createElement('div');
  bar.id = 'qed-dev-bar';

  const refocus = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    game.canvas.focus();
  };

  const toggleCollapse = () => {
    const collapsed = bar.classList.toggle('collapsed');
    document.body.classList.toggle('qed-dev-open', !collapsed);
    game.onResize();
    refocus();
  };

  // Toggle collapse button
  const badge = document.createElement('button');
  badge.className = 'dev-badge';
  badge.title = 'Toggle Developer Sandbox bar (`)';
  badge.textContent = 'DEV SANDBOX';
  badge.onclick = toggleCollapse;
  bar.appendChild(badge);

  const body = document.createElement('div');
  body.className = 'dev-body';
  bar.appendChild(body);

  const addSep = () => { const s = document.createElement('span'); s.className = 'dev-sep'; body.appendChild(s); };
  const addBtn = (label, title, onClick) => {
    const b = document.createElement('button');
    b.className = 'dev-btn'; b.textContent = label; b.title = title;
    b.onclick = () => { onClick(b); refocus(); };
    body.appendChild(b);
    return b;
  };
  const addToggle = (label, initial, title, onChange) => {
    const b = document.createElement('button');
    b.className = 'dev-btn' + (initial ? ' active' : '');
    b.textContent = label; b.title = title;
    let val = initial;
    b.onclick = () => { val = !val; b.classList.toggle('active', val); onChange(val); refocus(); };
    body.appendChild(b);
    return b;
  };

  // School selector (jump directly into any school's hallway)
  const schoolSelect = document.createElement('select');
  schoolSelect.title = 'Jump directly into any school hallway';
  for (const s of SCHOOLS) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    schoolSelect.appendChild(opt);
  }
  schoolSelect.onchange = () => { game.goHallway(schoolSelect.value); refocus(); };
  body.appendChild(schoolSelect);

  // Level selector grouped by school
  const select = document.createElement('select');
  select.title = 'Jump directly to any of the 48 levels';
  for (const s of SCHOOLS) {
    const grp = document.createElement('optgroup');
    grp.label = `${s.name} (${s.unlock} ★)`;
    for (const id of s.levels) {
      const idx = levelIndexById(id);
      const lvl = LEVELS[idx];
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `#${idx + 1} · ${lvl.name} (= ${lvl.targetText})`;
      grp.appendChild(opt);
    }
    select.appendChild(grp);
  }
  const jumpTo = (idx, showRules = false) => {
    const clamped = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    game.schoolId = schoolOfLevel(LEVELS[clamped].id)?.id ?? game.schoolId;
    if (showRules) game.goRules(clamped);
    else game.startLevel(clamped);
    select.value = String(clamped);
  };
  select.onchange = () => { jumpTo(Number(select.value), false); refocus(); };

  addBtn('◀', 'Previous level ([)', () => jumpTo(game.levelIndex - 1));
  body.appendChild(select);
  addBtn('▶', 'Next level (])', () => jumpTo(game.levelIndex + 1));

  addSep();
  addBtn('Map', 'Go to Campus Map', () => game.goMap());
  addBtn('Hall', 'Go to current School Hallway', () => game.goHallway(game.schoolId));
  addBtn('Rules', 'Preview Rules board for selected level', () => jumpTo(game.levelIndex, true));

  addSep();
  const charBtn = addBtn(CHARACTERS[game.charIndex].label.replace('Prof. ', ''), 'Switch professor', (b) => {
    game.charIndex = (game.charIndex + 1) % CHARACTERS.length;
    game.progress.character = game.character;
    saveProgress(game.progress);
    b.textContent = CHARACTERS[game.charIndex].label.replace('Prof. ', '');
  });

  addSep();
  addToggle('Unlock All', game.dev.unlockAll, 'Unlock all 6 schools without needing stars', (v) => {
    game.dev.unlockAll = v;
    globalThis.QED_DEV_UNLOCK_ALL = v;
  });
  addToggle('Freeze Timer', game.dev.freezeTimer, 'Pause the level countdown timer', (v) => {
    game.dev.freezeTimer = v;
  });
  addToggle('Hitboxes', game.dev.hitboxes, 'Show collision boxes & player physics telemetry', (v) => {
    game.dev.hitboxes = v;
  });

  addSep();
  addBtn('+30s', 'Add 30 seconds to level timer', () => { game.timeLeft += 30; game.say('DEV: +30 s', K.COLORS.gold); });
  addBtn('+Eraser', 'Grant +1 eraser charge', () => { game.erasers += 1; game.say('DEV: +1 eraser', K.COLORS.gold); });
  addBtn('Key', 'Grant the golden key immediately (test door/results)', () => {
    game.hasKey = true; game.dead = false;
    game.say('DEV: Golden key granted!', K.COLORS.gold);
  });
  addBtn('Flip', 'Trigger gravity flip', () => {
    if (game.state === 'play') game.flipGravity();
  });
  addBtn('Reset Save', 'Clear isolated developer progress (qed.progress.dev.v1)', () => {
    try { localStorage.removeItem('qed.progress.dev.v1'); } catch {}
    game.progress = loadProgress();
    game.say('DEV: Sandbox progress cleared.', K.COLORS.gold);
  });

  document.body.prepend(bar);
  game.onResize();

  // Sync dropdowns & character label as the player navigates inside the game
  setInterval(() => {
    if (document.activeElement !== schoolSelect && schoolSelect.value !== game.schoolId) {
      schoolSelect.value = game.schoolId;
    }
    if (document.activeElement !== select && select.value !== String(game.levelIndex)) {
      select.value = String(game.levelIndex);
    }
    const shortName = CHARACTERS[game.charIndex].label.replace('Prof. ', '');
    if (charBtn.textContent !== shortName) charBtn.textContent = shortName;
  }, 250);

  // Dev hotkeys: ` toggles bar, [ / ] jumps prev/next level
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    if (e.code === 'Backquote') { e.preventDefault(); toggleCollapse(); }
    else if (e.code === 'BracketLeft') { e.preventDefault(); jumpTo(game.levelIndex - 1); }
    else if (e.code === 'BracketRight') { e.preventDefault(); jumpTo(game.levelIndex + 1); }
  });

  // Start right on the Campus Map in dev mode (skipping character select friction)
  if (!game.progress.character) {
    game.progress.character = game.character;
    saveProgress(game.progress);
  }
  game.goMap();
}
