// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. The gallery is drawn top-down:
// floor tiles, walls, crates and shadow bushes, the glowing exit, the
// ember relics — then the night itself, a dark overlay with pools of
// lamplight and a halo around Wren, then the guards with their vision
// cones on top of the dark, so a cone reads at a glance. Flat shapes and
// canvas text for the HUD and the panels.
import { COLS, FIELD, FONT, GUARD, LIVES, MAP, PALETTE, ROWS, TILE } from './config.js';
import { GUARD_CHASE, GUARD_SEARCH, GUARD_SUSPICIOUS } from './guards.js';
import { isHiddenPx } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const LAMPS = [
  { x: 320, y: 180, r: 170 },
  { x: 960, y: 180, r: 170 },
  { x: 320, y: 540, r: 170 },
  { x: 960, y: 540, r: 170 },
  { x: 640, y: 360, r: 200 },
];

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const relicLabel = cachedLabel('');
  const timeLabel = cachedLabel('');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function tileXY(col, row) {
    return { x: col * TILE, y: row * TILE };
  }

  function drawFloor() {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const { x, y } = tileXY(col, row);
        const tile = MAP[row][col];
        if (tile === '#') continue;
        context.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(x, y, TILE, TILE);
        context.fillStyle = PALETTE.floorEdge;
        context.fillRect(x, y, TILE, 1);
        context.fillRect(x, y, 1, TILE);
      }
    }
  }

  function drawWalls() {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (MAP[row][col] !== '#') continue;
        const { x, y } = tileXY(col, row);
        context.fillStyle = PALETTE.wall;
        context.fillRect(x, y, TILE, TILE);
        context.fillStyle = PALETTE.wallTop;
        context.fillRect(x, y, TILE, 5);
      }
    }
  }

  function drawProps(state) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = MAP[row][col];
        const { x, y } = tileXY(col, row);
        if (tile === 'C') {
          context.fillStyle = PALETTE.crate;
          context.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          context.strokeStyle = PALETTE.crateEdge;
          context.lineWidth = 2;
          context.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          context.beginPath();
          context.moveTo(x + 3, y + 3);
          context.lineTo(x + TILE - 3, y + TILE - 3);
          context.moveTo(x + TILE - 3, y + 3);
          context.lineTo(x + 3, y + TILE - 3);
          context.stroke();
        } else if (tile === 'B') {
          context.fillStyle = PALETTE.bush;
          context.beginPath();
          context.arc(x + 12, y + 14, 12, 0, Math.PI * 2);
          context.arc(x + 28, y + 12, 11, 0, Math.PI * 2);
          context.arc(x + 20, y + 28, 12, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = PALETTE.bushLeaf;
          context.beginPath();
          context.arc(x + 12, y + 14, 6, 0, Math.PI * 2);
          context.arc(x + 28, y + 12, 5, 0, Math.PI * 2);
          context.arc(x + 20, y + 28, 6, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    // The exit door: green and glowing once every relic is pocketed.
    const exit = state.exit;
    const glow = state.exitOpen ? 1 : 0.35;
    context.save();
    context.globalAlpha = glow;
    context.fillStyle = PALETTE.exit;
    context.beginPath();
    context.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = state.exitOpen ? PALETTE.exit : PALETTE.exitDark;
    context.fillRect(exit.x - 13, exit.y - 16, 26, 32);
    context.fillStyle = '#06281a';
    context.font = `bold 20px ${FONT}`;
    context.textAlign = 'center';
    context.fillText(state.exitOpen ? 'EXIT' : 'LOCK', exit.x, exit.y - 22);

    // The ember relics: small suns that pulse.
    const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3);
    for (const relic of state.relics) {
      if (relic.taken) continue;
      context.save();
      context.globalAlpha = 0.35 * pulse;
      context.fillStyle = PALETTE.relicGlow;
      context.beginPath();
      context.arc(relic.x, relic.y, 26 * pulse, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = PALETTE.relic;
      context.beginPath();
      context.moveTo(relic.x, relic.y - 12);
      context.lineTo(relic.x + 9, relic.y);
      context.lineTo(relic.x, relic.y + 12);
      context.lineTo(relic.x - 9, relic.y);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff3d6';
      context.beginPath();
      context.arc(relic.x, relic.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPatrolPaths(state) {
    context.save();
    context.setLineDash([4, 10]);
    context.strokeStyle = 'rgba(154, 163, 181, 0.28)';
    context.lineWidth = 2;
    for (const guard of state.guards) {
      context.beginPath();
      guard.waypoints.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.stroke();
    }
    context.restore();
  }

  /** The night: darkness with pools of lamplight and a halo around Wren.
   *  Painted on a spare canvas first, so the holes cut only the dark. */
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = FIELD.width;
  nightCanvas.height = FIELD.height;
  const night = nightCanvas.getContext('2d');

  function drawNight(state) {
    night.setTransform(1, 0, 0, 1, 0, 0);
    night.clearRect(0, 0, FIELD.width, FIELD.height);
    night.fillStyle = 'rgba(4, 5, 10, 0.42)';
    night.fillRect(0, 0, FIELD.width, FIELD.height);
    night.globalCompositeOperation = 'destination-out';
    const holes = [...LAMPS, { x: state.player.x, y: state.player.y, r: 150 }];
    for (const hole of holes) {
      const gradient = night.createRadialGradient(hole.x, hole.y, 10, hole.x, hole.y, hole.r);
      gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      night.fillStyle = gradient;
      night.beginPath();
      night.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      night.fill();
    }
    night.globalCompositeOperation = 'source-over';
    context.drawImage(nightCanvas, 0, 0);
  }

  function drawCone(guard) {
    const range = GUARD.viewRange;
    const half = GUARD.viewHalfAngle;
    const alerted = guard.state === GUARD_CHASE || guard.suspicion >= 55;
    context.save();
    context.globalAlpha = guard.state === GUARD_CHASE ? 0.5 : 0.34;
    context.fillStyle = alerted ? PALETTE.coneAlert : PALETTE.cone;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.facing - half, guard.facing + half);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawGuard(guard) {
    drawCone(guard);
    context.fillStyle = PALETTE.guardDark;
    context.beginPath();
    context.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
    context.fill();
    // The direction the guard faces: a pale visor slit.
    context.fillStyle = '#ffd9d4';
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.text;
    context.font = `bold 13px ${FONT}`;
    context.textAlign = 'center';
    context.fillText(guard.name, guard.x, guard.y - 22);
    if (guard.suspicion >= 55 || guard.state === GUARD_CHASE) {
      context.font = `bold 26px ${FONT}`;
      context.fillStyle = guard.state === GUARD_CHASE ? PALETTE.coneAlert : PALETTE.cone;
      context.fillText('!', guard.x, guard.y - 34);
    } else if (guard.state === GUARD_SEARCH) {
      context.font = `bold 22px ${FONT}`;
      context.fillStyle = PALETTE.cone;
      context.fillText('?', guard.x, guard.y - 34);
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (isHiddenPx(player.x, player.y)) {
      context.save();
      context.globalAlpha = 0.55;
      context.strokeStyle = PALETTE.ok;
      context.setLineDash([5, 5]);
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, 24, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      text('HIDDEN', player.x, player.y - 26, 13, PALETTE.ok, 'center');
    }
    // A hooded cloak: a triangle pointing where Wren faces, a bright hood.
    const facingAngle = Math.atan2(player.facingY, player.facingX);
    const tipX = player.x + Math.cos(facingAngle) * 19;
    const tipY = player.y + Math.sin(facingAngle) * 19;
    const baseX = player.x - Math.cos(facingAngle) * 10;
    const baseY = player.y - Math.sin(facingAngle) * 10;
    const perpX = Math.cos(facingAngle + Math.PI / 2) * 11;
    const perpY = Math.sin(facingAngle + Math.PI / 2) * 11;
    context.fillStyle = PALETTE.playerDark;
    context.beginPath();
    context.moveTo(tipX, tipY);
    context.lineTo(baseX + perpX, baseY + perpY);
    context.lineTo(baseX - perpX, baseY - perpY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0b2b38';
    context.beginPath();
    context.arc(player.x + player.facingX * 4, player.y + player.facingY * 4, 4, 0, Math.PI * 2);
    context.fill();

    for (const pebble of state.pebbles) {
      context.fillStyle = '#d7dce6';
      context.beginPath();
      context.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(215, 220, 230, 0.5)';
      context.beginPath();
      context.arc(pebble.x, pebble.y, 8 + pebble.t * 40, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 26, 26, PALETTE.text, 'left');
    text(relicLabel(`Relics ${state.relicsTaken} / 3`), FIELD.width / 2 - 130, 26, 26, PALETTE.relic, 'center');
    const minutes = Math.floor(state.elapsed / 60);
    const seconds = Math.floor(state.elapsed % 60);
    text(timeLabel(`${minutes}:${String(seconds).padStart(2, '0')}`), FIELD.width / 2 + 130, 26, 26, PALETTE.text, 'center');
    text(`Pebbles ${state.player.pebbles}`, FIELD.width - 24, 26, 26, PALETTE.text, 'right');

    // Lives: three little masks, filled while you have them.
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.player : '#2a3040';
      context.beginPath();
      context.arc(FIELD.width - 24 - life * 30, 62, 9, 0, Math.PI * 2);
      context.fill();
    }
    // The alarm bar: how sure the most suspicious guard is.
    const barWidth = 220;
    const barX = (FIELD.width - barWidth) / 2;
    context.fillStyle = '#0b0e16';
    context.fillRect(barX, 52, barWidth, 12);
    const alarmColour = state.alarm < 40 ? PALETTE.ok : state.alarm < 75 ? PALETTE.cone : PALETTE.danger;
    context.fillStyle = alarmColour;
    context.fillRect(barX, 52, (barWidth * state.alarm) / 100, 12);
    text(state.alarm >= 100 ? 'SPOTTED!' : state.alarm >= 55 ? 'SUSPICIOUS' : 'UNSEEN', FIELD.width / 2, 82, 15, alarmColour, 'center');
    if (state.exitOpen) text('EXIT OPEN — slip out the green door', FIELD.width / 2, 92, 17, PALETTE.ok, 'center');
    else text('Steal 3 ember relics, then reach the exit unseen', FIELD.width / 2, 92, 17, PALETTE.muted, 'center');
    void best;
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(7, 8, 13, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.wallTop;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.relic, 'center');
  }

  /** Paint one frame: the gallery, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawPatrolPaths(state);
    drawProps(state);
    drawWalls();
    drawNight(state);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'EMBER VAULT',
        [
          'A shadow heist in the Ember Gallery.',
          'Steal 3 ember relics. Reach the green exit unseen.',
          'Move with WASD or arrows. Hold Shift to sneak.',
          'Click to toss a pebble and pull a guard away.',
          'Hide in the shadow bushes. Mind the vision cones.',
          bestLabel(best),
        ],
        'Press Space or click to begin the heist',
      );
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to slip back into the dark');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Caught in the Dark', [`Score ${state.score}`, `Relics ${state.relicsTaken} / 3`, bestLabel(best)], 'Press Space or click to try again');
    } else if (screen === SCREEN_WIN) {
      const rank = state.spotted === 0 ? 'GHOST' : state.spotted <= 2 ? 'SHADOW' : 'SEEN';
      drawPanel(
        'Clean Getaway',
        [
          `Score ${state.score}  ·  Rank ${rank}`,
          `Time ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}  ·  Spotted ${state.spotted} time${state.spotted === 1 ? '' : 's'}`,
          `Relics ${state.relicsTaken} / 3  ·  Lives left ${state.lives}`,
          bestLabel(best),
        ],
        'Press Space or click to run it again',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
