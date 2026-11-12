#!/usr/bin/env node
/**
 * Puts the on-device text recognition (tesseract.js) into public/ocr/, so the
 * app reads photos without any network: the worker, the SIMD core (every
 * engine the app runs in has WebAssembly SIMD) and the German model (it reads
 * English bank statements too). The Vite config runs it for dev and every
 * build; public/ocr/ is generated, not committed.
 *
 * When the packages are missing (a checkout that hasn't run `npm install`
 * since they were added), it installs them once. If that fails, the dev
 * server still starts — only reading photos won't work — while a build
 * (`--strict`) stops, so no app ships without it.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const strict = process.argv.includes('--strict');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'ocr');
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz', 'deu.traineddata.gz'],
];
const missing = () => files.filter(([from]) => !existsSync(join(root, from)));

if (missing().length) {
  console.log('\nHaushaltsbuch Einfach: the photo reader (tesseract.js) is not installed yet — running npm install once …\n');
  try {
    execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
  } catch {
    // Reported below.
  }
}

const still = missing();
if (still.length) {
  const msg = `Haushaltsbuch Einfach: ${still.map(([from]) => from).join(', ')} missing — run "npm install". Reading photos won't work until then.`;
  if (strict) throw new Error(msg);
  console.warn(`\n⚠️  ${msg}\n`);
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  const src = join(root, from);
  const dst = join(out, to);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
}
