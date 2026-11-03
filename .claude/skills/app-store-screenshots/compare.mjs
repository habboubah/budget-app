#!/usr/bin/env node
/**
 * Before/after comparison sheets for the UI redesign.
 *
 * Pairs every shot in screenshots/ui-redesign/before with its twin in after/
 * and renders them side by side. Same approach store-screenshot-studio already
 * uses for the marketing set: lay it out in HTML, shoot it in the browser
 * that's already a dependency. No image library, no new dependency.
 *
 *   node .claude/skills/app-store-screenshots/compare.mjs [variant...]
 *
 * With no arguments it builds one sheet per variant (theme x size x locale x
 * text scale). A variant argument filters, e.g. `de-small-dark-fs200`.
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const base = path.join(root, 'screenshots/ui-redesign');
const beforeDir = path.join(base, 'before');
const afterDir = path.join(base, 'after');
const outDir = path.join(base, 'comparisons');

for (const d of [beforeDir, afterDir]) {
  if (!existsSync(d)) {
    console.error(`\n✗ ${path.relative(root, d)} does not exist — run the capture first.\n`);
    process.exit(1);
  }
}

const filters = process.argv.slice(2);

// 01-today-de-small-dark-fs200.png -> { screen: '01-today', variant: 'de-small-dark-fs200' }
const parse = f => {
  const m = /^(\d+-[a-z-]+?)-((?:de|en)-(?:small|large)-(?:light|dark)-fs\d+)\.png$/.exec(f);
  return m && { screen: m[1], variant: m[2], file: f };
};

const pairs = readdirSync(beforeDir)
  .map(parse)
  .filter(Boolean)
  .filter(p => existsSync(path.join(afterDir, p.file)))
  .filter(p => filters.length === 0 || filters.some(f => p.variant.includes(f)));

if (pairs.length === 0) {
  console.error('\n✗ no before/after pairs matched.\n');
  process.exit(1);
}

const byVariant = new Map();
for (const p of pairs) {
  if (!byVariant.has(p.variant)) byVariant.set(p.variant, []);
  byVariant.get(p.variant).push(p);
}

const dataUri = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.png') || f.endsWith('.html')) rmSync(path.join(outDir, f));
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const [variant, shots] of byVariant) {
  shots.sort((a, b) => a.screen.localeCompare(b.screen));
  const cards = shots.map(s => `
    <figure>
      <figcaption>${s.screen.replace(/^\d+-/, '')}</figcaption>
      <div class="pair">
        <div><span class="tag before">before</span><img src="${dataUri(path.join(beforeDir, s.file))}"></div>
        <div><span class="tag after">after</span><img src="${dataUri(path.join(afterDir, s.file))}"></div>
      </div>
    </figure>`).join('');

  const html = `<!doctype html><meta charset="utf-8">
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 32px; background: #0B0C0E; color: #F2F4F7;
         font: 14px/1.4 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #A0A6B0; margin: 0 0 28px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 28px; }
  figure { margin: 0; }
  figcaption { font-weight: 700; margin-bottom: 8px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pair > div { position: relative; }
  img { width: 100%; display: block; border: 1px solid #343945; border-radius: 8px; }
  .tag { position: absolute; top: 8px; left: 8px; z-index: 1; font-size: 11px; font-weight: 700;
         padding: 2px 8px; border-radius: 999px; }
  .before { background: #343945; color: #F2F4F7; }
  .after  { background: #FFB020; color: #0B0C0E; }
</style>
<h1>Fahrtwerk UI redesign — ${variant}</h1>
<p class="sub">${shots.length} screens · left: before · right: after</p>
<div class="grid">${cards}</div>`;

  const htmlPath = path.join(outDir, `${variant}.html`);
  writeFileSync(htmlPath, html);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState('networkidle');
  writeFileSync(path.join(outDir, `${variant}.png`), await page.screenshot({ fullPage: true }));
  console.log(`✓ ${variant} — ${shots.length} pairs`);
}

await browser.close();
console.log(`\n${byVariant.size} comparison sheets in screenshots/ui-redesign/comparisons/`);
