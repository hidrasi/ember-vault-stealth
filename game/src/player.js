// Wren, the thief: eight-way movement, sneaking, and the pebble toss.
// Sneaking is slow and quiet; walking is the middle ground; there is no
// sprint — a thief who runs is a thief who gets heard.
import { PEBBLE, PLAYER } from './config.js';
import { moveCircle, tileAtPx } from './level.js';

export function createPlayer(startX, startY) {
  const player = {
    x: startX,
    y: startY,
    facingX: 1,
    facingY: 0,
    sneaking: false,
    running: false,
    pebbles: PEBBLE.count,
    // Seconds since the last footstep sound: the world asks for the beat.
    stepClock: 0,
    stepDue: false,
    moving: false,
  };

  /**
   * One fixed step. `move` is {x, y} of unit length at most, `sneak` holds
   * Shift. Returns nothing; the world reads `moving`, `sneaking` and
   * `stepDue` off the player afterwards.
   */
  function step(dt, move, sneak) {
    player.sneaking = sneak;
    player.running = false;
    const length = Math.hypot(move.x, move.y);
    player.moving = length > 0.01;
    if (player.moving) {
      const nx = move.x / (length || 1);
      const ny = move.y / (length || 1);
      player.facingX = nx;
      player.facingY = ny;
      const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      const moved = moveCircle(player.x, player.y, nx * speed * dt, ny * speed * dt, PLAYER.radius);
      player.x = moved.x;
      player.y = moved.y;
      player.stepClock -= dt;
      if (player.stepClock <= 0) {
        player.stepDue = true;
        player.stepClock = sneak ? 0.62 : 0.42;
      }
    } else {
      player.stepClock = 0;
    }
  }

  /** Where a thrown pebble should land: the clicked point, clamped in range. */
  function throwPebble(targetX, targetY) {
    if (player.pebbles <= 0) return null;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.hypot(dx, dy);
    const reach = 320;
    const scale = distance > reach ? reach / distance : 1;
    player.pebbles -= 1;
    return { x: player.x + dx * scale, y: player.y + dy * scale, t: 0 };
  }

  function reset(x, y) {
    player.x = x;
    player.y = y;
    player.facingX = 1;
    player.facingY = 0;
    player.sneaking = false;
    player.pebbles = PEBBLE.count;
    player.stepClock = 0;
    player.stepDue = false;
    player.moving = false;
  }

  function tile() {
    return tileAtPx(player.x, player.y);
  }

  return { player, step, throwPebble, reset, tile };
}
