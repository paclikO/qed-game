// Schools on the campus map. Each school lists the ids of its playable levels (from levels.js)
// and, for schools that are not built yet, the topics planned for them (shown as "Coming soon").
// To add a level: define it in levels.js (with a unique id) and add the id to a school's `levels`.
//
//   id, name, symbol, motto  – shown on the map and in the hallway
//   style                    – look of the placeholder building ('classical' | 'gothic' | 'dome' | 'castle' | 'observatory' | 'grand')
//   map: { x, y }            – building position on the procedural fallback map (bottom-centre of the building)
//   art: { x, y, w, h, chip } – where the building + its label sit on the painted map (assets/ui/campus_map.webp),
//                              used for greying-out, hover highlight and clicks; chip = progress badge position
//   unlock                   – number of ★ (completed rooms, all schools together) needed to open the school
//   levels                   – playable level ids, in recommended order (use an even number → symmetric doors)
//   planned                  – topic names that are not implemented yet (rendered as locked "Coming soon" doors)
import { LEVELS } from './levels.js';

export const SCHOOLS = [
  {
    id: 'mathematics', name: 'School of Mathematics', symbol: 'π', motto: 'Foundations of mathematical thinking.',
    style: 'classical', map: { x: 170, y: 318 }, art: { x: 30, y: 218, w: 255, h: 186, chip: { x: 188, y: 404 } },
    unlock: 0,
    levels: ['arithmetic', 'arithmetic-2', 'negative-numbers', 'powers', 'derivatives', 'integrals', 'probability', 'fractions'],
    planned: [],
  },
  {
    id: 'algebra', name: 'Academy of Algebra', symbol: 'x²', motto: 'The art of the unknown.',
    style: 'gothic', map: { x: 395, y: 222 }, art: { x: 338, y: 300, w: 262, h: 206, chip: { x: 465, y: 506 } },
    unlock: 4,
    levels: ['alg-linear', 'alg-brackets', 'alg-square-sum', 'alg-diff-squares', 'alg-polynomial', 'alg-exponents', 'alg-logarithms', 'alg-sequences'],
    planned: [],
  },
  {
    id: 'geometry', name: 'Institute of Geometry', symbol: '△', motto: 'Shapes, space and proof.',
    style: 'dome', map: { x: 625, y: 228 }, art: { x: 680, y: 232, w: 248, h: 168, chip: { x: 815, y: 400 } },
    unlock: 8,
    levels: ['geo-triangle', 'geo-perimeter', 'geo-area', 'geo-pythagoras', 'geo-triangle-area', 'geo-circle', 'geo-volume', 'geo-polygons'],
    planned: [],
  },
  {
    id: 'calculus', name: 'University of Calculus', symbol: '∫', motto: 'Change, motion and infinity.',
    style: 'castle', map: { x: 828, y: 318 }, art: { x: 688, y: 70, w: 205, h: 172, chip: { x: 782, y: 242 } },
    unlock: 12,
    levels: ['calc-limits', 'calc-power-rule', 'calc-second', 'calc-chain', 'calc-extrema', 'calc-definite', 'calc-area', 'calc-series'],
    planned: [],
  },
  {
    id: 'statistics', name: 'Academy of Statistics', symbol: 'σ', motto: 'Reasoning under uncertainty.',
    style: 'observatory', map: { x: 360, y: 418 }, art: { x: 116, y: 56, w: 178, h: 152, chip: { x: 215, y: 208 } },
    unlock: 16,
    levels: ['stat-mean', 'stat-median', 'stat-range', 'stat-combinations', 'stat-permutations', 'stat-binomial', 'stat-conditional', 'stat-variance'],
    planned: [],
  },
  {
    id: 'grand', name: 'Grand Mathematical University', symbol: '∞', motto: 'Where every path meets.',
    style: 'grand', map: { x: 640, y: 420 }, art: { x: 338, y: 50, w: 288, h: 162, chip: { x: 480, y: 212 } },
    unlock: 20,
    levels: ['grand-arith', 'grand-powers', 'grand-derivative', 'grand-integral', 'grand-combinatorics', 'grand-pythagoras', 'grand-logarithm', 'grand-final'],
    planned: [],
  },
];

export const levelIndexById = (id) => LEVELS.findIndex((l) => l.id === id);
export const schoolOfLevel = (id) => SCHOOLS.find((s) => s.levels.includes(id));
export const isComingSoon = (school) => school.levels.length === 0;
