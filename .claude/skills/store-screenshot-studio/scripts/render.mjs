#!/usr/bin/env node
// Renders one marketing slide from a raw capture. Also the shared renderer that
// export.mjs / feature_graphic.mjs / preview.mjs drive.
//
// CLI (the approval proof in step 2 of SKILL.md):
//   node scripts/render.mjs --slide month --locale de --out /tmp/proof.png --scale 1
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const skillDir = path.resolve(here, '..');
export const root = path.resolve(skillDir, '../../..');

export const cfg = JSON.parse(readFileSync(path.join(skillDir, 'config/screenshots.config.json'), 'utf8'));
export const theme = JSON.parse(readFileSync(path.join(skillDir, 'config/theme.json'), 'utf8'));

export const die = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

export const copyFor = locale => {
  const file = path.join(skillDir, `config/copy.${locale}.json`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    die(`locale "${locale}" has no copy file. Expected ${path.relative(root, file)}.`);
  }
};

// IHDR sits at a fixed offset in every PNG, so the capture's dimensions are two
// reads — no image library needed just to learn a width.
export function pngSize(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) die(`${path.relative(root, file)} is not a PNG.`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Rasterisation is pinned the same way the capture skill pins it, so a rerun on
// another Mac produces the same pixels.
export const launchArgs = ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'];

export function slideData(slide, locale, extra = {}) {
  const copy = copyFor(locale);
  const text = copy.slides[slide.id];
  if (!text) die(`slide "${slide.id}" has no copy in config/copy.${locale}.json.`);

  // One capture folder per language: rawDir may say {locale}.
  const rawFile = path.join(root, cfg.rawDir.replaceAll('{locale}', locale), slide.raw);
  let size;
  try {
    size = pngSize(rawFile);
  } catch {
    die(`slide "${slide.id}" points at ${path.relative(root, rawFile)}, which is missing. `
      + `Run \`npm run screenshots\` first.`);
  }

  const bg = theme.backgrounds[slide.background];
  if (!bg) die(`slide "${slide.id}" asks for background "${slide.background}", which is not in theme.json.`);

  return {
    locale,
    dir: copy.dir,
    layout: slide.layout,
    device: slide.device,
    headline: text.headline,
    subline: text.subline,
    colors: theme.colors,
    background: bg,
    rawUrl: pathToFileURL(rawFile).href,
    rawAspect: `${size.width} / ${size.height}`,
    rawRows: size.height,
    focus: slide.focus || null,
    // Panoramic offset; 1/0 makes the background a plain single-slide gradient.
    // Looked up by id: a target that swaps the frame hands in a copy of the
    // slide, which indexOf would not find (and the strip slid off the canvas).
    // A target with its own slide list passes its own count and position.
    panoramaCount: bg.panoramic ? cfg.slides.length : 1,
    panoramaIndex: bg.panoramic ? cfg.slides.findIndex(s => s.id === slide.id) : 0,
    ...extra,
  };
}

/** Renders `data` at exactly width x height device pixels and returns the buffer. */
export async function shoot(browser, data, { width, height, scale = 1, format = 'png', quality }) {
  const ctx = await browser.newContext({
    viewport: { width: Math.round(width / scale), height: Math.round(height / scale) },
    deviceScaleFactor: scale,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(d => { window.__DATA__ = d; }, data);
  await page.goto(pathToFileURL(path.join(skillDir, 'templates/slide.html')).href, { waitUntil: 'load' });
  // Webfont swap and image decode both move pixels; wait for each explicitly
  // rather than sleeping and hoping.
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const img = document.querySelector('.screen img');
    return img.complete ? img.decode() : new Promise(r => { img.onload = () => img.decode().then(r); });
  });
  const buf = await page.screenshot(
    format === 'jpeg' ? { type: 'jpeg', quality } : { type: 'png' });
  await ctx.close();
  return buf;
}

// ---------------------------------------------------------------- CLI

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = name => {
    const i = process.argv.indexOf(`--${name}`);
    return i === -1 ? undefined : process.argv[i + 1];
  };
  const id = arg('slide') || cfg.slides[0].id;
  const locale = arg('locale') || cfg.locales[0];
  const scale = Number(arg('scale') || 1);
  const out = arg('out') || path.join(root, 'screenshots/store/_proof.png');

  const slide = cfg.slides.find(s => s.id === id);
  if (!slide) die(`no slide "${id}" in screenshots.config.json. Have: ${cfg.slides.map(s => s.id).join(', ')}.`);

  const target = cfg.targets[0];
  const browser = await chromium.launch({ args: launchArgs });
  try {
    const buf = await shoot(browser, slideData(slide, locale), {
      width: Math.round(target.width / target.scale * scale),
      height: Math.round(target.height / target.scale * scale),
      scale,
    });
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log(`${path.relative(root, out)} — ${id} / ${locale} at ${scale}x`);
  } finally {
    await browser.close();
  }
}
