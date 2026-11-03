#!/usr/bin/env node
// Every slide x locale x target, at exact store pixel sizes.
// Output: <outDir>/<target>/<locale>/<NN>-<slide>.<ext>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { cfg, root, launchArgs, slideData, shoot, die } from './render.mjs';

const outDir = path.join(root, cfg.outDir);

// Only ever removes directories this script owns, so a hand-made file dropped
// into screenshots/store/ survives a rerun.
for (const t of [...cfg.targets.map(t => t.id), 'play-feature']) {
  const dir = path.join(outDir, t);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
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
