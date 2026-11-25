# Q.E.D. — Agent Instructions & Project Architecture

## 1. Game Concept & Core Loop
- **Title:** Q.E.D. (*Quod Erat Demonstrandum*)
- **Genre:** 2D Mathematical Puzzle-Platformer.
- **Setting & Visuals:** Hand-drawn "dark academia" university chalkboard aesthetic (`#1b2622` slate-green chalkboard, `#6e472b` oak desks/shelves with `#24170e` ink outlines, `#f4efe6` chalk highlights, parchment & gold menu UI). Rendered on a `960×540` logical HTML5 `<canvas>` dynamically scaled to display size/DPR (up to `3×`).
- **Art & Sprites:** Uses transparent PNG sprites for characters/props (`assets/characters/`, `assets/props/`) and painted WebP art for menus (`assets/ui/campus_map.webp`), registered in `src/assets.js`. **Every sprite has a procedural canvas fallback** in `src/draw.js` / `src/ui.js`, so the game remains playable even if an asset is missing. Concept art and generation prompts live in `docs/concepts/` and `docs/art-prompts.md`; `tools/sprite-tool.mjs` (zero-dependency Node.js) and `tools/cutout.py` (Python Pillow/NumPy) handle chroma-keying, edge color decontamination (halo removal), and sprite-sheet packing.
- **Playable Characters:** Prof. Theodore (`professor`) and Prof. Margaret (`professorka`), selectable on the opening study screen.
- **Progression Structure:**
  - **6 schools × 8 classrooms = 48 levels** defined in `src/levels.js` and organized in `src/schools.js`:
    1. *School of Mathematics* (0 ★)
    2. *Academy of Algebra* (4 ★)
    3. *Institute of Geometry* (8 ★)
    4. *University of Calculus* (12 ★)
    5. *Academy of Statistics* (16 ★)
    6. *Grand Mathematical University* (20 ★, ends with the Final Exam)
  - Screen flow: Character Select (`charselect`) → Campus Map (`map`) → School Hallway (`hallway`) → Chalkboard Rules (`rules`, timer paused until Start) → Playing (`play`) → Results (`results`) / Time Up (`timeup`).
  - Progress, character choice, and per-level stats/stars are persisted in `localStorage` (`qed.progress.v1` in `src/progress.js`).
- **Gameplay Mechanics & Controls:**
  - **Movement:** `←`/`→` move, `Space`/`↑` variable-height jump (with coyote time and jump buffer), `↑`/`↓` climb ladders, `↓` drop through shelves.
  - **Collecting symbols:** Press `F` next to a floating token to append it to the equation tray (controlled by `PICKUP_ON_TOUCH = false` in `src/constants.js`).
  - **Eraser & Restart:** Press `E` to spend 1 **Chalk Eraser** charge to undo the last collected token and respawn it in the room (players start with `0` charges and collect erasers as room pickups). Press `R` to restart the level (timer keeps running); `Esc` exits to the hallway.
  - **Real-time Solvability Check:** After each token is collected, `canComplete()` in `src/mathEngine.js` checks whether the current prefix can still reach `target` using any ordering of the remaining tokens in the room:
    - In arithmetic rooms (`evalArith`), any valid expression up to the slot count counts (`×`, `÷` before `+`, `−`, with unary `−`).
    - In formula rooms (`EV.*`, powers, derivatives, integrals, probability, etc.), all template slots must be filled.
    - Picking a symbol that makes the target unreachable triggers a **mistake**: `-3 s` time penalty (`PENALTY_S`) and the classroom progressively "fades" so distant tokens become harder to read unless remembered or undone with an eraser.
  - **Room Elements & Twists:**
    - **Violet negative numbers** (e.g. `−2`) flip gravity (`CEIL_Y` becomes floor) for `3 s` (`FLIP_TIME`).
    - **Ladders** connect platforms/floor vertically.
    - **Yellow sponges** launch the professor high (`BOUNCE_V`).
    - **Chalk pickups** grant `+5 s` (`CHALK_BONUS_S`); **Eraser pickups** grant `+1` eraser charge.
  - **Completing a Level:** Once `isComplete()` returns true, a golden key spawns; carrying it to the classroom door triggers the unlock/exit animation and awards 1–3 ★ (`★★★`: 0 mistakes and ≥ 40% time left; `★★`: ≤ 1 mistake; `★`: solved).

## 2. Tech Stack & File Structure
Use vanilla HTML5 Canvas, CSS3, and ES6 Modules (`<script type="module">`) with **zero external runtime dependencies** and no build step, deployed directly via GitHub Pages from `main` (`.nojekyll` is present).

