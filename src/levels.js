// Level definitions for Q.E.D.
//
// Each level:
//   id               – unique id (used by schools.js and saved progress – don't rename once released)
//   symbol, rule     – door symbol in the hallway and the level-specific rule on the rules board
//   name, subtitle   – shown in the HUD
//   target           – Fraction the finished expression must equal; targetText – how it is displayed
//   template         – the expression: strings are fixed text, S is a slot the player fills
//   evaluate         – fn(array of slot texts) -> Fraction | null (null = invalid expression)
//   time             – seconds for the level
//   spawn            – professor start x; doorX – exit door x (door stands on the floor)
//   platforms        – [x, topY, width, kind]  kind: 'shelf' | 'desk'   (canvas is 960x540, floor at y=472)
//   tokens           – [text, x, y] collectible symbols. A negative number (e.g. '−2') flips gravity.
//   ladders          – [x, topY, bottomY] (optional) topY must equal a platform top, bottomY the floor/desk below
//   sponges          – [x, surfaceY] (optional) yellow bounce pad resting on a surface
//   pickups          – ['chalk' | 'eraser', x, y] (optional) chalk = +5 s, eraser = +1 charge; y ≈ surface − 20
//
// Tips: a platform is reachable if it is at most ~80 px above the one you jump from
// and the horizontal gap is under ~100 px. Tokens float ~36 px above a platform top.
// On start the game verifies that every level is solvable (see console).
import { S, frac, evalArith, evalPower, evalDerivative, evalIntegral, evalProbability, EV } from './mathEngine.js';

