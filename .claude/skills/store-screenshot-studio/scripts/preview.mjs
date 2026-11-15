#!/usr/bin/env node
// Contact sheets: every exported slide side by side, one row per locale, so a
// set can be judged as a set — one sheet per target, because each target has
// its own frame, its own choice of slides and, on Play, the ribbon. The slides
// stand almost edge to edge, the way a listing shows them, so a sticker that
// runs across a seam can be checked. The first target's sheet is
// `previewFile`; the others add their id to that name, and Play's sheet ends
// with the feature graphics.
// Rendered as HTML for the same reason everything else is — no image library
// needed to lay out a grid.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cfg, root, skillDir, theme, launchArgs, slidesFor, die } from './render.mjs';

const THUMB = 250;
const GAP = 6;

const sheetFor = target => {
  const ext = target.format === 'jpeg' ? 'jpg' : 'png';
  const slides = slidesFor(target);
  const rows = cfg.locales.map(locale => {
    const cells = slides.map((slide, i) => {
      const file = path.join(root, cfg.outDir, target.id, locale,
        `${String(i + 1).padStart(2, '0')}-${slide.id}.${ext}`);
      if (!existsSync(file)) die(`contact sheet needs ${path.relative(root, file)} — run export.mjs first.`);
      return `<figure><img src="${pathToFileURL(file).href}"><figcaption>${String(i + 1).padStart(2, '0')} ${slide.id}</figcaption></figure>`;
    }).join('');
    return `<section><h2>${locale} · ${target.id} · ${target.width}×${target.height}</h2><div class="row">${cells}</div></section>`;
  }).join('');

  // Google Play's sheet also shows the feature graphic, which is judged with the set.
  const fg = cfg.featureGraphic && target.store === 'play'
    ? `<section><h2>feature graphic · ${cfg.featureGraphic.width}×${cfg.featureGraphic.height}</h2><div class="row wide">${cfg.locales.map(locale => {
      const file = path.join(root, cfg.outDir, 'play-feature', locale, 'feature-graphic.jpg');
      if (!existsSync(file)) die(`contact sheet needs ${path.relative(root, file)} — run feature_graphic.mjs first.`);
      return `<figure><img src="${pathToFileURL(file).href}"><figcaption>${locale}</figcaption></figure>`;
    }).join('')}</div></section>`
    : '';

  const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(path.join(skillDir, theme.font.css)).href}">
<style>
  body { margin:0; padding:28px; background:${theme.colors.bg}; font-family:"${theme.font.text}",system-ui,sans-serif; }
  h2 { font-size:15px; font-weight:800; color:${theme.colors.fgMute}; margin:0 0 12px; }
  section { margin-bottom:34px; }
  .row { display:flex; gap:${GAP}px; }
  figure { margin:0; width:${THUMB}px; }
  .wide { gap:16px; } .wide figure { width:${Math.round(THUMB * 2.4)}px; }
  img { width:100%; display:block; border-radius:8px; }
  figcaption { margin-top:8px; font-size:12px; font-weight:700; color:${theme.colors.fgMute}; }
</style>${rows}${fg}`;
  return { html, width: Math.max(slides.length * (THUMB + GAP), fg ? cfg.locales.length * (THUMB * 2.4 + 16) : 0) + 56 };
};

const browser = await chromium.launch({ args: launchArgs });
try {
  for (const [n, target] of cfg.targets.entries()) {
    const { html, width } = sheetFor(target);
    const page = await browser.newPage({ viewport: { width: Math.ceil(width), height: 900 } });
    // The sheet has to be a real file:// page — Chromium refuses to load file://
    // images into a document served from about:blank.
    const scratch = path.join(tmpdir(), `store-studio-contact-sheet-${target.id}.html`);
    writeFileSync(scratch, html);
    await page.goto(pathToFileURL(scratch).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    const name = n === 0 ? cfg.previewFile : cfg.previewFile.replace(/(\.\w+)$/, `-${target.id}$1`);
    const out = path.join(root, name);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, await page.screenshot({ fullPage: true }));
    rmSync(scratch, { force: true });
    await page.close();
    console.log(`✓ ${name}`);
  }
} finally {
  await browser.close();
}