```text
/
├── index.html                  # Minimal HTML shell + 960×540 <canvas id="game">
├── style.css                   # Dark-academia page framing & canvas sizing
├── src/
│   ├── main.js                 # Game class: state machine, 60fps loop, physics, input, HUD, particles
│   ├── constants.js            # Tunable dimensions, physics, rules, palette, fonts
│   ├── mathEngine.js           # Exact Frac arithmetic, evalArith + formula evaluators (EV), isComplete/canComplete
│   ├── levels.js               # All 48 level definitions (layouts, templates, targets, tokens, props)
│   ├── schools.js              # 6 schools, level ID lists, unlock thresholds, map hit regions
│   ├── progress.js             # localStorage persistence, star/unlock calculations
│   ├── assets.js               # ASSET_FILES registry and async image loader with fallback warnings
│   ├── draw.js                 # In-level rendering: chalkboard, furniture, tokens, characters, pickups, FX
│   ├── ui.js                   # Reusable UI primitives (parchment, ribbons, buttons) & menu backgrounds
│   └── screens.js              # Menu screens (charselect, map, hallway, rules, results, timeup)
├── assets/
│   ├── characters/             # professor.png, professorka.png (portraits) + professor_sheet.png, professorka_sheet.png (4×2 anim sheets)
│   ├── props/                  # desk, shelf, bookcase, books, door, door_open, ladder, sponge, key, eraser, chalk, dust
│   └── ui/                     # campus_map.webp
├── tools/
│   ├── verify-levels.html      # Exhaustive math + jump-reachability verifier for all 48 levels
│   ├── sprite-tool.mjs         # Zero-dependency Node.js PNG chroma-key, defringe, and sprite-sheet packer
│   └── cutout.py               # Python (Pillow/NumPy) background removal & edge decontamination helper
├── docs/
│   ├── art-prompts.md          # Prompts for generating matching art assets
│   ├── concepts/               # Reference concept art & item sheets
│   └── screenshots/            # README screenshots
└── prototype/python/           # Early pygame prototype (historical reference only; do not modify unless asked)
```

## 3. Coding & Design Conventions
- **Unicode Math Symbols:** Always use typographic operators `'+'`, `'−'` (U+2212 minus), `'×'`, `'÷'` in level tokens, templates, and display text—never ASCII `'-'`, `'*'`, `'/'` for tokens (`isNegative` and `OPS` in `src/mathEngine.js` expect `'−'`).
- **Exact Arithmetic:** All math evaluation uses the rational `Frac` class in `src/mathEngine.js`—avoid floating-point comparisons in gameplay evaluation.
- **Stable Level IDs:** Never rename existing level `id` values in `src/levels.js` / `src/schools.js`, as player progress in `localStorage` is keyed by level `id`.
- **Sprite & Animation Conventions (`src/assets.js`, `src/draw.js`):**
  - Standing portrait sprites (`professor.png`, `professorka.png`) face **LEFT** with feet touching the bottom edge (used on menu screens such as character select/hallway/rules, and as fallback). Legacy `*_jump.png` files are unused now that jump poses live in the sheets.
  - Gameplay character sprite sheets (`professor_sheet.png`, `professorka_sheet.png`) are `880×560` `4×2` grids (`220×280` cells) facing **RIGHT** with feet bottom-aligned and center-of-mass horizontally aligned: Row 0 = 4-frame walk cycle; Row 1 = idle, jump rising, jump falling, ladder climb.
  - `drawCharacter()` renders portraits on menu screens (`opts.portrait` or `scale > 1.2` while idle) and `drawSheetSprite()` during gameplay (4-frame walk cycle + footstep dust, idle breathing, rise/fall jump frames selected by `vy * gdir`, alternating-flip ladder climb, and visual-only `p.squash` takeoff/landing squash-and-stretch). Keep animation juice strictly visual—never alter hitbox or physics constants for animation.
  - Prefer generating new art on a flat chroma-key green (`#00FF00`) background (no overlap with white hair/chalk/skin) and always run edge color decontamination (`tools/sprite-tool.mjs` or `tools/cutout.py --chroma`) so no pale or green fringe shows on the dark `#1b2622` chalkboard.
  - Always keep procedural fallbacks working in `src/draw.js` / `src/ui.js` when adding or changing visual elements.
- **Menu Interactivity:** Menu screens in `src/screens.js` are immediate-mode rendered each frame and register clickable regions via `game.hit(rect, onClick, onDouble)` and `game.button(...)`.
- **Adding a Level or Evaluator:**
  1. Add/reuse an evaluator in `src/mathEngine.js` (and add its independent floating-point counterpart to `truthByKind` in `tools/verify-levels.html` if adding a new `kind`).
  2. Define the level in `src/levels.js` and add its `id` to the target school in `src/schools.js`.

## 4. Running & Verification
- ES modules cannot run from `file://`. Serve the repo locally with any static HTTP server:
  ```powershell
  python -m http.server 8000
  # or with Node.js:
  npx serve .
  ```
- Open the served URL (e.g. `http://localhost:8000`) to play-test.
- **After modifying `src/levels.js`, `src/mathEngine.js`, `src/schools.js`, or movement physics in `src/constants.js` / `src/main.js`**, always run `/tools/verify-levels.html` and ensure all levels pass both the exhaustive math cross-check and the jump-reachability simulation (and check the browser console for startup validation errors).
- **After adding or editing sprites**, run `node tools/sprite-tool.mjs inspect <png-files>` and visually check edges against the dark chalkboard (`#1f2e2a`) to confirm zero bright/chroma halos.
