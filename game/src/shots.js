// The screenshot scenes behind ?shot=start|play|end. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot:
// a breadth-first path across the gallery floor to the nearest relic (or
// the exit, once it is open), sneaking whenever a guard is close or
// suspicious, waiting in place when a guard is looking straight at Wren.
// The frame is what a short game really looks like, and the same seed
// always gives the same frame.
import { COLS, ROWS, STEP } from './config.js';
import { isSolid } from './level.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 16;
const SNEAK_SECONDS = 40;
const END_LIMIT_SECONDS = 220;

/** Shortest walkable path between two tiles, as tile centres, or null. */
function findPath(fromCol, fromRow, toCol, toRow) {
  const key = (col, row) => row * COLS + col;
  const seen = new Map();
  const queue = [{ col: fromCol, row: fromRow }];
  seen.set(key(fromCol, fromRow), null);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.col === toCol && current.row === toRow) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift(node);
        node = seen.get(key(node.col, node.row));
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const col = current.col + dc;
      const row = current.row + dr;
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
      if (isSolid(col, row) || seen.has(key(col, row))) continue;
      seen.set(key(col, row), current);
      queue.push({ col, row });
    }
  }
  return null;
}

function nearestTarget(state) {
  for (const relic of state.relics) {
    if (!relic.taken) return relic;
  }
  return state.exitOpen ? state.exit : null;
}

/** Where Wren should head, and whether to sneak getting there. */
function autopilot(state) {
  const player = state.player;
  const target = nearestTarget(state);
  if (!target) return { x: 0, y: 0, sneak: true };
  const fromCol = Math.floor(player.x / 40);
  const fromRow = Math.floor(player.y / 40);
  const toCol = Math.floor(target.x / 40);
  const toRow = Math.floor(target.y / 40);
  const path = findPath(fromCol, fromRow, toCol, toRow);
  if (!path || path.length < 2) return { x: 0, y: 0, sneak: true };
  const next = path[1];
  const waypoint = { x: (next.col + 0.5) * 40, y: (next.row + 0.5) * 40 };
  const dx = waypoint.x - player.x;
  const dy = waypoint.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  // Sneak when any guard is already wary, or close enough to notice.
  let sneak = state.alarm > 30;
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - player.x, guard.y - player.y) < 210) sneak = true;
  }
  return { x: dx / length, y: dy / length, sneak };
}

/**
 * Set `world` to the named scene (start, play, sneak or end; any other name
 * is start) and return the screen to draw over it and the best score to
 * show. The play scene stops mid-heist, while the sneak scene runs until a
 * guard is properly wary of Wren — the near-miss the game is about.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'sneak' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, true, null);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'sneak' ? SNEAK_SECONDS : PLAY_SECONDS;
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world.state);
    events = world.step(STEP, { x: move.x, y: move.y }, move.sneak, null);
    if (events & (EVENT_WIN | EVENT_OVER)) break;
    // The sneak scene freezes the frame at the tense moment: a guard
    // halfway to certain, Wren holding still in the edge of its cone.
    if (name === 'sneak' && world.state.alarm >= 45) break;
  }
  if (world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
  if (world.state.over) return { screen: SCREEN_OVER, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}
