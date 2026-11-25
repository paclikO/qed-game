// Image assets (sprites). Put a PNG under assets/ and list it here.
// Anything not listed (or failing to load) falls back to the procedural drawing in draw.js,
// so the game is always playable. Prompts for generating the missing art: docs/art-prompts.md
//
// Conventions
//   characters – full body, side view, facing LEFT, transparent background, feet touching the bottom edge (portraits/fallback)
//   char sheets – 5×2 grid, facing RIGHT, feet bottom-aligned: row 0 = 4 walk frames + dash launch; row 1 = idle, jump up, jump fall, climb, dash glide
//   desk       – whole desk incl. legs, slight top-down view; the top ~12 % of its height is the table top (see drawPlatform)
//   shelf      – wall shelf plank + brackets; top edge = shelf surface
//   books      – a small stack of books, bottom edge = where it rests
export const ASSET_FILES = {
  'char.professor': 'assets/characters/professor.png',
  'char.professorka': 'assets/characters/professorka.png',
  'char.professor_sheet': 'assets/characters/professor_sheet.png',
  'char.professorka_sheet': 'assets/characters/professorka_sheet.png',
  'prop.desk': 'assets/props/desk.png',
  'prop.shelf': 'assets/props/shelf.png',
  'prop.bookcase': 'assets/props/bookcase.png',
  'prop.books': 'assets/props/books.png',
  'prop.door': 'assets/props/door.png',
  'prop.door_open': 'assets/props/door_open.png',
  'prop.ladder': 'assets/props/ladder.png',
  'prop.sponge': 'assets/props/sponge.png',
  'prop.key': 'assets/props/key.png',
  'prop.eraser': 'assets/props/eraser.png',
  'prop.chalk': 'assets/props/chalk.png',
  'prop.dust': 'assets/props/dust.png',

  // --- Menu art (not painted yet – the game draws placeholders). Add the file, then uncomment its line.
  'ui.map': 'assets/ui/campus_map.webp',              // painted campus; building regions are in schools.js (art)
  // 'ui.hallway': 'assets/ui/hallway.webp',           // 1920×1080, empty corridor wall (doors are drawn by the game)
  // 'ui.study': 'assets/ui/study.webp',               // 1920×1080, professor's study (character selection)
  // 'ui.classroom': 'assets/ui/classroom.webp',       // 1920×1080, wall with a big empty chalkboard (rules)
  // 'building.mathematics': 'assets/buildings/mathematics.png', // transparent, ~800×640, building only
  // 'building.algebra': 'assets/buildings/algebra.png',
  // 'building.geometry': 'assets/buildings/geometry.png',
  // 'building.calculus': 'assets/buildings/calculus.png',
  // 'building.statistics': 'assets/buildings/statistics.png',
  // 'building.grand': 'assets/buildings/grand.png',
};

export const images = {};

export function loadAssets() {
  return Promise.all(Object.entries(ASSET_FILES).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = () => { console.warn(`Asset not found, using drawn fallback: ${src}`); resolve(); };
    img.src = src;
  })));
}
