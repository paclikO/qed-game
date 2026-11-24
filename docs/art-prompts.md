# Art prompts (sprites)

The game loads images from `assets/` as listed in `src/assets.js`. Anything missing is drawn
procedurally, so art can be added one piece at a time.

## Adding an image

1. Generate the image (ChatGPT, Gemini, Midjourney…) with a prompt below.
   Attach `docs/concepts/professor_concept.jpg` as a **style reference** so everything matches.
2. If it has a plain paper/light background instead of transparency, cut it out:
   ```powershell
   python tools/cutout.py input.jpg assets/props/desk.png --height 420 --holes
   ```
   (needs `pip install pillow numpy`; use `--holes` for props only, not for characters)
3. Make sure the key is listed in `src/assets.js`.

## Shared style (append to every prompt)

> hand-drawn ink and watercolor illustration, warm muted colors, visible ink outlines, subtle cross-hatching,
> storybook / graphic novel style, same style as the reference image, single object centered,
> plain flat light beige paper background, no text, no shadow on background

## Characters (side view, facing **left**, full body, feet at the bottom edge)

**Female professor (`assets/characters/professorka.png`)**
> Full-body side-profile view of an elderly female mathematics professor facing left, slightly hunched,
> grey hair in a neat bun, round wire glasses, kind clever expression, tweed jacket over a burgundy
> blouse, dark knee-length skirt, dark stockings, brown leather shoes, holding a piece of white chalk
> in her raised hand.

**More poses (optional):** same prompt as the concept, plus `walking mid-stride` /
`jumping, knees bent, coat flying` → e.g. `professor_walk.png`, `professor_jump.png`.

## Props

| File | Prompt (start) |
|---|---|
| `assets/props/desk.png` | Old wooden school teacher's desk, front view, worn oak, four straight legs, top surface flat and level |
| `assets/props/shelf.png` | Long horizontal wooden wall shelf, front view, thick oak plank with two carved brackets underneath, wide aspect ratio 5:1 |
| `assets/props/bookcase.png` | Small antique wooden bookcase, front view, shelves full of old leather-bound books, some leaning |
| `assets/props/books.png` | Small stack of old leather-bound books lying flat, side view, worn spines with gold decorations |
| `assets/props/door.png` | Old classroom wooden door in a grey stone arch, front view, brass handle, tall narrow proportions 1:2 |

## Menu art still missing (placeholders are drawn by code)

The menu screens work without these, but they will look much closer to the concept art with them.
Important: **no text, no labels, no locks, no stars, no progress numbers in the pictures** – the game
draws all of that dynamically (and makes buildings grey/coloured by itself).

| File | Format / size | Prompt (start) |
|---|---|---|
| ~~`assets/ui/campus_map.webp`~~ | **done** | The painted campus (with buildings and name banners) is in place. The game greys out / highlights each building using its region `art: { x, y, w, h }` in `src/schools.js` – if the picture is ever replaced, update those regions. A higher-resolution version (1920×1080) of the same picture would look sharper |
| `assets/ui/hallway.webp` | WebP/PNG, 1920×1080, opaque | Old university corridor, stone walls, vaulted ceiling with arches, hanging lanterns, checkered floor with a long red carpet, tall window at the far end, ivy. **The back wall must be empty (no doors)** – the game places the classroom doors |
| `assets/ui/study.webp` | WebP/PNG, 1920×1080, opaque | Cosy professor's study: wood-panelled walls, bookshelves, globe, arched window with warm light, red rug, desk with books. Keep the centre calm (character cards go there) |
| `assets/ui/classroom.webp` | WebP/PNG, 1920×1080, opaque | Classroom wall with a **large empty dark-green chalkboard** in a wooden frame filling the right ~75 % of the picture, chalk ledge, candle and books on the left |
| `assets/characters/professor_point.png`, `professorka_point.png` *(optional)* | PNG, transparent, ~600×1000, facing right | The professor pointing at a chalkboard with a wooden pointer stick (for the rules screen; today the standing sprite + a drawn stick are used) |

After adding a file, uncomment its line in `src/assets.js`. Use the bottom-centre of each building as its
"ground point" – the building is drawn with its bottom edge on the map position from `src/schools.js`.
