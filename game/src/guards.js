// The guards: patrol loops, vision cones, suspicion, and what a guard does
// once it has seen you — chase, lose you, search where you were, give up.
// A guard never knows where you are unless its cone and its line of sight
// both reach you, and suspicion always gives you a chance to slip away.
import { GUARD, TILE } from './config.js';
import { hasLineOfSight, isHiddenPx, tileCenter } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_SEARCH = 'search';

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function turnToward(angle, target, maxTurn) {
  const diff = angleDifference(target, angle);
  if (Math.abs(diff) <= maxTurn) return target;
  return angle + Math.sign(diff) * maxTurn;
}

export function createGuards(definitions) {
  const guards = definitions.map((definition, index) => {
    const start = tileCenter(definition.waypoints[0][0], definition.waypoints[0][1]);
    return {
      id: index,
      name: definition.name,
      x: start.x,
      y: start.y,
      facing: 0,
      speed: definition.speed,
      pause: definition.pause,
      waypoints: definition.waypoints.map(([col, row]) => tileCenter(col, row)),
      waypointIndex: 1,
      wait: 0,
      state: GUARD_PATROL,
      // 0..100: how sure this guard is that someone is there.
      suspicion: 0,
      lastSeenX: start.x,
      lastSeenY: start.y,
      searchTime: 0,
      // Set when the guard first reaches full suspicion this alert.
      spotted: false,
    };
  });

  /**
   * Can this guard see the player right now? Inside the cone, inside range,
   * a clear line of sight — and never through a shadow bush, unless the
   * guard is close enough to hear the leaves move.
   */
  function canSee(guard, playerX, playerY) {
    const dx = playerX - guard.x;
    const dy = playerY - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GUARD.viewRange) return 0;
    if (isHiddenPx(playerX, playerY) && distance > 52) return 0;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angle, guard.facing)) > GUARD.viewHalfAngle) return 0;
    if (!hasLineOfSight(guard.x, guard.y, playerX, playerY)) return 0;
    // Closer and more central is easier to spot.
    const closeness = 1 - distance / GUARD.viewRange;
    const centrality = 1 - Math.abs(angleDifference(angle, guard.facing)) / GUARD.viewHalfAngle;
    return 0.35 + 0.65 * (0.5 * closeness + 0.5 * centrality);
  }

  /** A noise at (x, y): the nearest guards in earshot go to look. */
  function hearNoise(x, y, radius) {
    for (const guard of guards) {
      if (guard.state === GUARD_CHASE) continue;
      if (Math.hypot(guard.x - x, guard.y - y) > radius) continue;
      guard.state = GUARD_SEARCH;
      guard.lastSeenX = x;
      guard.lastSeenY = y;
      guard.searchTime = GUARD.investigateTime;
      guard.suspicion = Math.max(guard.suspicion, 45);
    }
  }

  function walkToward(guard, targetX, targetY, speed, dt) {
    const dx = targetX - guard.x;
    const dy = targetY - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) return true;
    const wanted = Math.atan2(dy, dx);
    guard.facing = turnToward(guard.facing, wanted, 5.2 * dt);
    const step = Math.min(distance, speed * dt);
    guard.x += Math.cos(guard.facing) * step;
    guard.y += Math.sin(guard.facing) * step;
    return distance - step < 2;
  }

  /**
   * One fixed step. `player` carries x, y, sneaking and running. Returns
   * true when a guard has just reached full suspicion for the first time
   * this alert (the world counts it as being spotted).
   */
  function step(dt, player) {
    let newlySpotted = false;
    for (const guard of guards) {
      const visibility = canSee(guard, player.x, player.y);
      if (visibility > 0) {
        let rate = GUARD.suspicionRate * visibility;
        if (player.sneaking) rate *= GUARD.sneakFactor;
        if (player.running) rate *= GUARD.runFactor;
        guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
        guard.lastSeenX = player.x;
        guard.lastSeenY = player.y;
        if (guard.suspicion >= 100 && guard.state !== GUARD_CHASE) {
          guard.state = GUARD_CHASE;
          if (!guard.spotted) {
            guard.spotted = true;
            newlySpotted = true;
          }
        } else if (guard.state === GUARD_PATROL && guard.suspicion >= 55) {
          guard.state = GUARD_SUSPICIOUS;
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
        if (guard.state === GUARD_SUSPICIOUS && guard.suspicion < 25) guard.state = GUARD_PATROL;
      }

      if (guard.state === GUARD_PATROL) {
        const target = guard.waypoints[guard.waypointIndex];
        if (guard.wait > 0) {
          guard.wait -= dt;
          guard.facing = turnToward(guard.facing, guard.facing + 1.6 * dt, 1.6 * dt);
        } else if (walkToward(guard, target.x, target.y, guard.speed, dt)) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.wait = guard.pause;
        }
      } else if (guard.state === GUARD_SUSPICIOUS) {
        guard.facing = turnToward(guard.facing, angleTo(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY), 3.4 * dt);
      } else if (guard.state === GUARD_CHASE) {
        walkToward(guard, player.x, player.y, GUARD.chaseSpeed, dt);
        if (visibility === 0) {
          guard.state = GUARD_SEARCH;
          guard.searchTime = GUARD.investigateTime;
        }
      } else if (guard.state === GUARD_SEARCH) {
        if (walkToward(guard, guard.lastSeenX, guard.lastSeenY, guard.speed * 1.25, dt)) {
          guard.searchTime -= dt;
          guard.facing = turnToward(guard.facing, guard.facing + 2.2 * dt, 2.2 * dt);
          if (guard.searchTime <= 0) {
            guard.state = GUARD_PATROL;
            guard.suspicion = Math.max(0, guard.suspicion - 40);
            guard.spotted = false;
          }
        }
      }
    }
    return newlySpotted;
  }

  function reset() {
    for (const guard of guards) {
      const home = guard.waypoints[0];
      guard.x = home.x;
      guard.y = home.y;
      guard.facing = 0;
      guard.waypointIndex = 1;
      guard.wait = 0;
      guard.state = GUARD_PATROL;
      guard.suspicion = 0;
      guard.searchTime = 0;
      guard.spotted = false;
    }
  }

  return { guards, step, hearNoise, canSee, reset };
}
