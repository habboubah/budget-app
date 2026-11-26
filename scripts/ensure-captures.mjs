// Runs before `npm run store-screenshots`: the store set frames captures that
// `npm run screenshots` makes (screenshots/<de|en|ar>/, one set for the App
// Store and Google Play). When any the set needs is missing, this takes them
// first, so the framing never stops at a missing file.
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

const missing = needed.some(([dir, file]) => cfg.locales.some(locale => !fs.existsSync(path.join(root, dir.replaceAll('{locale}', locale), file))));
if (!missing) process.exit(0);

console.log('Some captures are missing — taking them first (npm run screenshots, a few minutes) …\n');
execFileSync(process.execPath, [path.join(root, 'scripts', 'screenshots.mjs')], { cwd: root, stdio: 'inherit' });
console.log('');
