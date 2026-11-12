#!/usr/bin/env node
// Google Play feature graphic: exactly 1024x500, JPEG so it cannot carry alpha.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cfg, root, launchArgs, slideData, shoot, copyFor, die } from './render.mjs';

const fg = cfg.featureGraphic;
// Google Play only: without a featureGraphic block there is nothing to make.
if (!fg) {
  console.log('– no featureGraphic in screenshots.config.json (App Store only) — skipped');
  process.exit(0);
}
const slide = cfg.slides.find(s => s.id === fg.slide);
if (!slide) die(`featureGraphic.slide is "${fg.slide}", which is not a slide id in screenshots.config.json.`);

const browser = await chromium.launch({ args: launchArgs });
try {
  for (const locale of cfg.locales) {
    const copy = copyFor(locale);
    if (!copy.featureGraphic) die(`config/copy.${locale}.json has no "featureGraphic" block.`);

    const data = slideData({ ...slide, background: fg.background, device: fg.device || slide.device }, locale, {
      layout: 'feature',
      headline: copy.featureGraphic.headline,
      subline: copy.featureGraphic.subline,
      // The feature graphic stands alone, so it never takes a panorama offset.
      panoramaCount: 1,
      panoramaIndex: 0,
    });

    const buf = await shoot(browser, data, fg);
    const dir = path.join(root, cfg.outDir, 'play-feature', locale);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'feature-graphic.jpg');
    writeFileSync(file, buf);
    console.log(`✓ ${path.relative(root, file)} — ${fg.width}x${fg.height}`);
  }
} finally {
  await browser.close();
}