export const LEVELS = [
  {
    id: 'arithmetic',
    name: '1. Arithmetic',
    symbol: '+',
    rule: 'Mind the operator precedence: × and ÷ are done before + and −. Any correct expression of up to 5 symbols counts.',
    subtitle: 'Mind the operator precedence!',
    target: frac(14),
    targetText: '14',
    template: [S, S, S, S, S],
    evaluate: evalArith,
    time: 45,
    spawn: 45,
    doorX: 878,
    ladders: [[332, 322, 472]],
    sponges: [[612, 398]],
    pickups: [['chalk', 760, 452], ['eraser', 305, 220]],
    platforms: [
      [135, 398, 150, 'desk'],
      [315, 322, 135, 'shelf'],
      [495, 398, 142, 'desk'],
      [675, 315, 135, 'shelf'],
      [480, 240, 128, 'shelf'],
      [188, 240, 142, 'shelf'],
      [780, 225, 150, 'shelf'],
    ],
    tokens: [
      ['2', 210, 362],
      ['+', 255, 204],
      ['3', 544, 204],
      ['×', 382, 286],
      ['4', 855, 189],
      ['5', 566, 362],
      ['−', 742, 279],
      ['1', 420, 436],
    ],
  },
  {
    id: 'arithmetic-2',
    name: '2. Arithmetic II',
    symbol: '÷',
    rule: 'Division is an operation too – 8 ÷ 2 + 3 = 7. Shorter expressions are fine as long as they hit the target.',
    subtitle: 'Division is an operation too',
    target: frac(7),
    targetText: '7',
    template: [S, S, S, S, S],
    evaluate: evalArith,
    time: 50,
    spawn: 45,
    doorX: 878,
    ladders: [[482, 300, 472]],
    sponges: [[740, 398]],
    pickups: [['eraser', 380, 452]],
    platforms: [
      [45, 390, 112, 'shelf'],
      [225, 398, 120, 'desk'],
      [98, 308, 120, 'shelf'],
      [285, 225, 128, 'shelf'],
      [465, 300, 120, 'shelf'],
      [630, 398, 128, 'desk'],
      [638, 232, 120, 'shelf'],
      [810, 315, 112, 'shelf'],
      [465, 150, 112, 'shelf'],
    ],
    tokens: [
      ['9', 101, 354],
      ['÷', 158, 272],
      ['3', 521, 114],
      ['+', 285, 362],
      ['4', 698, 196],
      ['×', 525, 264],
      ['2', 866, 279],
      ['−', 349, 189],
      ['8', 694, 362],
    ],
  },
  {
    id: 'negative-numbers',
    name: '3. Negative numbers',
    symbol: '−',
    rule: 'Pay attention to signs: a violet −2 is a negative number (and flips gravity for 3 s); a lone − can also be a minus sign.',
    subtitle: 'A negative number flips gravity for 3 s!',
    target: frac(-6),
    targetText: '−6',
    template: [S, S, S, S, S],
    evaluate: evalArith,
    time: 50,
    spawn: 30,
    doorX: 878,
    ladders: [[684, 322, 472]],
    sponges: [[600, 472]],
    pickups: [['chalk', 345, 152], ['eraser', 380, 452]],
    platforms: [
      [45, 398, 135, 'desk'],
      [225, 322, 128, 'shelf'],
      [405, 248, 128, 'shelf'],
      [570, 322, 128, 'shelf'],
      [735, 398, 128, 'desk'],
      [750, 240, 135, 'shelf'],
      [225, 172, 135, 'shelf'],
      [420, 398, 120, 'desk'],
    ],
    tokens: [
      ['4', 112, 362],
      ['×', 289, 286],
      ['−2', 469, 212],
      ['+', 292, 136],
      ['2', 818, 204],
      ['3', 634, 286],
      ['−', 480, 362],
      ['1', 799, 362],
    ],
  },
  {
    id: 'powers',
    name: '4. Powers',
    symbol: 'xⁿ',
    rule: 'Fill a ^ b − c: the power is evaluated first, then the subtraction. All three slots must be filled.',
    subtitle: 'Exponents grow fast',
    target: frac(23),
    targetText: '23',
    template: [S, '^', S, '−', S],
    evaluate: evalPower,
    time: 50,
    spawn: 30,
    doorX: 878,
    ladders: [[755, 322, 472]],
    sponges: [[580, 398]],
    pickups: [['eraser', 360, 300]],
    platforms: [
      [90, 398, 135, 'desk'],
      [262, 322, 120, 'shelf'],
      [90, 248, 120, 'shelf'],
      [420, 248, 135, 'shelf'],
      [450, 398, 150, 'desk'],
      [645, 322, 120, 'shelf'],
      [615, 172, 128, 'shelf'],
      [795, 248, 120, 'shelf'],
    ],
    tokens: [
      ['5', 150, 212],
      ['2', 855, 212],
      ['3', 488, 212],
      ['4', 679, 136],
      ['1', 525, 362],
      ['7', 158, 362],
      ['2', 705, 286],
    ],
  },
  {
    id: 'derivatives',
    name: '5. Derivatives',
    symbol: 'd/dx',
    rule: 'Use the power rule (a·xⁿ)′ = a·n·xⁿ⁻¹, then evaluate it at the chosen x. All three slots must be filled.',
    subtitle: '(a·x^n)\' = a·n·x^(n−1)',
    target: frac(12),
    targetText: '12',
    template: ['d/dx (', S, '· x^', S, ')  at x =', S],
    evaluate: evalDerivative,
    time: 55,
    spawn: 45,
    doorX: 878,
    ladders: [[700, 262, 398]],
    sponges: [[300, 472]],
    pickups: [['chalk', 560, 452], ['eraser', 610, 168]],
    platforms: [
      [30, 390, 105, 'shelf'],
      [188, 322, 105, 'shelf'],
      [345, 255, 105, 'shelf'],
      [502, 188, 120, 'shelf'],
      [390, 398, 135, 'desk'],
      [675, 262, 112, 'shelf'],
      [660, 398, 128, 'desk'],
      [825, 322, 105, 'shelf'],
    ],
    tokens: [
      ['3', 82, 354],
      ['2', 240, 286],
      ['1', 398, 219],
      ['4', 562, 152],
      ['2', 731, 226],
      ['5', 458, 362],
      ['6', 724, 362],
    ],
  },
  {
    id: 'integrals',
    name: '6. Integrals',
    symbol: '∫',
    rule: 'The antiderivative of a·x is a·x²/2, so ∫ from c to b of a·x dx = a·(b² − c²)/2. Fill all three slots.',
    subtitle: '∫ a·x dx = a·x²/2',
    target: frac(9),
    targetText: '9',
    template: ['∫ from', S, 'to', S, '(', S, '· x ) dx'],
    evaluate: evalIntegral,
    time: 60,
    spawn: 30,
    doorX: 878,
    ladders: [[712, 322, 472]],
    sponges: [[630, 398]],
    pickups: [['eraser', 555, 228]],
    platforms: [
      [75, 398, 128, 'desk'],
      [248, 330, 112, 'shelf'],
      [68, 262, 128, 'shelf'],
      [248, 195, 112, 'shelf'],
      [68, 142, 112, 'shelf'],
      [435, 248, 135, 'shelf'],
      [525, 398, 128, 'desk'],
      [698, 322, 112, 'shelf'],
      [810, 240, 112, 'shelf'],
      [645, 165, 120, 'shelf'],
    ],
    tokens: [
      ['0', 124, 106],
      ['1', 139, 362],
      ['2', 120, 226],
      ['3', 866, 204],
      ['4', 304, 294],
      ['5', 705, 129],
      ['6', 502, 212],
    ],
  },
  {
    id: 'probability',
    name: '7. Probability',
    symbol: 'P',
    rule: 'Independent events multiply: P(A∩B) = P(A)·P(B). Build both fractions so the product equals the target.',
    subtitle: 'Independent events: P(A∩B) = P(A)·P(B)',
    target: frac(1, 6),
    targetText: '1/6',
    template: ['P =', S, '/', S, '·', S, '/', S],
    evaluate: evalProbability,
    time: 60,
    spawn: 45,
    doorX: 878,
    ladders: [[780, 322, 472]],
    sponges: [[625, 398]],
    pickups: [['chalk', 900, 228], ['eraser', 420, 452]],
    platforms: [
      [30, 398, 98, 'shelf'],
      [180, 398, 105, 'desk'],
      [315, 322, 105, 'shelf'],
      [150, 248, 112, 'shelf'],
      [322, 172, 112, 'shelf'],
      [488, 248, 105, 'shelf'],
      [638, 180, 105, 'shelf'],
      [525, 398, 120, 'desk'],
      [690, 322, 105, 'shelf'],
      [818, 248, 105, 'shelf'],
    ],
    tokens: [
      ['1', 79, 362],
      ['2', 232, 362],
      ['3', 368, 286],
      ['1', 206, 212],
      ['6', 379, 136],
      ['4', 540, 212],
      ['5', 690, 144],
    ],
  },
];

