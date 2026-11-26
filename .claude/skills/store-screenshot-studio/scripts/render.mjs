#!/usr/bin/env node
// Renders one marketing slide from a raw capture. Also the shared renderer that
// export.mjs / feature_graphic.mjs / preview.mjs drive.
//
// CLI (the approval proof in step 2 of SKILL.md):
//   node scripts/render.mjs --slide list --locale de --out /tmp/proof.png --scale 1
//   … --target play-phone   the slide as that target exports it (frame, ribbon)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const skillDir = path.resolve(here, '..');
export const root = path.resolve(skillDir, '../../..');

export const cfg = JSON.parse(readFileSync(path.join(skillDir, 'config/screenshots.config.json'), 'utf8'));
export const theme = JSON.parse(readFileSync(path.join(skillDir, 'config/theme.json'), 'utf8'));

export const die = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

export const LAYOUTS = ['top', 'bottom'];

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

// The ribbon ("Kostenlos" / "Free"). `owner` is a target or the
// featureGraphic block: `"ribbon": true` puts it on every slide, `"first"` on
// the first one only, absent or false on none. `"ribbonStyle"`: "corner" (the
// default, a sash across the leading top corner) or "banner" (a red band
// across the whole top edge, the first thing the eye meets in a store list).
// The word is the copy file's `ribbon`; its colours come with the slide's
// background (theme.json: ribbon / ribbonInk, banner / bannerInk).
// Where the stores allow it: reference/store-specs.md › The ribbon.
export function ribbonFor(owner, locale, index = 0) {
  const name = owner.id || 'featureGraphic';
  if (!owner.ribbon) return null;
  if (owner.ribbon !== true && owner.ribbon !== 'first') {
    die(`"${name}" has "ribbon": ${JSON.stringify(owner.ribbon)}. Use true (every slide), "first" or false.`);
  }
  if (owner.ribbon === 'first' && index !== 0) return null;
  const style = owner.ribbonStyle ?? 'corner';
  if (style !== 'corner' && style !== 'banner') die(`"${name}" has "ribbonStyle": ${JSON.stringify(style)}. Use "corner" or "banner".`);
  const text = copyFor(locale).ribbon;
  if (!text) die(`"${name}" asks for the ribbon, but config/copy.${locale}.json has no "ribbon" text.`);
  return { text, style };
}

// The pills under the headline: a slide's (or the feature graphic's) `points`
// in the copy file. A point is a string, or { "text": …, "price": true } for one
// that speaks about what the app costs ("Kein Abo", "Keine In-App-Käufe"). Those
// are shown only where `priceWords` is true — the targets that carry the
// ribbon — and left out everywhere else, for the same reason as the ribbon.
export function pointsFor(points, priceWords, where) {
  if (points == null) return [];
  if (!Array.isArray(points)) die(`${where}: "points" has to be a list.`);
  return points
    .map(p => (typeof p === 'string' ? { text: p } : p))
    .map(p => (p && typeof p.text === 'string' && p.text.trim() ? p : die(`${where}: a point needs a "text".`)))
    .filter(p => priceWords || !p.price)
    .map(p => p.text);
}

// ---------------------------------------------------------------- captures

// A target (or the feature graphic) may take its captures from its own
// folder (`rawDir`). Today both stores frame the same captures
// (screenshots/<locale>/), so none names one.
const rawPath = (file, locale, dir = cfg.rawDir) => path.join(root, dir.replaceAll('{locale}', locale), file);

/** One phone's worth of data: the capture, its shape, how the frame is placed. */
function phoneData(spec, locale, device, where, dir) {
  const file = rawPath(spec.raw, locale, dir);
  let size;
  try {
    size = pngSize(file);
  } catch {
    die(`${where} points at ${path.relative(root, file)}, which is missing. Run \`npm run screenshots\` first (it takes the iPhone and the Android captures, in every language).`);
  }
  const place = spec.phone || spec;
  return {
    file,
    device,
    rawUrl: pathToFileURL(file).href,
    rawAspect: `${size.width} / ${size.height}`,
    rawRows: size.height,
    appBg: theme.colors.bg,
    // In vh / degrees / fractions of the canvas; slide.css has the defaults.
    width: place.width ?? null,
    tilt: place.tilt ?? null,
    nudge: place.nudge ?? null,
    // The second phone only: in front of the first instead of behind it.
    front: Boolean(place.front),
  };
}

