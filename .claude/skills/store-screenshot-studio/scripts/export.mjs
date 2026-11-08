#!/usr/bin/env node
// Every slide x locale x target, at exact store pixel sizes.
// Output: <outDir>/<target>/<locale>/<NN>-<slide>.<ext>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { cfg, root, launchArgs, slideData, shoot, die } from './render.mjs';

const outDir = path.join(root, cfg.outDir);

// Only ever removes folders this script makes — a current target, or one an
// earlier config made (apple-6.9, apple-6.5, play-…) — so no stale size is left
// next to the set to upload, and a hand-made file in screenshots/store/ survives.
const ours = name => cfg.targets.some(t => t.id === name) || /^(apple|iphone|play)-/.test(name);
if (existsSync(outDir)) {
  for (const name of readdirSync(outDir)) {
    if (ours(name)) rmSync(path.join(outDir, name), { recursive: true });
  }
}

const browser = await chromium.launch({ args: launchArgs });
const written = [];

try {
  for (const target of cfg.targets) {
    for (const locale of cfg.locales) {
      const dir = path.join(outDir, target.id, locale);
      mkdirSync(dir, { recursive: true });

      for (const [i, slide] of cfg.slides.entries()) {
        const buf = await shoot(browser, slideData(slide, locale), target);
        const ext = target.format === 'jpeg' ? 'jpg' : 'png';
        const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${slide.id}.${ext}`);
        writeFileSync(file, buf);
        written.push(file);
      }
      console.log(`✓ ${target.id} / ${locale} — ${cfg.slides.length} slides`);
    }
  }
} finally {
  await browser.close();
}

if (!written.length) die('nothing was exported — screenshots.config.json has no slides or no targets.');
console.log(`\n${written.length} files in ${cfg.outDir}/`);
