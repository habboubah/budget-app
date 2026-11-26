#!/usr/bin/env node
// The contact sheet: the finished video as a row of stills, one every half
// second, each with its time and its chapter — the way to look at a video
// without playing it (and the only way Claude can). Written from the stills
// compose keeps in build/app-preview/<lang>/stills/.
//
//   node .claude/skills/app-preview-video/scripts/sheet.mjs [--lang de]
//
// Out: screenshots/store/app-preview/contact-sheet-<lang>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDir, outDir, rel, die, readJson, loadStoryboard, langsArg, launch, clock } from './lib/common.mjs';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function sheet({ langs } = {}) {
  const sb = await loadStoryboard();
  langs = langs ?? langsArg(sb.locales);
  const browser = await launch();
  try {
    for (const lang of langs) {
      const dir = path.join(buildDir, lang);
      if (!fs.existsSync(path.join(dir, 'plan.json'))) die(`${lang} has not been composed yet (${rel(dir)}/plan.json).`);
      const plan = readJson(path.join(dir, 'plan.json'));
      const chapterAt = t => plan.chapters.findLast(c => t >= c.start - 1e-6) ?? plan.chapters[0];
      const posterStill = plan.stills.reduce((best, s) => (Math.abs(s.t - plan.poster) < Math.abs(best.t - plan.poster) ? s : best));
      // A chapter's first still: the first one taken once it has begun.
      const firsts = new Set(plan.chapters.map(c => plan.stills.find(s => s.t >= c.start - 1e-6)));
      const cells = plan.stills.map(s => {
        const ch = chapterAt(s.t);
        const first = firsts.has(s);
        return `<figure class="${first ? 'first' : ''}${s === posterStill ? ' poster' : ''}">
          <img src="${pathToFileURL(path.join(dir, 'stills', s.file)).href}">
          <figcaption><b>${clock(s.t)}</b> ${esc(ch.id)}${s === posterStill ? ' · poster' : ''}</figcaption>
        </figure>`;
      }).join('\n');
      const html = `<!doctype html><meta charset="utf-8"><style>
        body { margin: 0; padding: 28px; background: #F7F3EC; color: #1D2427; font: 600 15px/1.3 system-ui, sans-serif; width: max-content; }
        h1 { font-size: 19px; margin: 0 0 18px; }
        h1 span { font-weight: 500; opacity: .7; }
        .grid { display: grid; grid-template-columns: repeat(12, 190px); gap: 18px 12px; }
        figure { margin: 0; }
        img { display: block; width: 190px; border-radius: 10px; box-shadow: 0 1px 4px rgb(59 30 43 / .25); }
        figure.first img { outline: 3px solid #B42318; }
        figure.poster img { outline: 3px solid #1F7A4D; }
        figcaption { margin-top: 6px; font-size: 13px; font-weight: 500; }
        b { font-variant-numeric: tabular-nums; }
      </style>
      <h1>${esc(lang)} · ${plan.width} × ${plan.height} · ${plan.seconds.toFixed(1)} s <span>— a still every half second; a chapter's first has the red edge, the poster frame the green one</span></h1>
      <div class="grid">${cells}</div>`;
      const file = path.join(dir, 'contact-sheet.html');
      fs.writeFileSync(file, html);
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      const out = path.join(outDir, `contact-sheet-${lang}.png`);
      fs.mkdirSync(outDir, { recursive: true });
      await page.screenshot({ path: out, fullPage: true });
      await page.close();
      console.log(`Contact sheet → ${rel(out)}`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await sheet();