/**
 * Where things are in a capture: `<capture>.marks.json`, written next to it
 * by `npm run screenshots` (scripts/lib/shots.mjs) — each named element's box
 * in fractions of the capture, and its corner radius. A call-out names a mark
 * instead of carrying numbers, so it follows the app when a screen changes
 * and is right in every language.
 */
function marksFor(file) {
  const sidecar = file.replace(/\.png$/i, '.marks.json');
  if (!existsSync(sidecar)) return { sidecar, marks: null };
  // The capture run writes the marks right after the picture. Marks older
  // than their picture belong to an earlier one, and would lift the wrong spot.
  if (statSync(sidecar).mtimeMs < statSync(file).mtimeMs - 60_000) {
    die(`${path.relative(root, sidecar)} is older than its capture, so its marks may point at the wrong spot. `
      + 'Run `npm run screenshots` again.');
  }
  return { sidecar, marks: JSON.parse(readFileSync(sidecar, 'utf8')).marks || {} };
}

const num = (v, where, what) => (typeof v === 'number' && Number.isFinite(v) ? v : die(`${where}: ${what} has to be a number.`));

/** A call-out, resolved to a box in fractions of the capture. */
function calloutData(c, file, rtl, where) {
  let box;
  if (c.mark) {
    const { sidecar, marks } = marksFor(file);
    if (!marks) {
      die(`${where} lifts the mark "${c.mark}", but ${path.relative(root, sidecar)} is missing. `
        + 'Run `npm run screenshots` — it writes the marks next to each capture.');
    }
    box = marks[c.mark];
    if (!box) {
      die(`${where} lifts the mark "${c.mark}", which ${path.relative(root, sidecar)} does not have. `
        + `It has: ${Object.keys(marks).join(', ') || 'none'}. Marks are named in scripts/lib/shots.mjs.`);
    }
  } else if (Array.isArray(c.crop) && c.crop.length === 4) {
    const [x, y, w, h] = c.crop.map(v => num(v, where, '"crop"'));
    box = { x, y, w, h, radius: c.radius ?? 0 };
  } else {
    die(`${where}: a call-out needs a "mark" (a name from the capture's .marks.json) or a "crop" ([x, y, w, h] in fractions of the capture).`);
  }

  // `pad` grows the piece on every side, in fractions of the capture's width
  // (the corners grow with it, so a padded pill is still a pill).
  const { width, height } = pngSize(file);
  const pad = c.pad ?? 0;
  const radius = c.radius ?? box.radius ?? 0;
  const padY = pad * width / height;
  let { x, y, w, h } = box;
  x -= pad; w += 2 * pad; y -= padY; h += 2 * padY;
  // Kept inside the capture: there are no pixels beyond it.
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(1, x + w), y1 = Math.min(1, y + h);
  if (x1 - x0 <= 0 || y1 - y0 <= 0) die(`${where}: the call-out lies outside the capture.`);

  return {
    x: x0, y: y0,
    // A box as wide (or tall) as the capture has nothing to slide along.
    w: Math.min(x1 - x0, 0.999), h: Math.min(y1 - y0, 0.999),
    // A padded piece keeps its corners concentric; a radius given in the
    // config is taken as it stands.
    radius: c.radius ?? (radius > 0 ? radius + pad : 0),
    scale: c.scale ?? 1.25,
    tilt: c.tilt ?? 0,
    shift: c.shift ?? [0, 0],
    origin: originFor(c.anchor, rtl, where),
  };
}

// A call-out grows about its centre. `anchor` pins an edge instead, so what
// sits next to that edge stays in view: "bottom" keeps the row under a lifted
// piece whole, "top" a heading above it. start / end follow the reading direction.
function originFor(anchor = 'center', rtl, where) {
  const origin = [0.5, 0.5];
  for (const part of String(anchor).split('-')) {
    if (part === 'top') origin[1] = 0;
    else if (part === 'bottom') origin[1] = 1;
    else if (part === 'start') origin[0] = rtl ? 1 : 0;
    else if (part === 'end') origin[0] = rtl ? 0 : 1;
    else if (part !== 'center') die(`${where}: "anchor" is "${anchor}". Use center, top, bottom, start, end, or two joined by a dash (top-start).`);
  }
  return origin;
}