// ============================================================================================
// Rooms of the other schools. They reuse the eight verified room layouts below (platforms,
// ladders, sponges, pickups, symbol positions) and only define the mathematics. Symbols are
// placed on the layout's symbol positions in the order they are listed.
// ============================================================================================
const pickLayout = (l) => ({
  spawn: l.spawn, doorX: l.doorX, platforms: l.platforms, ladders: l.ladders, sponges: l.sponges, pickups: l.pickups,
  spots: l.tokens.map(([, x, y]) => [x, y]),
});
const mirrorX = (x) => 960 - x;
const mirror = (l) => ({
  ...l,
  platforms: l.platforms.map(([x, y, w, k]) => [960 - x - w, y, w, k]),
  ladders: l.ladders.map(([x, t, b]) => [mirrorX(x), t, b]),
  sponges: l.sponges.map(([x, y]) => [mirrorX(x), y]),
  pickups: l.pickups.map(([k, x, y]) => [k, mirrorX(x), y]),
  spots: l.spots.map(([x, y]) => [mirrorX(x), y]),
});
// layouts 1–7 = the School of Mathematics rooms, layout 8 = room 1 mirrored
export const LAYOUTS = [...LEVELS.slice(0, 7).map(pickLayout)];
LAYOUTS.push(mirror(LAYOUTS[0]));

function room(n, layout, { id, name, subtitle, symbol, rule, template, evaluate, target, targetText, tokens, time = 60 }) {
  const L = LAYOUTS[layout - 1];
  if (tokens.length > L.spots.length) throw new Error(`${id}: ${tokens.length} symbols but layout ${layout} has ${L.spots.length} spots`);
  return {
    id, name: `${n}. ${name}`, subtitle, symbol, rule, template, evaluate, time,
    target: typeof target === 'number' ? frac(target) : target, targetText: targetText ?? String(target).replace('-', '−'),
    spawn: L.spawn, doorX: L.doorX, platforms: L.platforms, ladders: L.ladders, sponges: L.sponges, pickups: L.pickups,
    tokens: tokens.map((t, i) => [t, ...L.spots[i]]),
  };
}

