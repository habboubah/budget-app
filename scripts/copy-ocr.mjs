#!/usr/bin/env node
/**
 * Puts the on-device text recognition (tesseract.js) into public/ocr/, so the
 * app reads photos without any network: the worker, the SIMD core (every
 * engine the app runs in has WebAssembly SIMD) and the German model (it reads
 * English bank statements too). Run before dev and build; public/ocr/ is
 * generated, not committed.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'ocr');
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz', 'deu.traineddata.gz'],
];
mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  const src = join(root, from);
  const dst = join(out, to);
  if (!existsSync(src)) throw new Error(`Missing ${from} — run npm install`);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
}
