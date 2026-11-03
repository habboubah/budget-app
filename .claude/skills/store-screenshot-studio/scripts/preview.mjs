#!/usr/bin/env node
// Contact sheet: every exported slide side by side, one row per locale, so the
// set can be judged as a set. Rendered as HTML for the same reason everything
// else is — no image library needed to lay out a grid.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cfg, root, theme, launchArgs, die } from './render.mjs';

const target = cfg.targets[0];
const THUMB = 260;

const rows = cfg.locales.map(locale => {
  const cells = cfg.slides.map((slide, i) => {
    const file = path.join(root, cfg.outDir, target.id, locale,
      `${String(i + 1).padStart(2, '0')}-${slide.id}.png`);
    if (!existsSync(file)) die(`contact sheet needs ${path.relative(root, file)} — run export.mjs first.`);
    return `<figure><img src="${pathToFileURL(file).href}"><figcaption>${String(i + 1).padStart(2, '0')} ${slide.id} · ${slide.layout}</figcaption></figure>`;
  }).join('');
  return `<section><h2>${locale} · ${target.id} · ${target.width}×${target.height}</h2><div class="row">${cells}</div></section>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(path.join(root, '.claude/skills/store-screenshot-studio/assets/fonts/space-grotesk.css')).href}">
<style>
  body { margin:0; padding:28px; background:${theme.colors.bg}; font-family:"Space Grotesk",system-ui,sans-serif; }
  h2 { font-size:15px; font-weight:600; color:${theme.colors.fgMute}; margin:0 0 12px; letter-spacing:.02em; }
  section { margin-bottom:34px; }
  .row { display:flex; gap:16px; }
  figure { margin:0; width:${THUMB}px; }
  img { width:100%; display:block; border-radius:10px; box-shadow:0 2px 14px rgba(20,22,26,.16); }
  figcaption { margin-top:8px; font-size:12px; color:${theme.colors.fgMute}; }
</style>${rows}`;

const browser = await chromium.launch({ args: launchArgs });
try {
  const page = await browser.newPage({ viewport: { width: cfg.slides.length * (THUMB + 16) + 40, height: 900 } });
  // The sheet has to be a real file:// page — Chromium refuses to load file://
  // images into a document served from about:blank.
  const scratch = path.join(tmpdir(), 'store-studio-contact-sheet.html');
  writeFileSync(scratch, html);
  await page.goto(pathToFileURL(scratch).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  const out = path.join(root, cfg.previewFile);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, await page.screenshot({ fullPage: true }));
  rmSync(scratch, { force: true });
  console.log(`✓ ${cfg.previewFile}`);
} finally {
  await browser.close();
}
