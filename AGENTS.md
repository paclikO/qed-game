# Q.E.D. — Agent Instructions & Project Architecture

## 1. Game Concept & Core Loop
- **Title:** Q.E.D. (Quod Erat Demonstrandum)
- **Genre:** 2D Mathematical Puzzle-Platformer.
- **Setting & Visuals:** Dark-academia chalkboard aesthetic (`#1b2622` slate-green background with faint chalk math scribbles, `#6e472b` hand-drawn oak desk/bookshelf platforms with `#24170e` ink outlines, and `#f4efe6` chalk highlights). Zero external images or libraries—render everything procedurally on HTML5 `<canvas>` (`960x540`).
- **Protagonist:** Elderly British professor in side profile—slightly hunched posture (`15°` lean), bald on top with a white hair tuft at the back, round glasses, white mustache, oversized brown/olive tweed jacket, holding a piece of white chalk.
- **Gameplay Loop:**
  - Each level displays a mathematical target at the top (e.g., `= 14`) and an empty equation tray (`3–5` slots) at the bottom.
  - Touching floating math tokens (numbers and operators) appends them to the tray in exact collection order.
  - Pressing `E` or `Backspace` spends 1 **Chalk Eraser** charge to undo the last collected token and respawn it in the level. Pressing `R` restarts the level.
  - Reaching the Exit Door evaluates the tray using standard arithmetic precedence (`×`, `÷` before `+`, `-`). Matching the target unlocks the door (`Q.E.D.`); failing flashes the evaluated value in red chalk.
  - **Mathematical Hazards & Twists:** Collecting negative numbers flips gravity (`gravityDir = -1`) for 3 seconds. Other possibilities to twists might be introduced later.
  - **Wrong Equation Building Consequences**: Apart from evaluating at the end, building the equation will be evaluated also during the level. Building the equation in incorrect way might hgave consequences. E.g. number or operator or other elements might disappear from the circle so the player needs to remember what was there or he needs to use eraser to erase the mistake to recover elements. Other possibilities for consequences and exact mechanisms to be announced and refined later. 

## 2. Tech Stack & File Structure
Use vanilla HTML5 Canvas, CSS3, and ES6 Modules (`<script type="module">`) with **zero external dependencies** or build tools so the project runs directly on GitHub Pages (and can be easily bundled into one `index.html` at the end if needed).