// Runs before `npm run store-screenshots`: the store set frames captures that
// `npm run screenshots` makes (the iPhone ones in screenshots/<de|en|ar>/,
// the Android ones in screenshots/<de|en|ar>-android/ for Google Play). When
// any the set needs is missing, this takes them first — only the platform
// that lacks them — so the framing never stops at a missing file.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, '.claude/skills/store-screenshot-studio/config/screenshots.config.json'), 'utf8'));
const slideById = id => cfg.slides.find(s => s.id === id);
const needed = []; // [dir template, file]
for (const t of cfg.targets) {
  const dir = t.rawDir ?? cfg.rawDir;
  for (const id of t.slides ?? cfg.slides.map(s => s.id)) {
    const s = slideById(id);
    if (!s) continue;
    needed.push([dir, s.raw]);
    if (s.second) needed.push([dir, s.second.raw]);
  }
}
if (cfg.featureGraphic) {
  const s = slideById(cfg.featureGraphic.slide);
  if (s) needed.push([cfg.featureGraphic.rawDir ?? cfg.rawDir, s.raw]);
}

let ios = false, android = false;
for (const [dir, file] of needed) {
  for (const locale of cfg.locales) {
    const d = dir.replaceAll('{locale}', locale);
    if (!fs.existsSync(path.join(root, d, file))) {
      if (d.endsWith('-android')) android = true; else ios = true;
    }
  }
}
if (!ios && !android) process.exit(0);

const flag = ios && android ? [] : ios ? ['--ios'] : ['--android'];
console.log(`Some ${ios && android ? '' : ios ? 'iPhone ' : 'Android '}captures are missing — taking them first (npm run screenshots${flag.length ? ` -- ${flag[0]}` : ''}, a few minutes) …\n`);
execFileSync(process.execPath, [path.join(root, 'scripts', 'screenshots.mjs'), ...flag], { cwd: root, stdio: 'inherit' });
console.log('');
