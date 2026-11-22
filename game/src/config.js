// Ember Vault — every tuning number, colour and the level in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. One tile is 40 px:
// the gallery is 32 tiles wide and 18 tiles tall.
//
// Map legend: '#' wall, '.' floor, 'C' crate (blocks sight and movement),
// 'B' shadow bush (blocks sight, hides you, you can walk through it),
// 'R' ember relic, 'E' exit door, 'S' where Wren starts.
export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const MAP = [
  '################################',
  '#S....#........B.......#......R#',
  '#.....#................#.......#',
  '#..C..#....####....C...#...C...#',
  '#.....#....#..#........#.......#',
  '#.....#....#..#....B...#...#...#',
  '#..B.......#..#........#...#...#',
  '#.....#####....#####...#...#...#',
  '#..............................#',
  '#..C......#....B....#......#...#',
  '#.........#.........#......#..R#',
  '#....B....#....C....#..C...#...#',
  '#.........#.........#......#...#',
  '#..####...#....####..#.....#...#',
  '#.....#.......#....#......B....#',
  '#..#..#...C...#....#....C......#',
  '#..#R.#.......#....#......E....#',
  '################################',
];

// Patrol loops, as tile coordinates. Each guard walks its loop, pausing at
// every corner to look around, then turns and walks on.
export const GUARDS = [
  { name: 'Vesper', waypoints: [[9, 1], [20, 1], [20, 2], [9, 2]], speed: 88, pause: 1.1 },
  { name: 'Marlowe', waypoints: [[5, 9], [14, 9], [14, 11], [5, 11]], speed: 82, pause: 1.4 },
  { name: 'Sable', waypoints: [[26, 9], [26, 13], [30, 13], [30, 9]], speed: 94, pause: 0.9 },
  { name: 'Ivo', waypoints: [[2, 14], [5, 14], [5, 15], [2, 15]], speed: 76, pause: 1.6 },
];

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 96,
  // How far a running footstep carries: guards inside this ring turn to listen.
  stepLoud: 150,
  stepQuiet: 70,
};

export const GUARD = {
  radius: 14,
  // Vision cone: how far a guard sees, and half its opening angle.
  viewRange: 260,
  viewHalfAngle: 0.61,
  chaseSpeed: 158,
  // Suspicion 0..100. Rates per second; sneaking and distance slow it down.
  suspicionRate: 68,
  suspicionDecay: 20,
  sneakFactor: 0.45,
  runFactor: 1.5,
  // A guard that loses you investigates where it last saw you, then gives up.
  investigateTime: 3.2,
  catchDistance: 26,
};

export const PEBBLE = {
  count: 4,
  // Guards inside this ring of where a pebble lands go to look.
  noiseRadius: 190,
  throwSpeed: 520,
};

export const LIVES = 3;
export const RELICS_NEEDED = 3;

export const SCORE = {
  relic: 500,
  win: 1000,
  timeBonus: 600,
  timePenaltyPerSecond: 2,
  spottedPenalty: 150,
};

export const PALETTE = {
  backdrop: '#07080d',
  floorA: '#1c2130',
  floorB: '#181d2b',
  floorEdge: '#232a3d',
  wall: '#39415e',
  wallTop: '#4a5478',
  crate: '#6b4a2a',
  crateEdge: '#8a6238',
  bush: '#14301f',
  bushLeaf: '#1e4d2c',
  exit: '#39d98a',
  exitDark: '#0e5c34',
  relic: '#ff9a3c',
  relicGlow: '#ffb347',
  player: '#4fd8ff',
  playerDark: '#1b7ea6',
  guard: '#ff5a4e',
  guardDark: '#a32e26',
  cone: '#ffd23c',
  coneAlert: '#ff3b30',
  lamp: '#ffe9a8',
  panel: '#12161f',
  text: '#eef1f5',
  muted: '#9aa3b5',
  danger: '#ff5a4e',
  ok: '#39d98a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-vault.best';
