// Q.E.D. — game state, physics, input and the main loop.
import * as K from './constants.js';
import { LEVELS } from './levels.js';
import { S, canComplete, isComplete, isNegative } from './mathEngine.js';
import {
  makeBackground, drawPlatform, drawFloor, drawToken, drawCharacter, drawBookStack, drawDoor, chalkFont, mathFont, rng,
  drawLadder, drawSponge, drawPickup, drawDustPuff, drawKey, drawSparkle, drawEraserIcon,
} from './draw.js';
import { loadAssets, images } from './assets.js';
import { SCHOOLS, schoolOfLevel } from './schools.js';
import { loadProgress, saveProgress, recordAttempt, levelStats, isUnlocked, starsMissing, unlockedSchools, nextLevelId } from './progress.js';
import { button as drawButton, inRect, makeMapBackground, makeMapPatches, makeHallwayBackground, makeStudyBackground, makeClassroomBackground } from './ui.js';
import {
  CHARACTERS, renderCharSelect, renderMap, renderHallway, renderRules, renderResults, renderTimeUp, hallwayItems,
} from './screens.js';

const { W, H, FLOOR_Y, CEIL_Y, TOKEN_R, PLAYER_W, PLAYER_H, PLATFORM_H, COLORS: C } = K;
const MISTAKE_LINES = ['The classroom is fading!', "That won't work...", 'Flaw in the proof!', 'Hmm, not that way.'];
const SPONGE_W = 40;
const SPONGE_H = 18; // collision height above the surface it rests on
const slotCount = (lvl) => lvl.template.filter((p) => p === S).length;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = this.renderScale();
    canvas.width = Math.round(W * this.dpr);
    canvas.height = Math.round(H * this.dpr);
    this.keys = new Set();
    this.t = 0;
    this.state = 'charselect';
    this.particles = [];
    this.effects = [];
    this.msg = null;
    this.msgCd = 0;
    this.shake = 0;
    this.doorFlash = 0;
    this.ui = [];          // clickable areas registered by the current frame
    this.mouse = null;
    this.progress = loadProgress();
    this.charIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === this.progress.character));
    this.schoolId = SCHOOLS[0].id;
    this.mapSel = 0;
    this.hallSel = 0;
    this.hallPage = 0;
    this.rulesLevel = 0;
    this.doorAnim = null;
    this.results = null;
    this.buildBackgrounds();
    this.errors = this.validateLevels();
    this.loadLevel(0);
    this.bindInput();
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.onResize(), 150);
    });
  }

  /** Pixels per logical unit: the canvas is rendered at the size it is actually shown on screen. */
  renderScale() {
    const shown = this.canvas.getBoundingClientRect().width || W;
    return Math.max(1, Math.min(3, (shown * (window.devicePixelRatio || 1)) / W)); // up to 2880×1620
  }

  buildBackgrounds() {
    this.backgrounds = {
      study: makeStudyBackground(this.dpr, (g, x, y, h) => {
        const img = images['prop.bookcase'];
        if (img) g.drawImage(img, x, y, (h * img.width) / img.height, h);
      }),
      map: makeMapBackground(this.dpr, SCHOOLS),
      hallway: makeHallwayBackground(this.dpr),
      classroom: makeClassroomBackground(this.dpr),
    };
    this.mapPatches = makeMapPatches(this.dpr, this.backgrounds.map, SCHOOLS);
  }

  /** Window resized / fullscreen / zoom changed: re-render everything at the new sharpness. */
  onResize() {
    const scale = this.renderScale();
    if (Math.abs(scale - this.dpr) < 0.05) return;
    this.dpr = scale;
    this.canvas.width = Math.round(W * scale);
    this.canvas.height = Math.round(H * scale);
    this.buildBackgrounds();
    this.background = makeBackground(this.levelIndex, this.dpr, this.level);
  }

  // ------------------------------------------------------------------ UI helpers (used by screens.js)
  /** Register a clickable area; returns true while hovered. */
  hit(rect, onClick, onDouble = null) {
    this.ui.push({ rect, onClick, onDouble });
    return inRect(this.mouse, rect);
  }

  button(rect, label, onClick, opts = {}) {
    const hover = !opts.disabled && inRect(this.mouse, rect);
    drawButton(this.ctx, rect, label, { ...opts, hover, t: this.t });
    if (!opts.disabled) this.ui.push({ rect, onClick });
    return hover;
  }

  // ------------------------------------------------------------------ navigation
  goCharSelect() { this.state = 'charselect'; }

  confirmCharacter() {
    this.progress.character = this.character;
    saveProgress(this.progress);
    this.goMap();
  }

  goMap() {
    this.state = 'map';
    this.mapSel = Math.max(0, SCHOOLS.findIndex((s) => s.id === this.schoolId));
    if (this.focusSchool) { // a school was just unlocked: point at it
      const s = SCHOOLS.find((sc) => sc.id === this.focusSchool);
      this.mapSel = SCHOOLS.indexOf(s);
      this.toast = { text: `${s.name} is now open!`, t0: this.t };
      this.focusSchool = null;
    }
  }

  goHallway(schoolId) {
    const target = SCHOOLS.find((s) => s.id === schoolId);
    if (!isUnlocked(this.progress, target)) {
      const miss = starsMissing(this.progress, target);
      this.toast = { text: `${target.name} needs ${target.unlock} ★ – complete ${miss} more room${miss === 1 ? '' : 's'} to open it.`, t0: this.t, lock: true };
      return;
    }
    if (schoolId !== this.schoolId) {
      this.hallPage = 0;
      const next = nextLevelId(this.progress, target);
      this.hallSel = next ? target.levels.indexOf(next) : 0;
    }
    this.schoolId = schoolId;
    const school = SCHOOLS.find((s) => s.id === schoolId);
    const items = hallwayItems(school);
    const focusId = this.results && school.levels.includes(this.results.levelId) ? this.results.levelId : null;
    if (focusId) { this.hallSel = items.findIndex((it) => it.id === focusId); this.hallPage = Math.floor(this.hallSel / 8); }
    if (this.doorAnim && this.doorAnim.t0 === Infinity) this.doorAnim.t0 = this.t + 0.35; // colour the new door in
    this.state = 'hallway';
  }

  goRules(levelIndex) {
    if (levelIndex === null || levelIndex < 0) return;
    this.rulesLevel = levelIndex;
    this.schoolId = schoolOfLevel(LEVELS[levelIndex].id)?.id ?? this.schoolId;
    this.loadLevel(levelIndex);   // background behind the results/rules, timer not running
    this.state = 'rules';
  }

  startLevel(levelIndex) {
    this.loadLevel(levelIndex);
    this.state = 'play';
  }

  validateLevels() {
    const bad = LEVELS.filter((l) => !canComplete(l, [], l.tokens.map((t) => t[0]))).map((l) => l.name);
    if (bad.length) console.error('Unsolvable levels:', bad);
    return bad;
  }

  // ------------------------------------------------------------------ level
  loadLevel(i) {
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.slots = slotCount(this.level);
    this.tokens = this.level.tokens.map(([text, x, y]) => ({
      text, home: { x, y }, phase: Math.random() * Math.PI * 2, collected: false, armed: true,
    }));
    this.ladders = this.level.ladders ?? [];
    this.sponges = (this.level.sponges ?? []).map(([x, y]) => ({ x, y, squash: 0 }));
    this.pickups = (this.level.pickups ?? []).map(([kind, x, y]) => ({ kind, x, y, taken: false }));
    this.door = { x: this.level.doorX, y: FLOOR_Y - 98, w: 57, h: 98 };
    this.timeLeft = this.level.time;
    this.erasers = K.ERASERS;
    this.mistakes = 0;
    this.background = makeBackground(i, this.dpr, this.level);
    this.decor = this.makeDecor(i);
    this.effects = [];
    this.resetBoard();
  }

  /** Book stacks on wider platforms, placed at the end away from tokens and sponges. */
  makeDecor(seed) {
    const r = rng(seed * 31 + 7);
    const out = [];
    for (const [x, y, w] of this.level.platforms) {
      if (w < 110 || r() < 0.3) continue;
      const busy = (bx) => this.level.tokens.some(([, tx, ty]) => Math.abs(tx - bx) < 40 && ty < y && ty > y - 60)
        || (this.level.sponges ?? []).some(([sx, sy]) => sy === y && Math.abs(sx - bx) < 50)
        || (this.level.ladders ?? []).some(([lx, ly]) => ly === y && Math.abs(lx - bx) < 40)
        || (this.level.pickups ?? []).some(([, px, py]) => Math.abs(py - (y - 20)) < 8 && Math.abs(px - bx) < 45);
      const ends = [x + 26, x + w - 26].filter((bx) => !busy(bx));
      if (ends.length) out.push({ x: ends[Math.floor(r() * ends.length)], y, seed: Math.floor(r() * 1e6) });
    }
    return out;
  }

  get character() { return CHARACTERS[this.charIndex].id; }

  resetBoard() {
    this.player = {
      x: this.level.spawn, y: FLOOR_Y - PLAYER_H, vx: 0, vy: 0, facing: 1, onGround: true,
      coyote: 0, jbuf: 0, drop: 0, walkT: 0, gdir: 1, flipT: 0, climbing: null,
      squash: 0, stepIdx: 0,
    };
    this.tray = [];
    this.dead = false;
    this.hasKey = false;
    this.exitT = undefined;
    this.correctPicks = 0;
    this.nearToken = null;
    for (const tok of this.tokens) { tok.collected = false; tok.armed = true; }
  }

  // ------------------------------------------------------------------ helpers
  say(text, color = C.chalk, dur = 1.8) { this.msg = { text, color, left: dur }; }

  dust(x, y, n = 14, color = C.chalk) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 110;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 45, life: 0.4 + Math.random() * 0.5, color });
    }
  }

  puff(x, y, size = 1) { this.effects.push({ kind: 'puff', x, y, t: 0, dur: 0.55, size }); }

  sparkles(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 90;
      this.effects.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, dur: 0.5 + Math.random() * 0.5 });
    }
  }

  tokenPos(tok) { return { x: tok.home.x, y: tok.home.y + Math.sin(this.t * 2.2 + tok.phase) * 4 }; }

  playerCenter() { return { x: this.player.x + PLAYER_W / 2, y: this.player.y + PLAYER_H / 2 }; }

  /** Where the character holds the key (in front, chest height). */
  handPos() {
    const p = this.player;
    return { x: p.x + PLAYER_W / 2 + p.facing * 15, y: p.y + PLAYER_H - K.SPRITE_H * 0.55 };
  }

  trayValue() {
    return this.tray.length ? this.level.evaluate(this.tray.map((t) => t.text)) : null;
  }

  expressionText() {
    let k = 0;
    return this.level.template.map((p) => (p === S ? (this.tray[k++]?.text ?? '□') : p)).join(' ');
  }

  ladderAt(feetY, slack = 2) {
    const cx = this.player.x + PLAYER_W / 2;
    return this.ladders.find(([x, top, bottom]) => Math.abs(cx - x) < 16 && feetY >= top - slack && feetY <= bottom + slack);
  }

  // ------------------------------------------------------------------ actions
  collect(tok) {
    tok.collected = true;
    this.tray.push(tok);
    const pos = this.tokenPos(tok);
    this.dust(pos.x, pos.y, 18, C.gold);
    if (isNegative(tok.text)) this.flipGravity();
    const pool = this.tokens.filter((t) => !t.collected).map((t) => t.text);
    const texts = this.tray.map((t) => t.text);
    if (canComplete(this.level, texts, pool)) {
      this.correctPicks += 1;
      this.sparkles(pos.x, pos.y, 8);
      const done = isComplete(this.level, texts);
      if (done && !this.hasKey) {
        const h = this.handPos();
        this.sparkles(h.x, h.y, 16);
        this.say('Q.E.D.! You got the key – head for the door.', C.gold, 2.8);
      }
      this.hasKey = done;
    } else {
      this.hasKey = false;
      this.dead = true;
      this.mistakes += 1;
      this.timeLeft -= K.PENALTY_S;
      this.shake = 0.35;
      const line = MISTAKE_LINES[Math.floor(Math.random() * MISTAKE_LINES.length)];
      this.say(`${line}  −${K.PENALTY_S} s   (E: eraser, R: reset)`, C.red, 2.6);
    }
  }

  flipGravity() {
    const p = this.player;
    p.climbing = null;
    p.gdir = -1;
    p.flipT = K.FLIP_TIME;
    p.onGround = false;
    p.coyote = 0;
    this.say('Negative number – gravity flipped!', C.violet, 2);
  }

  tryPick() {
    const tok = this.nearToken;
    if (!tok) return;
    if (this.dead) this.say('Fix the mistake first: E eraser, R reset', C.red);
    else if (this.tray.length >= this.slots) this.say('The tray is full – go to the door or erase (E).', C.gold);
    else { this.collect(tok); this.nearToken = null; }
  }

  useEraser() {
    if (!this.tray.length) return this.say('Nothing to erase.');
    if (this.erasers <= 0) return this.say('No eraser – find one in the classroom, or R to reset.', C.red);
    const tok = this.tray.pop();
    tok.collected = false;
    tok.armed = false;
    this.erasers -= 1;
    this.dead = false;
    this.hasKey = isComplete(this.level, this.tray.map((t) => t.text));
    const pos = this.tokenPos(tok);
    this.puff(pos.x, pos.y + 14, 0.7);
    this.say('Erased.');
  }

  // ------------------------------------------------------------------ input
  bindInput() {
    const gameKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace']);
    window.addEventListener('keydown', (e) => {
      // both Enter keys (main + numpad) count as Enter
      const code = e.key === 'Enter' ? 'Enter' : e.code;
      if (gameKeys.has(code) || code === 'Enter') e.preventDefault();
      if (!e.repeat) this.onKey(code);
      this.keys.add(code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key === 'Enter' ? 'Enter' : e.code));
    window.addEventListener('blur', () => this.keys.clear());
    // mouse / touch: canvas pixels → 960×540 logical coordinates
    const toLogical = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    };
    this.canvas.addEventListener('pointermove', (e) => { this.mouse = toLogical(e); });
    this.canvas.addEventListener('pointerleave', () => { this.mouse = null; });
    this.canvas.addEventListener('pointerdown', (e) => {
      this.mouse = toLogical(e);
      const target = [...this.ui].reverse().find((u) => inRect(this.mouse, u.rect));
      if (!target) return;
      if (e.detail >= 2 && target.onDouble) target.onDouble(); else target.onClick?.();
    });
  }

  held(...codes) { return codes.some((c) => this.keys.has(c)); }

  startClimb(ladder) {
    const p = this.player;
    p.climbing = ladder;
    p.x = ladder[0] - PLAYER_W / 2;
    p.vx = 0; p.vy = 0; p.onGround = false;
  }

  onKey(code) {
    const p = this.player;
    const left = code === 'ArrowLeft' || code === 'KeyA', right = code === 'ArrowRight' || code === 'KeyD';
    if (this.state === 'charselect') {
      if (left || right) this.charIndex = (this.charIndex + (right ? 1 : CHARACTERS.length - 1)) % CHARACTERS.length;
      else if (code === 'Enter') this.confirmCharacter();
    } else if (this.state === 'map') {
      if (left || right) this.mapSel = (this.mapSel + (right ? 1 : SCHOOLS.length - 1)) % SCHOOLS.length;
      else if (code === 'Enter') this.goHallway(SCHOOLS[this.mapSel].id);
      else if (code === 'Escape') this.goCharSelect();
    } else if (this.state === 'hallway') {
      const school = SCHOOLS.find((s) => s.id === this.schoolId);
      const n = school.levels.length;
      if (n && (left || right)) {
        this.hallSel = Math.max(0, Math.min(n - 1, this.hallSel + (right ? 1 : -1)));
        this.hallPage = Math.floor(this.hallSel / 8);
      } else if (code === 'Enter' && n) this.goRules(LEVELS.findIndex((l) => l.id === school.levels[this.hallSel]));
      else if (code === 'Escape') this.goMap();
    } else if (this.state === 'rules') {
      if (code === 'Enter') this.startLevel(this.rulesLevel);
      else if (code === 'Escape') this.goHallway(this.schoolId);
    } else if (this.state === 'results') {
      if (code === 'Enter' && this.results.nextIndex !== null) this.goRules(this.results.nextIndex);
      else if (code === 'KeyR') this.startLevel(this.results.levelIndex);
      else if (code === 'Escape') this.goHallway(this.schoolId);
    } else if (this.state === 'over') {
      if (code === 'Enter') this.startLevel(this.levelIndex);
      else if (code === 'Escape') this.goHallway(this.schoolId);
    } else if (this.state === 'play') {
      const feet = p.y + PLAYER_H;
      if (code === 'Space') {
        p.jbuf = K.JUMP_BUFFER;
      } else if (code === 'ArrowUp' || code === 'KeyW') {
        const ladder = p.gdir > 0 && !p.climbing && this.ladderAt(feet);
        if (ladder && feet > ladder[1] + 2) this.startClimb(ladder);
        else if (!p.climbing) p.jbuf = K.JUMP_BUFFER;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        const ladder = p.gdir > 0 && !p.climbing && p.onGround && this.ladderAt(feet, 4);
        if (ladder && feet < ladder[2] - 4) this.startClimb(ladder);
        else if (p.onGround) p.drop = 0.22;
      } else if (code === 'KeyF') this.tryPick();
      else if (code === 'KeyE' || code === 'Backspace') this.useEraser();
      else if (code === 'KeyR') { this.resetBoard(); this.say('Reset – but the clock keeps ticking!', C.gold); }
      else if (code === 'Escape') this.goHallway(this.schoolId);
    }
  }

  /** Level finished (after the door animation): score it, save progress, show the results screen. */
  finishLevel() {
    const lvl = this.level;
    const timeLeft = Math.max(0, this.timeLeft);
    const score = Math.max(50, 100 + Math.floor(timeLeft) * 10 + this.erasers * 50 - this.mistakes * 25);
    const starsN = this.mistakes === 0 && timeLeft >= lvl.time * 0.4 ? 3 : this.mistakes <= 1 ? 2 : 1;
    const expression = this.expressionText().replace(/\s*□/g, '');
    const openBefore = unlockedSchools(this.progress);
    const { firstClear, newBest } = recordAttempt(this.progress, lvl.id, {
      won: true, score, stars: starsN, timeLeft, correct: this.correctPicks, mistakes: this.mistakes, expression,
    });
    const school = schoolOfLevel(lvl.id);
    const pos = school ? school.levels.indexOf(lvl.id) : -1;
    const nextId = school && pos >= 0 ? school.levels[pos + 1] : undefined;
    this.results = {
      levelId: lvl.id, levelIndex: this.levelIndex, expression, value: String(this.trayValue() ?? lvl.targetText),
      correct: this.correctPicks, mistakes: this.mistakes, timeLeft, score, stars: starsN, newBest,
      bestScore: levelStats(this.progress, lvl.id).bestScore,
      nextIndex: nextId ? LEVELS.findIndex((l) => l.id === nextId) : null, t0: this.t,
      unlocked: unlockedSchools(this.progress).filter((id) => !openBefore.includes(id)),
    };
    if (this.results.unlocked.length) this.focusSchool = this.results.unlocked[0];
    if (firstClear) this.doorAnim = { id: lvl.id, t0: Infinity }; // starts when the hallway is shown
    this.state = 'results';
  }

  timeUp() {
    this.timeLeft = 0;
    recordAttempt(this.progress, this.level.id, { won: false, correct: this.correctPicks, mistakes: this.mistakes });
    this.state = 'over';
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.t += dt;
    for (const q of this.particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.life -= dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const e of this.effects) { e.t += dt; if (e.kind === 'spark') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 60 * dt; } }
    this.effects = this.effects.filter((e) => e.t < e.dur);
    for (const s of this.sponges) s.squash = Math.max(0, s.squash - dt * 4);
    if (this.msg && (this.msg.left -= dt) <= 0) this.msg = null;
    this.shake = Math.max(0, this.shake - dt);
    this.msgCd = Math.max(0, this.msgCd - dt);
    this.doorFlash = Math.max(0, this.doorFlash - dt);
    if (this.state === 'exit') return this.updateExit(dt);
    if (this.state !== 'play') return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeUp(); return; }

    this.updatePlayer(dt);
    this.updateTokens();
    this.updatePickups();
    this.checkDoor();
  }

  updateClimb(dt) {
    const p = this.player, [, top, bottom] = p.climbing;
    const dir = (this.held('ArrowRight', 'KeyD') ? 1 : 0) - (this.held('ArrowLeft', 'KeyA') ? 1 : 0);
    if (p.jbuf > 0 || dir) { // jump or step off the ladder
      p.climbing = null;
      if (dir) p.facing = dir;
      if (p.jbuf > 0) { p.vy = -K.JUMP_V * 0.85; p.jbuf = 0; }
      return;
    }
    const v = (this.held('ArrowDown', 'KeyS') ? 1 : 0) - (this.held('ArrowUp', 'KeyW') ? 1 : 0);
    p.vy = v * K.CLIMB_SPEED;
    if (v) p.walkT += dt * 1.1;
    p.y += p.vy * dt;
    const feet = p.y + PLAYER_H;
    if (feet <= top) { p.y = top - PLAYER_H; p.climbing = null; this.land(p.y); p.coyote = K.COYOTE_TIME; }
    else if (feet >= bottom) { p.y = bottom - PLAYER_H; p.climbing = null; this.land(p.y); p.coyote = K.COYOTE_TIME; }
  }

  updatePlayer(dt) {
    const p = this.player;
    p.squash *= Math.exp(-14 * dt);
    if (Math.abs(p.squash) < 0.002) p.squash = 0;
    if (p.flipT > 0 && (p.flipT -= dt) <= 0) { p.gdir = 1; p.onGround = false; p.coyote = 0; }
    p.coyote -= dt; p.jbuf -= dt; p.drop -= dt;
    if (p.climbing) { this.updateClimb(dt); if (p.climbing || p.onGround) return; }

    const g = p.gdir;
    const dir = (this.held('ArrowRight', 'KeyD') ? 1 : 0) - (this.held('ArrowLeft', 'KeyA') ? 1 : 0);
    p.vx = dir * K.SPEED;
    if (dir) {
      p.facing = dir;
      p.walkT += dt;
      if (p.onGround) {
        const step = Math.floor(p.walkT * 4.75);
        if (step !== p.stepIdx) {
          p.stepIdx = step;
          this.dust(p.x + PLAYER_W / 2 - dir * 5, g > 0 ? p.y + PLAYER_H : p.y, 2, 'rgba(244,239,230,0.65)');
        }
      }
    }
    if (p.jbuf > 0 && p.coyote > 0) {
      p.vy = -K.JUMP_V * g; p.jbuf = 0; p.coyote = 0;
      p.squash = -0.11;
      this.dust(p.x + PLAYER_W / 2, g > 0 ? p.y + PLAYER_H : p.y, 4);
    }

    // holding ↑ next to a ladder grabs it mid-air
    if (g > 0 && this.held('ArrowUp', 'KeyW') && !p.onGround) {
      const ladder = this.ladderAt(p.y + PLAYER_H);
      if (ladder && p.y + PLAYER_H > ladder[1] + 4) { this.startClimb(ladder); return; }
    }

    const holding = this.held('Space', 'ArrowUp', 'KeyW');
    const rising = p.vy * g < 0;
    const grav = K.GRAVITY * (rising && !holding ? 1.8 : 1); // short hop when jump is released
    p.vy += grav * g * dt;
    if (p.vy * g > K.MAX_FALL) p.vy = K.MAX_FALL * g;

    p.x = Math.max(16, Math.min(W - 16 - PLAYER_W, p.x + p.vx * dt));
    const prevFeet = g > 0 ? p.y + PLAYER_H : p.y;
    const impact = Math.abs(p.vy);
    p.y += p.vy * dt;
    const wasGround = p.onGround;
    p.onGround = false;

    if (p.vy * g >= 0) {
      const overlaps = (x, w) => p.x + PLAYER_W > x + 3 && p.x < x + w - 3;
      if (g > 0) {
        const feet = p.y + PLAYER_H;
        const sponge = this.sponges.find((s) => overlaps(s.x - SPONGE_W / 2, SPONGE_W)
          && prevFeet <= s.y - SPONGE_H + 1 && s.y - SPONGE_H <= feet);
        if (sponge) {
          p.y = sponge.y - SPONGE_H - PLAYER_H;
          p.vy = -K.BOUNCE_V;
          p.squash = -0.15;
          sponge.squash = 1;
          this.dust(sponge.x, sponge.y - SPONGE_H, 10, '#f3d36b');
          return;
        }
        if (feet >= FLOOR_Y) this.land(FLOOR_Y - PLAYER_H);
        else if (p.drop <= 0) {
          const hit = this.level.platforms.find(([x, y, w]) => overlaps(x, w) && prevFeet <= y + 1 && y <= feet);
          if (hit) this.land(hit[1] - PLAYER_H);
        }
      } else {
        if (p.y <= CEIL_Y) this.land(CEIL_Y);
        else if (p.drop <= 0) {
          const hit = this.level.platforms.find(([x, y, w]) => {
            const under = y + PLATFORM_H + 2;
            return overlaps(x, w) && prevFeet >= under - 1 && under >= p.y;
          });
          if (hit) this.land(hit[1] + PLATFORM_H + 2);
        }
      }
    }
    if (p.onGround) {
      p.coyote = K.COYOTE_TIME;
      if (!wasGround) {
        p.squash = Math.min(0.16, 0.05 + impact / 4500);
        const fx = p.x + PLAYER_W / 2, fy = g > 0 ? p.y + PLAYER_H : p.y;
        if (impact > K.HARD_LANDING_V && g > 0) { this.puff(fx, fy + 4, Math.min(1.4, impact / 700)); this.shake = Math.max(this.shake, 0.08); }
        else this.dust(fx, fy, 6);
      }
    }
  }

  land(y) {
    const p = this.player;
    p.y = y; p.vy = 0; p.onGround = true;
  }

  updateTokens() {
    const c = this.playerCenter();
    this.nearToken = null;
    let best = TOKEN_R + 22;
    for (const tok of this.tokens) {
      if (tok.collected) continue;
      const pos = this.tokenPos(tok);
      const d = Math.hypot(pos.x - c.x, pos.y - c.y);
      if (!tok.armed) { tok.armed = d > TOKEN_R + 55; continue; }
      if (d < best) { best = d; this.nearToken = tok; }
    }
    if (K.PICKUP_ON_TOUCH && this.nearToken && !this.dead && this.tray.length < this.slots) this.tryPick();
  }

  updatePickups() {
    const c = this.playerCenter();
    for (const pk of this.pickups) {
      if (pk.taken || Math.hypot(pk.x - c.x, pk.y - c.y) > 34) continue;
      pk.taken = true;
      this.sparkles(pk.x, pk.y, 10);
      if (pk.kind === 'chalk') { this.timeLeft += K.CHALK_BONUS_S; this.say(`Fresh chalk! +${K.CHALK_BONUS_S} s`, C.gold); }
      else { this.erasers += 1; this.say('Spare eraser! +1', C.gold); }
    }
  }

  checkDoor() {
    const p = this.player, d = this.door;
    const touching = p.x < d.x + d.w && p.x + PLAYER_W > d.x && p.y < d.y + d.h && p.y + PLAYER_H > d.y;
    if (!touching) return;
    if (this.hasKey && !this.dead) {
      this.state = 'exit';
      this.exitT = 0;
      this.keyFrom = this.handPos();
      this.player.vx = 0;
    } else if (this.msgCd <= 0) {
      if (this.trayValue()) { this.doorFlash = 1.5; this.say('That is not correct!', C.red); }
      else this.say('The door is locked – finish the equation to get the key.', C.red);
      this.msgCd = 1.5;
    }
  }

  /** Key flies to the lock → door swings open → professor walks into the light. */
  updateExit(dt) {
    const d = this.door, p = this.player;
    const before = this.exitT;
    this.exitT += dt;
    const lock = { x: d.x + d.w * 0.25, y: d.y + d.h * 0.58 };
    if (this.exitT < 0.55) {
      const k = this.exitT / 0.55;
      const x = this.keyFrom.x + (lock.x - this.keyFrom.x) * k;
      const y = this.keyFrom.y + (lock.y - this.keyFrom.y) * k - Math.sin(k * Math.PI) * 30;
      this.effects.push({ kind: 'spark', x, y, vx: 0, vy: 10, t: 0, dur: 0.4 });
    }
    if (before < 0.55 && this.exitT >= 0.55) { this.sparkles(lock.x, lock.y, 24); this.shake = 0.12; }
    if (this.exitT > 0.9) { // walk into the doorway
      const target = d.x + d.w / 2 - PLAYER_W / 2;
      p.facing = Math.sign(target - p.x) || p.facing;
      p.x += Math.sign(target - p.x) * Math.min(Math.abs(target - p.x), 90 * dt);
      p.walkT += dt;
    }
    if (this.exitT >= K.EXIT_TIME) this.finishLevel();
  }

  // ------------------------------------------------------------------ render
  tokenAlpha(tok) {
    // the more mistakes, the less of the classroom the professor remembers
    const base = Math.max(0.07, 1 - this.mistakes * 0.33);
    const pos = this.tokenPos(tok), c = this.playerCenter();
    const near = Math.max(0, Math.min(1, 1 - (Math.hypot(pos.x - c.x, pos.y - c.y) - 68) / 105));
    return Math.max(base, near);
  }

  render() {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    this.ui = [];
    const menus = { charselect: renderCharSelect, map: renderMap, hallway: renderHallway, rules: renderRules, results: renderResults };
    if (menus[this.state]) {
      menus[this.state](this, g);
      this.drawEffects(g);
    } else {
      this.renderLevel(g);
      if (this.state === 'over') renderTimeUp(this, g);
    }
    this.canvas.style.cursor = this.ui.some((u) => inRect(this.mouse, u.rect)) ? 'pointer' : 'default';
  }

  drawEffects(g) {
    for (const e of this.effects) {
      const k = e.t / e.dur;
      if (e.kind === 'puff') drawDustPuff(g, e.x, e.y, k, e.size);
      else drawSparkle(g, e.x, e.y, 2 + 4 * Math.sin(k * Math.PI), 1 - k);
    }
  }

  renderLevel(g) {
    g.save();
    if (this.shake > 0) g.translate((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6);
    g.drawImage(this.background, 0, 0, W, H);
    drawFloor(g); // first, so desk legs stand on the ledge
    for (const l of this.ladders) drawLadder(g, l);
    for (const pl of this.level.platforms) drawPlatform(g, pl);
    for (const d of this.decor) drawBookStack(g, d.x, d.y, d.seed);
    for (const s of this.sponges) drawSponge(g, [s.x, s.y], s.squash);
    for (const pk of this.pickups) if (!pk.taken) drawPickup(g, pk.kind, pk.x, pk.y, this.t);

    const exiting = this.state === 'exit';
    const open = exiting && this.exitT >= 0.55;
    const val = this.trayValue();
    let label = `= ${this.level.targetText}?`, labelCol = C.chalk;
    if (this.hasKey) { label = `= ${this.level.targetText} !`; labelCol = C.green; }
    if (this.doorFlash > 0) { label = `= ${val ?? '?'}`; labelCol = Math.floor(this.t * 8) % 2 ? C.red : C.chalk; }
    drawDoor(g, this.door, label, labelCol, this.hasKey && !open, this.t, open);
    if (open) this.renderDoorLight(g);

    for (const tok of this.tokens) {
      if (tok.collected) continue;
      const pos = this.tokenPos(tok);
      drawToken(g, tok.text, pos.x, pos.y, this.tokenAlpha(tok), {
        highlight: tok === this.nearToken && !K.PICKUP_ON_TOUCH && this.state === 'play', negative: isNegative(tok.text), ghost: !tok.armed,
      });
    }

    const p = this.player;
    const fade = exiting ? Math.max(0, Math.min(1, 1 - (this.exitT - 1.15) / 0.5)) : 1;
    drawCharacter(g, this.character, p.x, p.y, {
      facing: p.facing, walkT: p.walkT, walking: p.vx !== 0 || (exiting && this.exitT > 0.9),
      airborne: !p.onGround && !p.climbing && !exiting, gdir: p.gdir, climbing: !!p.climbing,
      alpha: fade, vy: p.vy, squash: p.squash, t: this.t,
    });
    if (this.hasKey && !exiting) {
      const h = this.handPos();
      drawKey(g, h.x, h.y + Math.sin(this.t * 4) * 2, 22, p.facing * 0.5);
      if (Math.random() < 0.15) this.effects.push({ kind: 'spark', x: h.x + (Math.random() - 0.5) * 20, y: h.y + (Math.random() - 0.5) * 20, vx: 0, vy: -15, t: 0, dur: 0.6 });
    }
    if (exiting && this.exitT < 0.55) {
      const d = this.door, k = this.exitT / 0.55;
      const lx = d.x + d.w * 0.25, ly = d.y + d.h * 0.58;
      drawKey(g, this.keyFrom.x + (lx - this.keyFrom.x) * k, this.keyFrom.y + (ly - this.keyFrom.y) * k - Math.sin(k * Math.PI) * 30, 24, k * 6);
    }

    for (const q of this.particles) { g.fillStyle = q.color; g.fillRect(q.x - 1, q.y - 1, q.life > 0.3 ? 3 : 2, q.life > 0.3 ? 3 : 2); }
    this.drawEffects(g);
    g.restore();

    this.renderTray(g, val);
    this.renderHud(g);
  }

  renderDoorLight(g) {
    const d = this.door, k = Math.min(1, (this.exitT - 0.55) / 0.5);
    g.save();
    g.globalAlpha = 0.55 * k;
    const cx = d.x + d.w * 0.45, cy = d.y + d.h * 0.55;
    const grad = g.createRadialGradient(cx, cy, 5, cx, cy, 130);
    grad.addColorStop(0, '#fff1c0'); grad.addColorStop(0.4, 'rgba(255,214,120,0.5)'); grad.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = grad; g.fillRect(cx - 140, cy - 140, 280, 280);
    g.restore();
    if (Math.random() < 0.5) this.effects.push({ kind: 'spark', x: d.x + Math.random() * d.w * 0.8, y: d.y + Math.random() * d.h, vx: 0, vy: -20, t: 0, dur: 0.8 });
  }

  renderTray(g, val) {
    const parts = [];
    let k = 0;
    g.font = mathFont(18);
    for (const p of this.level.template) {
      if (p === S) parts.push({ slot: k++, w: 40 });
      else parts.push({ text: p, w: g.measureText(p).width });
    }
    g.font = chalkFont(20, true);
    const labelW = g.measureText('TRAY:').width;
    const total = labelW + 12 + parts.reduce((s, p) => s + p.w, 0) + 6 * (parts.length - 1) + 95;
    let x = (W - total) / 2;
    const top = FLOOR_Y + 8, h = 56, cy = top + h / 2;
    g.fillStyle = 'rgba(22,32,28,0.92)'; g.strokeStyle = C.chalk; g.lineWidth = 1.8;
    g.beginPath(); g.roundRect(x - 12, top, total + 24, h, 6); g.fill(); g.stroke();
    g.textBaseline = 'middle';
    g.fillStyle = C.chalk; g.fillText('TRAY:', x, cy);
    x += labelW + 12;
    for (const p of parts) {
      if (p.text !== undefined) {
        g.font = mathFont(18); g.fillStyle = C.chalk; g.fillText(p.text, x, cy);
      } else {
        const filled = p.slot < this.tray.length;
        const bad = this.dead && p.slot === this.tray.length - 1;
        const col = bad ? C.red : filled ? C.chalk : C.chalkDim;
        g.strokeStyle = col; g.lineWidth = 1.5;
        g.beginPath(); g.roundRect(x, cy - 19, 40, 38, 5); g.stroke();
        if (filled) {
          const txt = this.tray[p.slot].text;
          g.font = mathFont(txt.length > 1 ? 17 : 22, true); g.fillStyle = col; g.textAlign = 'center';
          g.fillText(txt, x + 20, cy + 1); g.textAlign = 'left';
        }
      }
      x += p.w + 6;
    }
    if (val) {
      g.font = mathFont(22, true);
      g.fillStyle = val.eq(this.level.target) ? C.green : C.red;
      g.fillText(`= ${val}`, x + 4, cy);
    }
    g.textBaseline = 'alphabetic';
  }

  renderHud(g) {
    const lvl = this.level;
    g.fillStyle = C.chalk; g.font = chalkFont(30, true);
    const tgt = `TARGET:  = ${lvl.targetText}`;
    g.fillText(tgt, 26, 46);
    g.strokeStyle = C.chalk; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(26, 57); g.quadraticCurveTo(26 + g.measureText(tgt).width / 2, 60, 26 + g.measureText(tgt).width + 20, 56); g.stroke();
    g.font = chalkFont(13); g.fillStyle = C.chalkDim;
    g.fillText(`${lvl.name}  ·  ${lvl.subtitle}`, 28, 78);

    g.textAlign = 'right';
    const blink = this.timeLeft < 10 && Math.floor(this.t * 4) % 2 === 0;
    g.font = chalkFont(26, true); g.fillStyle = blink ? C.red : C.chalk;
    g.fillText(`TIME: ${Math.ceil(this.timeLeft)}`, W - 26, 40);
    // eraser charges as eraser icons
    const n = this.erasers;
    let ex = W - 26 - Math.max(1, n) * 38;
    g.font = chalkFont(18); g.fillStyle = C.chalk;
    g.fillText('ERASER (E):', ex - 8, 70);
    if (!n) { g.textAlign = 'left'; g.fillStyle = C.chalkDim; g.fillText('none', ex, 70); g.textAlign = 'right'; }
    for (let i = 0; i < n; i++) { drawEraserIcon(g, ex, 64, false); ex += 38; }
    g.font = chalkFont(13); g.fillStyle = C.chalkDim;
    g.fillText(`RESET: R   ·   ESC: leave   ·   Mistakes: ${this.mistakes}`, W - 26, 96);
    const p = this.player;
    if (p.flipT > 0) { g.fillStyle = C.violet; g.fillText(`Gravity flipped: ${p.flipT.toFixed(1)} s`, W - 26, 114); }
    g.textAlign = 'left';
    g.font = `26px "Times New Roman", serif`; g.fillStyle = 'rgba(244,239,230,0.35)'; g.fillText('Q.E.D', 24, FLOOR_Y - 12);

    if (this.msg) {
      g.save();
      g.globalAlpha = Math.min(1, this.msg.left * 2);
      g.font = chalkFont(19); g.fillStyle = this.msg.color; g.textAlign = 'center';
      g.fillText(this.msg.text, W / 2, 132);
      g.restore();
    }
  }

  // ------------------------------------------------------------------ loop
  start() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

await loadAssets();
const game = new Game(document.getElementById('game'));
window.qed = game; // handy for debugging in the browser console
// make sure keys go to the game (not the address bar) right away and after any click
const canvas = document.getElementById('game');
canvas.focus();
window.addEventListener('pointerdown', () => canvas.focus());
game.start();
