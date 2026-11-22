// The game's rules and state, with no drawing and no browser in it: the
// thief, the guards, the relics, the exit, the pebbles in the air, the
// alarm, the score. step() advances one fixed step and returns what
// happened as bit flags, so the caller can react — and play sounds —
// without the world knowing about screens or speakers.
import { FIELD, GUARD, LIVES, PEBBLE, PLAYER, RELICS_NEEDED, SCORE, STEP } from './config.js';
import { createGuards } from './guards.js';
import { createPlayer } from './player.js';
import { findTiles, isHiddenPx, tileAtPx, tileCenter, TILE_EXIT, TILE_RELIC, TILE_START } from './level.js';
import { createRandom } from './random.js';
import { GUARDS } from './config.js';

export const EVENT_RELIC = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_PEBBLE = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_STEP = 64;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(random) {
  const startTile = findTiles(TILE_START)[0];
  const start = tileCenter(startTile.col, startTile.row);
  const exitTile = findTiles(TILE_EXIT)[0];
  const exit = tileCenter(exitTile.col, exitTile.row);
  const relicTiles = findTiles(TILE_RELIC);
  const guards = createGuards(GUARDS);
  const playerApi = createPlayer(start.x, start.y);
  const player = playerApi.player;

  const relics = relicTiles.map((tile) => {
    const centre = tileCenter(tile.col, tile.row);
    return { x: centre.x, y: centre.y, taken: false, bob: random() * Math.PI * 2 };
  });

  const state = {
    player,
    guards: guards.guards,
    relics,
    exit,
    pebbles: [],
    score: 0,
    lives: LIVES,
    relicsTaken: 0,
    spotted: 0,
    elapsed: 0,
    exitOpen: false,
    won: false,
    over: false,
    // Loudest suspicion any guard holds right now, 0..100: the alarm bar.
    alarm: 0,
  };

  function reset() {
    playerApi.reset(start.x, start.y);
    guards.reset();
    for (const relic of relics) relic.taken = false;
    state.pebbles = [];
    state.score = 0;
    state.lives = LIVES;
    state.relicsTaken = 0;
    state.spotted = 0;
    state.elapsed = 0;
    state.exitOpen = false;
    state.won = false;
    state.over = false;
    state.alarm = 0;
  }

  function respawn() {
    playerApi.reset(start.x, start.y);
    guards.reset();
    state.alarm = 0;
  }

  /**
   * One fixed step. `move` is the player's wished direction (unit at most),
   * `sneak` holds Shift, `throwAt` is a point to toss a pebble at, or null.
   */
  function step(dt, move, sneak, throwAt) {
    let events = 0;
    if (state.won || state.over) return events;
    state.elapsed += dt;

    if (throwAt) {
      const pebble = playerApi.throwPebble(throwAt.x, throwAt.y);
      if (pebble) {
        state.pebbles.push(pebble);
        events |= EVENT_PEBBLE;
      }
    }

    playerApi.step(dt, move, sneak);
    if (player.stepDue) {
      player.stepDue = false;
      events |= EVENT_STEP;
      // A walking thief can be heard: guards in earshot turn to listen.
      const earshot = sneak ? PLAYER.stepQuiet : PLAYER.stepLoud;
      for (const guard of guards.guards) {
        if (distance(guard.x, guard.y, player.x, player.y) < earshot && !isHiddenPx(player.x, player.y)) {
          guard.lastSeenX = player.x;
          guard.lastSeenY = player.y;
          if (guard.state === 'patrol') guard.suspicion = Math.min(100, guard.suspicion + 12);
        }
      }
    }

    if (guards.step(dt, player)) {
      state.spotted += 1;
      events |= EVENT_SPOTTED;
    }
    state.alarm = guards.guards.reduce((loudest, guard) => Math.max(loudest, guard.suspicion), 0);

    // Pebbles fly, land, and ring: guards in earshot go to look.
    for (let index = state.pebbles.length - 1; index >= 0; index -= 1) {
      const pebble = state.pebbles[index];
      pebble.t += dt;
      if (pebble.t >= 0.45) {
        state.pebbles.splice(index, 1);
        guards.hearNoise(pebble.x, pebble.y, PEBBLE.noiseRadius);
      }
    }

    // Relics: walk over one to pocket it. The exit opens on the last one.
    for (const relic of relics) {
      if (relic.taken) continue;
      if (distance(player.x, player.y, relic.x, relic.y) < PLAYER.radius + 18) {
        relic.taken = true;
        state.relicsTaken += 1;
        state.score += SCORE.relic;
        player.pebbles = Math.min(PEBBLE.count + 2, player.pebbles + 1);
        events |= EVENT_RELIC;
        if (state.relicsTaken >= RELICS_NEEDED) state.exitOpen = true;
      }
    }

    // Caught: a chasing guard that reaches you costs a life.
    for (const guard of guards.guards) {
      if (guard.state !== 'chase') continue;
      if (distance(guard.x, guard.y, player.x, player.y) < GUARD.catchDistance) {
        state.lives -= 1;
        events |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        } else {
          respawn();
        }
        break;
      }
    }

    // The exit: step into the green door with every relic, and you are out.
    if (state.exitOpen && !state.over) {
      if (distance(player.x, player.y, exit.x, exit.y) < 30) {
        state.won = true;
        state.score += SCORE.win;
        state.score += Math.max(0, SCORE.timeBonus - Math.floor(state.elapsed) * SCORE.timePenaltyPerSecond);
        state.score -= state.spotted * SCORE.spottedPenalty;
        state.score = Math.max(0, state.score);
        events |= EVENT_WIN;
      }
    }
    return events;
  }

  function rank() {
    if (state.spotted === 0) return 'GHOST';
    if (state.spotted <= 2) return 'SHADOW';
    return 'SEEN';
  }

  reset();
  return { state, reset, step, rank, guards, player: playerApi };
}
