// main.ts — the entrypoint for "Lantern Light" (Node 22, stdlib only).
//
// The game itself is plain static files under game/ (index.html plus its ES
// modules, all art drawn on canvas, all sound synthesised — nothing is
// fetched over the network). This program hands the entry in: it copies
// game/ and screenshots/ from beside this file into the output directory
// and writes dossier.json there with the vendored make.fun library.
//
// Run it locally to check the hand-in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes;
// the rest refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; game/ past 993 entries or 48 MiB, or a path over
// 1000 bytes — game/ shares /output's 1000-entry cap with the rest).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Lantern Light handed in: ${dossier.length} bytes of dossier in ${outDir}`);