LEVELS.push(
  // ---------------------------------------------------------------- School of Mathematics, room 8
  room(8, 8, {
    id: 'fractions', name: 'Fractions', symbol: '½', subtitle: 'a/b + c/d',
    rule: 'Add two fractions so that the sum equals the target – bring them to a common denominator in your head.',
    template: [S, '/', S, '+', S, '/', S], evaluate: EV.fractionSum, target: 1,
    tokens: ['1', '3', '2', '6', '4', '1'],
  }),

  // ---------------------------------------------------------------- Academy of Algebra
  room(1, 4, {
    id: 'alg-linear', name: 'Linear Equations', symbol: 'x', subtitle: 'a·x + b = c',
    rule: 'Build an equation a·x + b = c whose solution is the target: x = (c − b) / a.',
    template: [S, '· x +', S, '=', S, '  →  x'], evaluate: EV.linear, target: 3,
    tokens: ['2', '7', '5', '4', '11', '3'],
  }),
  room(2, 5, {
    id: 'alg-brackets', name: 'Brackets', symbol: '( )', subtitle: 'a·(b + c)',
    rule: 'The bracket is evaluated first, then multiplied: a·(b + c).',
    template: [S, '· (', S, '+', S, ')'], evaluate: EV.brackets, target: 18,
    tokens: ['3', '5', '2', '1', '4', '7'],
  }),
  room(3, 6, {
    id: 'alg-square-sum', name: 'Square of a Sum', symbol: '( )²', subtitle: '(a + b)²',
    rule: 'Add first, then square: (a + b)² – not a² + b²!',
    template: ['(', S, '+', S, ')²'], evaluate: EV.squareOfSum, target: 49,
    tokens: ['2', '4', '8', '3', '9', '1'],
  }),
  room(4, 7, {
    id: 'alg-diff-squares', name: 'Difference of Squares', symbol: 'a²−b²', subtitle: 'a² − b² = (a − b)(a + b)',
    rule: 'Square both numbers and subtract: a² − b².',
    template: [S, '² −', S, '²'], evaluate: EV.diffSquares, target: 16,
    tokens: ['6', '5', '2', '3', '7', '4'],
  }),
  room(5, 1, {
    id: 'alg-polynomial', name: 'Polynomials', symbol: 'p(x)', subtitle: 'p(x) = x² + a·x + b',
    rule: 'Choose the coefficients a, b and the point x so that p(x) = x² + a·x + b equals the target.',
    template: ['p(x) = x² +', S, '· x +', S, ',  p(', S, ')'], evaluate: EV.polyValue, target: 15,
    tokens: ['4', '6', '3', '1', '2', '5'],
  }),
  room(6, 2, {
    id: 'alg-exponents', name: 'Exponents', symbol: 'aⁿ', subtitle: 'a^b · c^d',
    rule: 'Each power is evaluated first, then the results are multiplied.',
    template: [S, '^', S, '·', S, '^', S], evaluate: EV.powerProduct, target: 72,
    tokens: ['2', '5', '3', '1', '3', '4', '2'],
  }),
  room(7, 3, {
    id: 'alg-logarithms', name: 'Logarithms', symbol: 'log', subtitle: 'log_b(x) = k  ⇔  bᵏ = x',
    rule: 'log base b of x is the exponent k with bᵏ = x. Only exact powers count.',
    template: ['log base', S, 'of', S], evaluate: EV.logarithm, target: 3,
    tokens: ['8', '5', '3', '16', '2', '27', '4'],
  }),
  room(8, 8, {
    id: 'alg-sequences', name: 'Sequences', symbol: 'aₙ', subtitle: 'aₙ = a₁ + (n − 1)·d',
    rule: 'Arithmetic sequence: start at a₁, add d each step. Which term aₙ equals the target?',
    template: ['a₁ =', S, ',  d =', S, '  →  term n =', S], evaluate: EV.sequence, target: 20,
    tokens: ['3', '2', '6', '7', '1', '4'],
  }),

  // ---------------------------------------------------------------- Institute of Geometry
  room(1, 4, {
    id: 'geo-triangle', name: 'Angles', symbol: '∠', subtitle: 'α + β + γ = 180°',
    rule: 'The angles of a triangle add up to 180°. Pick the two known angles so the third equals the target.',
    template: ['γ = 180° −', S, '° −', S, '°'], evaluate: EV.triangleAngle, target: 70, targetText: '70°',
    tokens: ['60', '90', '50', '30', '80', '45'],
  }),
  room(2, 5, {
    id: 'geo-perimeter', name: 'Perimeter', symbol: '▭', subtitle: 'P = 2·(a + b)',
    rule: 'Perimeter of a rectangle: twice the sum of its two sides.',
    template: ['P = 2 · (', S, '+', S, ')'], evaluate: EV.perimeter, target: 24,
    tokens: ['5', '9', '7', '2', '6', '4'],
  }),
  room(3, 6, {
    id: 'geo-area', name: 'Area', symbol: '▦', subtitle: 'A = a · b',
    rule: 'Area of a rectangle: multiply its two sides.',
    template: ['A =', S, '·', S], evaluate: EV.product2, target: 24,
    tokens: ['6', '5', '7', '4', '9', '3'],
  }),
  room(4, 7, {
    id: 'geo-pythagoras', name: 'Pythagoras', symbol: '◺', subtitle: 'c = √(a² + b²)',
    rule: 'The hypotenuse of a right triangle: c = √(a² + b²). Only whole-number results count.',
    template: ['c = √(', S, '² +', S, '²)'], evaluate: EV.pythagoras, target: 5,
    tokens: ['2', '3', '6', '4', '1', '5'],
  }),
  room(5, 1, {
    id: 'geo-triangle-area', name: 'Triangle Area', symbol: '△', subtitle: 'A = a·h / 2',
    rule: 'Area of a triangle: base times height, divided by two.',
    template: ['A =', S, '·', S, '/ 2'], evaluate: EV.triangleArea, target: 12,
    tokens: ['5', '6', '2', '4', '7', '9'],
  }),
  room(6, 2, {
    id: 'geo-circle', name: 'Circles', symbol: '○', subtitle: 'A = π·r²',
    rule: 'Area of a circle: π·r². Here the radius is r = a + b, so the area is π·(a + b)².',
    template: ['A = π · (', S, '+', S, ')²'], evaluate: EV.circleArea, target: 25, targetText: '25π',
    tokens: ['1', '6', '2', '7', '3', '8'],
  }),
  room(7, 3, {
    id: 'geo-volume', name: 'Volume', symbol: '⬚', subtitle: 'V = a·b·c',
    rule: 'Volume of a box: length · width · height.',
    template: ['V =', S, '·', S, '·', S], evaluate: EV.product3, target: 60,
    tokens: ['3', '7', '4', '2', '5', '8'],
  }),
  room(8, 8, {
    id: 'geo-polygons', name: 'Polygons', symbol: '⬠', subtitle: 'sum of angles = (n − 2)·180°',
    rule: 'An n-gon splits into n − 2 triangles, so its angles add up to (n − 2)·180°.',
    template: ['(', S, '− 2) ·', S, '°'], evaluate: EV.polygonAngles, target: 540, targetText: '540°',
    tokens: ['6', '90', '5', '120', '4', '180'],
  }),

  // ---------------------------------------------------------------- University of Calculus
  room(1, 4, {
    id: 'calc-limits', name: 'Limits', symbol: 'lim', subtitle: 'lim (a·x + b) = a·x₀ + b',
    rule: 'A linear function is continuous, so its limit at x₀ is simply its value a·x₀ + b.',
    template: ['lim x→', S, 'of (', S, '· x +', S, ')'], evaluate: EV.limitLinear, target: 11,
    tokens: ['2', '5', '4', '6', '3', '1'],
  }),
  room(2, 5, {
    id: 'calc-power-rule', name: 'Power Rule', symbol: 'xⁿ′', subtitle: '(a·xⁿ)′ = a·n·xⁿ⁻¹',
    rule: 'Differentiate a·xⁿ with the power rule, then evaluate at x.',
    template: ['d/dx (', S, '· x^', S, ')  at x =', S], evaluate: EV.powerRule, target: 48,
    tokens: ['3', '5', '2', '7', '8', '1'],
  }),
  room(3, 6, {
    id: 'calc-second', name: 'Second Derivative', symbol: 'f″', subtitle: '(a·xⁿ)″ = a·n·(n − 1)·xⁿ⁻²',
    rule: 'Differentiate twice: (a·xⁿ)″ = a·n·(n − 1)·xⁿ⁻², then evaluate at x.',
    template: ['(', S, '· x^', S, ')″  at x =', S], evaluate: EV.secondDerivative, target: 24,
    tokens: ['2', '5', '3', '1', '2', '6'],
  }),
  room(4, 7, {
    id: 'calc-chain', name: 'Chain Rule', symbol: 'f∘g', subtitle: '[(a·x + b)ⁿ]′ = n·a·(a·x + b)ⁿ⁻¹',
    rule: 'Chain rule: derivative of the outside times derivative of the inside, evaluated at x = 1.',
    template: ['d/dx (', S, '· x +', S, ')^', S, '  at x = 1'], evaluate: EV.chainRule, target: 24,
    tokens: ['3', '5', '1', '4', '2', '6'],
  }),
  room(5, 1, {
    id: 'calc-extrema', name: 'Extrema', symbol: '⌒', subtitle: 'f′(x) = 0',
    rule: 'f(x) = a·x² − b·x has its minimum where f′(x) = 2a·x − b = 0, i.e. at x = b / (2a).',
    template: ['f(x) =', S, '· x² −', S, '· x   →  minimum at x'], evaluate: EV.vertex, target: 2,
    tokens: ['3', '5', '12', '7', '4', '9'],
  }),
  room(6, 2, {
    id: 'calc-definite', name: 'Definite Integrals', symbol: '∫ᵇ', subtitle: '∫₀ᵇ a·x² dx = a·b³/3',
    rule: 'The antiderivative of a·x² is a·x³/3; evaluate it from 0 to b.',
    template: ['∫ from 0 to', S, 'of', S, '· x² dx'], evaluate: EV.integralSquare, target: 9,
    tokens: ['2', '4', '3', '5', '1', '6', '7'],
  }),
  room(7, 3, {
    id: 'calc-area', name: 'Area under a Line', symbol: '▁', subtitle: '∫ₐᵇ k dx = k·(b − a)',
    rule: 'The integral of a constant k from c to b is the area of a rectangle: k·(b − c).',
    template: ['∫ from', S, 'to', S, 'of', S, 'dx'], evaluate: EV.integralConst, target: 12,
    tokens: ['1', '6', '5', '2', '3', '7'],
  }),
  room(8, 8, {
    id: 'calc-series', name: 'Series', symbol: '∑', subtitle: '∑ₖ₌₁ⁿ a·k = a·n(n + 1)/2',
    rule: 'Sum of a·k for k = 1 … n: a times the n-th triangular number n(n + 1)/2.',
    template: ['∑ k = 1 …', S, 'of', S, '· k'], evaluate: EV.sumK, target: 30,
    tokens: ['4', '6', '3', '7', '5', '2'],
  }),

  // ---------------------------------------------------------------- Academy of Statistics
  room(1, 4, {
    id: 'stat-mean', name: 'Mean', symbol: 'x̄', subtitle: 'x̄ = (a + b + c)/3',
    rule: 'The mean of three values is their sum divided by 3.',
    template: ['mean of', S, ',', S, ',', S], evaluate: EV.mean3, target: 5,
    tokens: ['3', '9', '5', '2', '7', '8'],
  }),
  room(2, 5, {
    id: 'stat-median', name: 'Median', symbol: 'M', subtitle: 'the middle value',
    rule: 'The median is the middle value once the three numbers are sorted.',
    template: ['median of', S, ',', S, ',', S], evaluate: EV.median3, target: 6,
    tokens: ['2', '6', '9', '4', '7', '1'],
  }),
  room(3, 6, {
    id: 'stat-range', name: 'Range', symbol: '↔', subtitle: 'max − min',
    rule: 'The range is the largest value minus the smallest one.',
    template: ['range of', S, ',', S, ',', S], evaluate: EV.range3, target: 7,
    tokens: ['2', '5', '9', '3', '6', '1'],
  }),
  room(4, 7, {
    id: 'stat-combinations', name: 'Combinations', symbol: 'C', subtitle: 'C(n, k) = n! / (k!(n − k)!)',
    rule: 'Number of ways to choose k items out of n, order does not matter.',
    template: ['C(', S, ',', S, ')'], evaluate: EV.combinations, target: 10,
    tokens: ['5', '4', '2', '6', '3'],
  }),
  room(5, 1, {
    id: 'stat-permutations', name: 'Permutations', symbol: 'n!', subtitle: 'a! / b!',
    rule: 'a! / b! counts ordered arrangements: e.g. 5!/3! = 5·4.',
    template: [S, '! /', S, '!'], evaluate: EV.permutations, target: 20,
    tokens: ['5', '2', '3', '6', '4'],
  }),
  room(6, 2, {
    id: 'stat-binomial', name: 'Binomial', symbol: 'B', subtitle: 'P(k heads in n tosses) = C(n,k)/2ⁿ',
    rule: 'Tossing a fair coin n times: P(exactly k heads) = C(n, k) / 2ⁿ.',
    template: ['C(', S, ',', S, ') / 2^', S], evaluate: EV.binomial, target: frac(3, 8), targetText: '3/8',
    tokens: ['3', '5', '1', '4', '3', '2'],
  }),
  room(7, 3, {
    id: 'stat-conditional', name: 'Conditional Probability', symbol: 'P(|)', subtitle: 'P(A|B) = P(A∩B) / P(B)',
    rule: 'P(A|B) is the probability of both events divided by the probability of B.',
    template: ['P(A|B) = (', S, '/', S, ') ÷ (', S, '/', S, ')'], evaluate: EV.conditional, target: frac(1, 2), targetText: '1/2',
    tokens: ['1', '4', '3', '1', '2', '6'],
  }),
  room(8, 8, {
    id: 'stat-variance', name: 'Variance', symbol: 'σ²', subtitle: 'σ² of two values = ((a − b)/2)²',
    rule: 'For two values the variance is the square of half their distance.',
    template: ['σ² of', S, 'and', S], evaluate: EV.variance2, target: 4,
    tokens: ['2', '7', '6', '3', '9', '4'],
  }),

  // ---------------------------------------------------------------- Grand Mathematical University (mixed)
  room(1, 1, {
    id: 'grand-arith', name: 'Mixed Arithmetic', symbol: '±', subtitle: 'precedence, again',
    rule: 'Free arithmetic: any correct expression of up to 5 symbols. × and ÷ go before + and −.',
    template: [S, S, S, S, S], evaluate: evalArith, target: 50, time: 55,
    tokens: ['7', '+', '8', '×', '6', '−', '4', '÷'],
  }),
  room(2, 8, {
    id: 'grand-powers', name: 'Sum of Powers', symbol: 'a²+b²', subtitle: 'a^b + c^d',
    rule: 'Evaluate both powers, then add them.',
    template: [S, '^', S, '+', S, '^', S], evaluate: EV.sumOfPowers, target: 25,
    tokens: ['3', '2', '5', '4', '2', '6', '1'],
  }),
  room(3, 3, {
    id: 'grand-derivative', name: 'Derivative Challenge', symbol: 'f′', subtitle: '(a·xⁿ)′ at x',
    rule: 'Power rule once more – this time with bigger numbers.',
    template: ['d/dx (', S, '· x^', S, ')  at x =', S], evaluate: evalDerivative, target: 108,
    tokens: ['4', '2', '3', '5', '3', '6'],
  }),
  room(4, 4, {
    id: 'grand-integral', name: 'Integral Challenge', symbol: '∫', subtitle: '∫ a·x dx = a·(b² − c²)/2',
    rule: 'The antiderivative of a·x is a·x²/2; evaluate between c and b.',
    template: ['∫ from', S, 'to', S, '(', S, '· x ) dx'], evaluate: evalIntegral, target: 24,
    tokens: ['1', '6', '5', '7', '2', '4'],
  }),
  room(5, 5, {
    id: 'grand-combinatorics', name: 'Combinatorics', symbol: 'C', subtitle: 'C(n, k)',
    rule: 'How many ways to choose k out of n?',
    template: ['C(', S, ',', S, ')'], evaluate: EV.combinations, target: 15,
    tokens: ['6', '3', '2', '5', '4'],
  }),
  room(6, 6, {
    id: 'grand-pythagoras', name: 'Pythagorean Triple', symbol: '◺', subtitle: 'a² + b² = c²',
    rule: 'Find a right triangle with whole-number sides and the given hypotenuse.',
    template: ['c = √(', S, '² +', S, '²)'], evaluate: EV.pythagoras, target: 13,
    tokens: ['3', '12', '4', '13', '5', '6'],
  }),
  room(7, 7, {
    id: 'grand-logarithm', name: 'Logarithm Challenge', symbol: 'log', subtitle: 'log_b(x)',
    rule: 'Which base and number give the target exponent?',
    template: ['log base', S, 'of', S], evaluate: EV.logarithm, target: 4,
    tokens: ['3', '16', '5', '81', '2', '9'],
  }),
  room(8, 2, {
    id: 'grand-final', name: 'Final Exam', symbol: '∎', subtitle: 'everything you know',
    rule: 'The final proof: any correct expression of up to 5 symbols that equals the target.',
    template: [S, S, S, S, S], evaluate: evalArith, target: 100, time: 55,
    tokens: ['9', '×', '19', '+', '9', '−', '8', '÷', '2'],
  }),
);
