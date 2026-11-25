# Q.E.D. — Agent Instructions & Project Architecture

## 1. Overview & Core Loop
- **Game:** Q.E.D. (*Quod Erat Demonstrandum*) — a 2D dark-academia mathematical puzzle-platformer on a `960×540` logical HTML5 `<canvas>` (DPR-scaled up to `3×`).
- **Visuals & Fallbacks:** Hand-drawn chalkboard palette (`#1b2622` board, `#6e472b` oak, `#24170e` ink, `#f4efe6` chalk) using transparent PNG sprites (`assets/characters/`, `assets/props/`) and painted WebP menu art (`assets/ui/campus_map.webp`) registered in `src/assets.js`. **Every sprite must retain its procedural canvas fallback** in `src/draw.js` / `src/ui.js`.
- **Characters & Progression:** Two playable professors (`professor`, `professorka`), **6 schools × 8 classrooms = 48 levels** (`src/levels.js`, `src/schools.js`), unlocked by total completed rooms (★). Screen flow: `charselect` → `map` → `hallway` → `rules` → `play` → `results` / `over`. Progress is stored in `localStorage` (`qed.progress.v1`; `qed.progress.dev.v1` in dev mode).
- **Gameplay Mechanics:**
  - **Controls:** `←`/`→` move, `Space`/`↑` variable jump (coyote time + jump buffer), `X` dash (works mid-air once per jump), `↑`/`↓` ladders, `↓` drop through shelves, `F` pick up token (`PICKUP_ON_TOUCH = false`), `E` erase last token (uses collected eraser charges, starting at `0`), `R` reset room, `Esc` exit.
  - **Solvability & Twists:** After each pick, `canComplete()` (`src/mathEngine.js`) checks whether `target` is still reachable with remaining room tokens (arithmetic rooms allow any valid prefix/expression up to slot count; formula rooms require all slots). Unreachable picks trigger a mistake (`-3 s` and progressive room fading). Negative number tokens (e.g. `−2`) flip gravity for `3 s`; yellow sponges bounce; chalk gives `+5 s`; erasers grant `+1` charge. Solving spawns a golden key to unlock the exit door (1–3 ★).

## 2. Tech Stack & File Structure
Vanilla HTML5 Canvas, CSS3, and ES6 Modules (`<script type="module">`) with **zero external runtime dependencies** and no build step (deployed via GitHub Pages from `main`; `.nojekyll` present).

```text
/
├── index.html, style.css       # Production entry point & dark-academia framing
├── dev.html                    # Developer Sandbox entry (sets window.QED_DEV = true)
├── src/
│   ├── main.js                 # Game state machine, 60fps loop, physics, input, HUD
│   ├── dev.js                  # Dev Sandbox toolbar, level jumper, hitbox/telemetry overlay
│   ├── constants.js            # Dimensions, physics, rules, palette, fonts
│   ├── mathEngine.js           # Exact Frac arithmetic, evalArith + EV formulas, isComplete/canComplete
│   ├── levels.js               # All 48 level definitions
│   ├── schools.js              # 6 schools, level ID lists, unlock thresholds, map regions
│   ├── progress.js             # localStorage persistence, star/unlock helpers
│   ├── assets.js               # ASSET_FILES registry & async image loader
│   ├── draw.js                 # In-level rendering (chalkboard, props, tokens, characters, FX)
│   ├── ui.js                   # UI primitives & menu backgrounds
│   └── screens.js              # Immediate-mode menu screens
├── assets/                     # characters/ (portraits + 5×2 sheets), props/, ui/campus_map.webp
├── tools/
│   ├── verify-levels.html      # Exhaustive math + jump-reachability verifier for all 48 levels
│   ├── sprite-tool.mjs         # Zero-dependency Node.js chroma-key, defringe & sheet packer
│   └── cutout.py               # Python (Pillow/NumPy) background removal & defringe helper
├── docs/                       # art-prompts.md, concepts/, screenshots/
└── prototype/python/           # Historical pygame prototype (do not modify unless asked)
```

## 3. Conventions & Invariants
- **Unicode Math Symbols:** Always use `'+'`, `'−'` (U+2212), `'×'`, `'÷'` in tokens/templates—never ASCII `'-'`, `'*'`, `'/'` (`OPS` and `isNegative` in `src/mathEngine.js` expect `'−'`).
- **Exact Arithmetic:** Keep all gameplay math on rational `Frac` (`src/mathEngine.js`); never use floats in evaluators.
- **Stable Level IDs:** Never rename existing level `id`s (`localStorage` progress is keyed by `id`).
- **Sprites & Animation (`src/assets.js`, `src/draw.js`):**
  - Menu portraits (`professor.png`, `professorka.png`) face **LEFT**, feet on bottom edge (legacy `*_jump.png` files are unused).
  - Gameplay sheets (`professor_sheet.png`, `professorka_sheet.png`) are `1100×560` `5×2` grids (`220×280` cells) facing **RIGHT**, feet bottom-aligned & center-of-mass aligned: Row 0 = 4 walk frames + dash launch; Row 1 = idle, jump up, jump fall, climb, dash glide.
  - Keep animation polish (`p.squash`, afterimages, dust) strictly visual—never alter hitboxes or physics constants for animation.
  - Prefer flat `#00FF00` chroma-key backgrounds for new sprites and run edge color decontamination (`tools/sprite-tool.mjs` or `tools/cutout.py --chroma`) to prevent halos on the dark chalkboard.
- **Menu Interactivity:** Screens in `src/screens.js` are immediate-mode rendered and register hit targets each frame via `game.hit(...)` and `game.button(...)`.
- **Adding a Level / Evaluator:** Add or reuse an evaluator in `src/mathEngine.js` (plus a floating-point check in `truthByKind` in `tools/verify-levels.html` for new `kind`s), define the level in `src/levels.js`, and list its `id` in `src/schools.js`.

## 4. Running & Verification
- Serve locally (ES modules require HTTP): `npx serve .` or `python -m http.server 8000`.
- Play normal game at `/` or **Developer Sandbox** at `/dev.html` (or `/?dev=1`; all levels unlocked, isolated `qed.progress.dev.v1` save, `` ` `` toggles toolbar, `[`/`]` steps levels).
- **After editing `src/levels.js`, `src/mathEngine.js`, `src/schools.js`, or physics in `src/constants.js` / `src/main.js`**, run `/tools/verify-levels.html` and ensure all 48 levels pass both math and jump-reachability checks.
- **After adding or editing sprites**, run `node tools/sprite-tool.mjs inspect <png-files>` and visually verify clean edges against `#1f2e2a`.
