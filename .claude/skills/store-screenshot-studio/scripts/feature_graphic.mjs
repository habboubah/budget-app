#!/usr/bin/env node
// Google Play feature graphic: exactly 1024x500, JPEG so it cannot carry alpha.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cfg, root, launchArgs, slideData, ribbonFor, pointsFor, placedStickers, shoot, copyFor, die } from './render.mjs';

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

    // The slide lends its screen and nothing else: the graphic has its own
    // frame, placement, copy, points and stickers, and no call-outs.
    const borrowed = {
      ...slide,
      background: fg.background,
      device: fg.device || slide.device,
      phone: fg.phone || {},
      second: null,
      callouts: [],
    };
    const data = slideData(borrowed, locale, {
      layout: 'feature',
      align: 'start',
      headline: copy.featureGraphic.headline,
      subline: (fg.subline ?? cfg.style?.sublines ?? false) ? copy.featureGraphic.subline : null,
      maxLines: fg.maxLines ?? 2,
      points: pointsFor(copy.featureGraphic.points, Boolean(fg.ribbon), `config/copy.${locale}.json[featureGraphic]`),
      stickers: placedStickers(fg.stickers, copy.dir === 'rtl', 'featureGraphic.stickers'),
      ribbon: ribbonFor(fg, locale),
    });

    const buf = await shoot(browser, data, fg);
    const dir = path.join(root, cfg.outDir, 'play-feature', locale);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'feature-graphic.jpg');
    writeFileSync(file, buf);
    console.log(`✓ ${path.relative(root, file)} — ${fg.width}x${fg.height}${fg.ribbon ? ', with ribbon' : ''}`);
  }
} finally {
  await browser.close();
}
