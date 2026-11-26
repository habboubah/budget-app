#!/usr/bin/env node
// Every slide x locale x target, at exact store pixel sizes.
// Output: <outDir>/<target>/<locale>/<NN>-<slide>.<ext>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { cfg, root, launchArgs, slidesFor, targetSlideData, shoot, die } from './render.mjs';

const outDir = path.join(root, cfg.outDir);

// Only ever removes folders this script makes — a current target, or one an
// earlier config made (apple-6.9, apple-6.5, play-…) — so no stale size is left
// next to the set to upload, and a hand-made file in screenshots/store/ survives.
const ours = name => cfg.targets.some(t => t.id === name) || /^(apple|iphone|play)-/.test(name);
if (existsSync(outDir)) {
  // Folders only: play-icon-512.png lies here too and starts like one of ours.
  for (const entry of readdirSync(outDir, { withFileTypes: true })) {
    if (entry.isDirectory() && ours(entry.name)) rmSync(path.join(outDir, entry.name), { recursive: true });
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: launchArgs });
const written = [];

try {
  for (const target of cfg.targets) {
    // A target may pick its own slides (Play takes eight) and its own frame.
    // It is its own strip: a sticker on a seam spills into whichever slide
    // comes next in this target.
    const slides = slidesFor(target);
    for (const locale of cfg.locales) {
      const dir = path.join(outDir, target.id, locale);
      mkdirSync(dir, { recursive: true });
      for (const [i, slide] of slides.entries()) {
        const buf = await shoot(browser, targetSlideData(target, locale, i), target);
        const ext = target.format === 'jpeg' ? 'jpg' : 'png';
        const file = path.join(dir, `${String(i + 1).padStart(2, '0')}-${slide.id}.${ext}`);
        writeFileSync(file, buf);
        written.push(file);
      }
      const marked = target.ribbon === 'first' ? ', ribbon on the first' : target.ribbon ? ', with ribbon' : '';
      console.log(`✓ ${target.id} / ${locale} — ${slides.length} slides${marked}`);
    }
  }
} finally {
  await browser.close();
}

if (!written.length) die('nothing was exported — screenshots.config.json has no slides or no targets.');
console.log(`\n${written.length} files in ${cfg.outDir}/`);
