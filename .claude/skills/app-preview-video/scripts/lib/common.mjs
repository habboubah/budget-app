// What the three steps of the app preview share: where things are, the
// command line, the browser, ffmpeg. Nothing in scripts/ or templates/ knows
// which app this is — that is all in config/ (the storyboard, the copy, the
// theme), so the same scripts film another app.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const skillDir = path.resolve(here, '../..');
export const root = path.resolve(skillDir, '../../..');
/** Footage and everything else that is only on the way: gitignored. */
export const buildDir = path.join(root, 'build/app-preview');
/** The upload set, next to the store screenshots. */
export const outDir = path.join(root, 'screenshots/store/app-preview');

export const rel = file => path.relative(root, file);
export const die = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };
export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

/** config/storyboard.mjs: the film (what happens, in which order, how long). */
export const loadStoryboard = () => import(pathToFileURL(path.join(skillDir, 'config/storyboard.mjs')).href);
export const theme = () => readJson(path.join(skillDir, 'config/theme.json'));
export function copyFor(locale) {
  const file = path.join(skillDir, `config/copy.${locale}.json`);
  try { return readJson(file); } catch { return die(`"${locale}" has no copy file. Expected ${rel(file)}.`); }
}

/** `--lang de` / `--lang de,en` → the languages to make; absent → all of the storyboard's. */
export function langsArg(all, argv = process.argv.slice(2)) {
  const i = argv.indexOf('--lang');
  if (i === -1) return all;
  const picked = String(argv[i + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const l of picked) if (!all.includes(l)) die(`--lang ${l}: the storyboard's languages are ${all.join(', ')} (config/storyboard.mjs › locales).`);
  return picked.length ? picked : all;
}
export const flag = (name, argv = process.argv.slice(2)) => argv.includes(name);

// Rasterisation is pinned the way the screenshot scripts pin it, so the type
// is drawn the same on every run.
export const launchArgs = ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'];

/**
 * Chromium. `CHROME_PATH` names another Chrome to use — in a Linux container
 * that has no Playwright browser of its own (`npx playwright install chromium`
 * is the usual way, once per machine).
 */
export async function launch(extra = []) {
  try {
    return await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: [...launchArgs, ...extra] });
  } catch (e) {
    return die(`Chromium did not start: ${String(e.message).split('\n')[0]}\n  Once per machine: npx playwright install chromium   (or CHROME_PATH=/path/to/chrome)`);
  }
}

/** ffmpeg / ffprobe from the PATH (or `FFMPEG` / `FFPROBE`), checked before anything is filmed. */
export function tool(name) {
  const bin = process.env[name.toUpperCase()] || name;
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    die(`${name} is not installed (or not on the PATH). Once per Mac:  brew install ffmpeg\n  It encodes the video (H.264 + AAC) and checks the file against Apple's specification.`);
  }
  return bin;
}

/** A JPEG's size, from its frame header. */
export function jpegSize(buf) {
  for (let i = 2; i + 9 < buf.length && buf[i] === 0xff;) {
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { width: 0, height: 0 };
}
/** A PNG's size: IHDR sits at a fixed place. */
export const pngSize = buf => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) });

/**
 * Takes pictures of a page at the video's own pixels ('jpeg' for footage,
 * 'png' for the finished frames). The quick way first — Chromium's own
 * screenshot, right when the real screen is as dense as the emulated one
 * (--force-device-scale-factor); a Chromium that hands it over at another
 * size is asked through Playwright from then on, which is slower and always
 * the right size.
 */
export function shooter(page, cdp, { width, height }, format) {
  const sizeOf = format === 'png' ? pngSize : jpegSize;
  const fits = buf => { const s = sizeOf(buf); return s.width === width && s.height === height; };
  let quick = true;
  return async () => {
    if (quick) {
      const { data } = await cdp.send('Page.captureScreenshot', format === 'png' ? { format: 'png', optimizeForSpeed: true } : { format: 'jpeg', quality: 95 });
      const buf = Buffer.from(data, 'base64');
      if (fits(buf)) return buf;
      quick = false;
    }
    const buf = await page.screenshot(format === 'png' ? { type: 'png', scale: 'device', caret: 'initial' } : { type: 'jpeg', quality: 95, scale: 'device', caret: 'initial' });
    if (!fits(buf)) { const s = sizeOf(buf); throw new Error(`a picture of the page comes out ${s.width} × ${s.height}, not ${width} × ${height}`); }
    return buf;
  };
}

export const wait = ms => new Promise(r => setTimeout(r, ms));
export const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
/** 12.5 → "0:12.5" — the way App Store Connect and a player show a time. */
export const clock = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