// ---------------------------------------------------------------- stickers

const stickerUrl = (art, where) => {
  const file = path.join(skillDir, 'assets/stickers', `${art}.svg`);
  if (!existsSync(file)) die(`${where}: no sticker "${art}" in assets/stickers/.`);
  return pathToFileURL(file).href;
};

/**
 * The stickers a slide shows: its own, and what spills over from its two
 * neighbours in this target's order. A sticker is anchored to a slide by id;
 * `x` counts in slide widths from that slide's leading edge (1 is the seam to
 * the next slide), `y` in slide heights from the top, both to the sticker's
 * centre; `size` is its width in slide widths.
 */
function stickersFor(ids, index, rtl) {
  const out = [];
  for (const [n, s] of (cfg.stickers || []).entries()) {
    const where = `stickers[${n}]`;
    const home = ids.indexOf(s.slide);
    if (home === -1) {
      // Not in this target's set (Play takes eight): nothing to anchor to.
      if (!cfg.slides.some(sl => sl.id === s.slide)) die(`${where}: slide "${s.slide}" is not a slide id.`);
      continue;
    }
    if (Math.abs(home - index) > 1) continue;
    const size = num(s.size, where, '"size"');
    let x = num(s.x, where, '"x"') + (home - index);
    // Only what reaches into this slide (a rotated sticker is wider than its box).
    if (x + size * 0.75 < 0 || x - size * 0.75 > 1) continue;
    // RTL listings run the other way: the next slide is on the left.
    if (rtl) x = 1 - x;
    out.push({
      url: stickerUrl(s.art, where),
      x,
      y: num(s.y, where, '"y"'),
      size,
      rotate: (s.rotate ?? 0) * (rtl ? -1 : 1),
      layer: s.layer === 'back' ? 'back' : 'front',
    });
  }
  return out;
}

/**
 * Stickers given straight in canvas coordinates (the feature graphic's): `x`
 * in widths from the leading edge, `y` in heights, `size` in heights.
 */
export function placedStickers(list, rtl, where) {
  return (list || []).map((s, n) => ({
    url: stickerUrl(s.art, `${where}[${n}]`),
    x: rtl ? 1 - num(s.x, `${where}[${n}]`, '"x"') : num(s.x, `${where}[${n}]`, '"x"'),
    y: num(s.y, `${where}[${n}]`, '"y"'),
    size: num(s.size, `${where}[${n}]`, '"size"'),
    rotate: (s.rotate ?? 0) * (rtl ? -1 : 1),
    layer: s.layer === 'back' ? 'back' : 'front',
  }));
}

// ---------------------------------------------------------------- slides

const iconUrl = (file, where) => {
  const full = path.join(root, file);
  if (!existsSync(full)) die(`${where} shows the icon "${file}", which is not a file in the repo.`);
  return pathToFileURL(full).href;
};

const backgroundFor = (name, where) =>
  theme.backgrounds[name] || die(`${where} asks for background "${name}", which is not in theme.json. It has: ${Object.keys(theme.backgrounds).join(', ')}.`);

/** The slides a target exports, in its order, in its frame. */
export function slidesFor(target) {
  const list = target.slides
    ? target.slides.map(id => cfg.slides.find(s => s.id === id) || die(`target "${target.id}" lists slide "${id}", which is not in slides.`))
    : cfg.slides;
  return list.map(s => ({ ...s, ...(target.device && { device: target.device }), ...(target.rawDir && { rawDir: target.rawDir }) }));
}

/**
 * Everything templates/slide.html needs for one slide.
 * `ids` / `index`: the target's slide order and this slide's place in it (the
 * stickers on the seams depend on the neighbours). `priceWords`: may this
 * render say what the app costs? It decides which of the slide's points show.
 */
