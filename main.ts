// Ember Vault's hand-in program (Node 22, standard library only). The game
// is this directory's game/ folder: plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library and no
// network request). The program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps: game/ holds at most 993 files and 48 MiB, the
// whole of /output at most 1000 entries and 64 MiB, and a screenshot at
// most 256 KiB. Refuse loudly here rather than hand in an entry the
// scorer would refuse.
const gameDir = join(here, 'game');
let gameFiles = 0;
let gameBytes = 0;
for (const name of readdirSync(gameDir, { recursive: true })) {
  const path = join(gameDir, name);
  if (!statSync(path).isFile()) continue;
  gameFiles += 1;
  gameBytes += statSync(path).size;
}
if (gameFiles > 993) throw new Error(`game/ holds ${gameFiles} files, over the 993-file cap`);
if (gameBytes > 50331648) throw new Error(`game/ holds ${gameBytes} bytes, over the 48 MiB cap`);
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Ember Vault handed in: ${gameFiles} game files, ${gameBytes} bytes.`);
