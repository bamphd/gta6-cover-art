// Neon Cover Studio: hands the app in for gta6-cover-art-01.
// Node 22, standard library only. It copies this repository's app/ and
// screenshots/ into the output directory and writes dossier.json there
// with the kit's vendored buildDossier. Outside the grader, the
// MAKEFUN_OUTPUT_DIR environment variable stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function handIn() {
  const appDir = join(root, 'app');
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  if (!existsSync(shotsDir) || readdirSync(shotsDir).length === 0) {
    fail('screenshots/ is empty');
  }
  mkdirSync(out, { recursive: true });
  cpSync(appDir, join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
  // The gate's caps, as the scorer states them: the dossier text is
  // capped at 160 KiB, at most 4 screenshots of 256 KiB each, and
  // app/ holds at most 993 files and 48 MiB in all.
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`handed in app/ and screenshots/ to ${out}`);
}

handIn();