export function slideData(slide, locale, { ids = cfg.slides.map(s => s.id), index = ids.indexOf(slide.id), priceWords = false, ribbon = null, ...extra } = {}) {
  const copy = copyFor(locale);
  const text = copy.slides[slide.id];
  const where = `slide "${slide.id}"`;
  if (!text) die(`${where} has no copy in config/copy.${locale}.json.`);
  if (!LAYOUTS.includes(slide.layout)) die(`${where} has layout "${slide.layout}". Use ${LAYOUTS.join(' or ')}.`);

  const style = cfg.style || {};
  const phone = phoneData(slide, locale, slide.device, where, slide.rawDir);
  const background = backgroundFor(slide.background, where);
  const [bgKey, inkKey] = ribbon?.style === 'banner' ? ['banner', 'bannerInk'] : ['ribbon', 'ribbonInk'];
  if (ribbon && !(background[bgKey] && background[inkKey])) {
    die(`${where} carries the ${ribbon.style}, but background "${slide.background}" has no "${bgKey}" / "${inkKey}" colours in theme.json.`);
  }
  // A slide shows its subline only where the set asks for sublines, or the
  // slide itself does.
  const wantsSubline = slide.subline ?? style.sublines ?? false;

  return {
    locale,
    dir: copy.dir,
    layout: slide.layout,
    align: slide.align || 'center',
    headline: text.headline,
    subline: wantsSubline ? text.subline : null,
    points: pointsFor(text.points, priceWords, `config/copy.${locale}.json[${slide.id}]`),
    maxLines: slide.maxLines ?? style.maxLines ?? 3,
    colors: theme.colors,
    font: theme.font,
    bezel: theme.device.bezel,
    background,
    phone,
    second: slide.second ? phoneData(slide.second, locale, slide.device, `${where} › second`, slide.rawDir) : null,
    callouts: (slide.callouts || []).map((c, n) => calloutData(c, phone.file, copy.dir === 'rtl', `${where} › callouts[${n}]`)),
    // The app's icon above the headline (the opening slide): a picture from the repo.
    icon: slide.icon ? iconUrl(slide.icon, where) : null,
    stickers: stickersFor(ids, index, copy.dir === 'rtl'),
    // Off unless the caller passes ribbonFor(…).
    ribbon: ribbon && { ...ribbon, bg: background[bgKey], fg: background[inkKey] },
    ...extra,
  };
}

/** One slide of a target, as that target exports it. */
export function targetSlideData(target, locale, index) {
  const slides = slidesFor(target);
  return slideData(slides[index], locale, {
    ids: slides.map(s => s.id),
    index,
    ribbon: ribbonFor(target, locale, index),
    // The ribbon's targets are the ones that may speak about the price at all.
    priceWords: Boolean(target.ribbon),
  });
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
  // Webfont swap, image decode and the headline fit all move pixels; the page
  // says when it is done rather than us sleeping and hoping.
  const state = await page.evaluate(() => window.__READY__);
  if (state.missing.length) {
    die(`the font "${state.missing.join('", "')}" did not load — check ${theme.font.css} and the files it points at (src/assets/fonts/).`);
  }
  if (state.broken.length) die(`an image did not load: ${state.broken.join(', ')}`);
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

  if (!cfg.slides.some(s => s.id === id)) die(`no slide "${id}" in screenshots.config.json. Have: ${cfg.slides.map(s => s.id).join(', ')}.`);

  // --target play-phone proofs a slide the way that target exports it: its
  // frame, its ribbon, its neighbours' stickers. Without it, the first target.
  const target = arg('target') ? cfg.targets.find(t => t.id === arg('target')) : cfg.targets[0];
  if (!target) die(`no target "${arg('target')}" in screenshots.config.json. Have: ${cfg.targets.map(t => t.id).join(', ')}.`);
  const index = slidesFor(target).findIndex(s => s.id === id);
  if (index === -1) die(`target "${target.id}" does not export slide "${id}". It has: ${slidesFor(target).map(s => s.id).join(', ')}.`);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: launchArgs });
  try {
    const buf = await shoot(browser, targetSlideData(target, locale, index), {
      width: Math.round(target.width / target.scale * scale),
      height: Math.round(target.height / target.scale * scale),
      scale,
    });
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log(`${path.relative(root, out)} — ${id} / ${locale} / ${target.id} at ${scale}x`);
  } finally {
    await browser.close();
  }
}
