// Tunable game constants. Canvas is 960x540 (logical pixels).
export const W = 960;
export const H = 540;
export const FLOOR_Y = 472;
export const CEIL_Y = 10;           // ceiling the professor lands on while gravity is flipped

// Physics (px, seconds)
export const GRAVITY = 1650;
export const JUMP_V = 600;          // apex ≈ JUMP_V² / (2·GRAVITY) ≈ 109 px
export const SPEED = 240;
export const MAX_FALL = 1050;
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;

// Rules
export const PENALTY_S = 3;         // seconds lost for a wrong token
export const ERASERS = 0;           // eraser charges at level start – more are found as pickups
export const FLIP_TIME = 3;         // seconds of flipped gravity after collecting a negative number
export const PICKUP_ON_TOUCH = false; // true = collect by touching (AGENTS.md), false = press F next to a token

export const BOUNCE_V = 900;        // yellow sponge launch speed (apex ≈ 245 px)
export const CLIMB_SPEED = 150;     // ladder climbing speed
export const DASH_SPEED = 580;      // horizontal burst speed during a dash (px/s)
export const DASH_TIME = 0.16;      // duration of a dash burst (seconds)
export const DASH_COOLDOWN = 0.65;  // cooldown between dashes (seconds)
export const CHALK_BONUS_S = 5;     // seconds gained from a chalk pickup
export const HARD_LANDING_V = 640;  // landing faster than this puffs up a chalk-dust cloud
export const EXIT_TIME = 1.8;       // length of the key + door-opening animation

// Sizes
export const TOKEN_R = 18;
export const PLAYER_W = 28;
export const PLAYER_H = 58;
export const SPRITE_H = 92;        // drawn height of a character sprite
export const PLATFORM_H = 10;

export const COLORS = {
  board: '#1b2622',
  wood: '#6e472b',
  woodLight: '#93653f',
  ink: '#24170e',
  chalk: '#f4efe6',
  chalkDim: '#9fb0a5',
  gold: '#ffd678',
  red: '#eb6a5f',
  green: '#86e39a',
  violet: '#c9a2ff',
  tweed: '#6b5b3a',
  tweedDark: '#4f4229',
  skin: '#efd2ae',
};

export const CHALK_FONT = '"Segoe Print", "Comic Sans MS", "Chalkboard SE", cursive';
export const MATH_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
