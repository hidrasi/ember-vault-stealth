// The gallery floor: the tile map from config, turned into questions the
// rules ask — is this tile solid, does it block a guard's sight, is the
// player hidden in shadow here — and a line-of-sight test between two points.
import { COLS, MAP, ROWS, TILE } from './config.js';

export const TILE_WALL = '#';
export const TILE_FLOOR = '.';
export const TILE_CRATE = 'C';
export const TILE_BUSH = 'B';
export const TILE_RELIC = 'R';
export const TILE_EXIT = 'E';
export const TILE_START = 'S';

function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return TILE_WALL;
  return MAP[row][col];
}

export function tileAtPx(x, y) {
  return tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
}

/** A tile a body cannot walk through: walls and crates. Bushes you can slip through. */
export function isSolid(col, row) {
  const tile = tileAt(col, row);
  return tile === TILE_WALL || tile === TILE_CRATE;
}

export function isSolidPx(x, y) {
  return isSolid(Math.floor(x / TILE), Math.floor(y / TILE));
}

/** A tile that stops a guard's gaze: walls and crates. Bushes stop it too. */
export function blocksSight(col, row) {
  const tile = tileAt(col, row);
  return tile === TILE_WALL || tile === TILE_CRATE || tile === TILE_BUSH;
}

/** Standing in a bush hides you from every guard further than a whisper away. */
export function isHiddenPx(x, y) {
  return tileAtPx(x, y) === TILE_BUSH;
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

/** Every tile of a kind, as {col, row} pairs, in reading order. */
export function findTiles(kind) {
  const found = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (MAP[row][col] === kind) found.push({ col, row });
    }
  }
  return found;
}

/**
 * True when nothing blocks sight between two points. Samples along the
 * segment every few pixels; a sample inside a sight-blocking tile ends it.
 * The tiles the two points stand on never block their own gaze.
 */
export function hasLineOfSight(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let step = 1; step < steps; step += 1) {
    const x = ax + (dx * step) / steps;
    const y = ay + (dy * step) / steps;
    if (blocksSight(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/** Push a circle out of solid tiles, axis by axis, so it slides along walls. */
export function moveCircle(x, y, dx, dy, radius) {
  let nextX = x + dx;
  if (
    isSolidPx(nextX + Math.sign(dx) * radius, y - radius + 1) ||
    isSolidPx(nextX + Math.sign(dx) * radius, y + radius - 1)
  ) {
    nextX = x;
  }
  let nextY = y + dy;
  if (
    isSolidPx(nextX - radius + 1, nextY + Math.sign(dy) * radius) ||
    isSolidPx(nextX + radius - 1, nextY + Math.sign(dy) * radius)
  ) {
    nextY = y;
  }
  return { x: nextX, y: nextY };
}
