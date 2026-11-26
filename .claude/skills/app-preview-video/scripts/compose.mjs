#!/usr/bin/env node
// Step 2 of the app preview: makes the video from the footage. Lays the
// chapters out on one timeline (the plan), draws every frame of it on the
// stage (templates/stage.html) — the footage, and over it the caption on its
// veil, the light on a part of the screen, the touch dots, the end card — and
// hands the frames to ffmpeg, which encodes what App Store Connect takes:
// H.264, 30 frames a second, with a stereo AAC track.
//
//   node .claude/skills/app-preview-video/scripts/compose.mjs [--lang de]
//
// It films nothing, so it is the step to rerun after changing a caption, how
// long one stands, the theme or the end card (npm run app-preview -- --compose).
// Out: screenshots/store/app-preview/app-preview-<lang>.mp4 and poster-<lang>.png;
// the plan and a still every half second stay in build/app-preview/<lang>/.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  root, skillDir, buildDir, outDir, rel, die, readJson, loadStoryboard, theme as loadTheme, copyFor,
  langsArg, launch, tool, round, clock, shooter,
} from './lib/common.mjs';

/** The film may be played this much faster to come in under the longest length Apple takes. */
const MAX_SPEED = 1.15;
/** A change of place between two chapters dissolves over this long. */
const DISSOLVE = 0.35;
const sum = list => list.reduce((a, b) => a + b, 0);
const wordsIn = text => text.trim().split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;

// What an App Store preview must not say: what the app costs (Apple reads
// "free" as a price, and prices differ by country) and what to do about it.
const BANNED = [
  [/\b(kostenlos|gratis|umsonst|free|preis\w*|price\w*|abo|abos|subscription\w*|in-app)\b|[€$]/i, 'speaks about the price'],
  // Arabic has no \b (it is ASCII-only in JavaScript): free, subscription, price, purchase.
  [/مجان|اشتراك|سعر|أسعار|شراء/, 'speaks about the price'],
  [/\b(jetzt laden|jetzt herunterladen|jetzt installieren|download now|get it now|install now)\b/i, 'is a call to action'],
  [/\b(beste[rsnm]?|best|nr\.? ?1|number one)\b|#1/i, 'is a superlative nobody can check'],
];

/** A caption's fades. The first one has no way in: it is there from the first frame. */
const CAPTION_IN = 0.28, CAPTION_OUT = 0.32;

/**
 * What is wrong with a language's words, before anything is filmed or drawn:
 * a caption is read at a glance, muted, at thumbnail size — and an App Store
 * preview may not say what the app costs.
 */
export function copyProblems({ sb, copy, lang }) {
  const problems = [];
  const texts = [];
  let first = true;
  for (const ch of sb.chapters) {
    if (ch.card) {
      if (!copy.card?.name) problems.push(`config/copy.${lang}.json has no card.name for the end card.`);
      texts.push(copy.card?.name ?? '', ...(copy.card?.points ?? []));
      continue;
    }
    if (!ch.caption) { first = false; continue; }
    const text = copy.captions?.[ch.caption];
    if (!text) { problems.push(`Chapter "${ch.id}" shows the caption "${ch.caption}", which config/copy.${lang}.json › captions does not have.`); continue; }
    texts.push(text);
    if (wordsIn(text) > 5) problems.push(`"${text}": ${wordsIn(text)} words — a caption has five at most.`);
    // Half a second to find it, a fifth of a second a word, and its fades on top.
    const read = round(0.5 + 0.18 * wordsIn(text) + (first ? 0 : CAPTION_IN) + CAPTION_OUT, 1);
    const hold = ch.hold ?? 1.6;
    if (hold < read - 0.01) problems.push(`"${text}" stands ${hold.toFixed(1)} s — too short to read. Give chapter "${ch.id}" hold: ${read.toFixed(1)} or more (config/storyboard.mjs).`);
    first = false;
  }
  for (const text of texts) {
    for (const [pattern, why] of BANNED) if (pattern.test(text)) problems.push(`"${text}" ${why} — not in an App Store preview (reference/app-preview-specs.md).`);
  }
  return problems;
}

/**
 * The plan: the whole video as data, in seconds of the finished video. The
 * storyboard says what a chapter is (caption, hold, card), the footage how
 * long its filmed part ran and what happened in it; this puts them in a row.
 */
export function makePlan({ sb, footage, copy, th, lang }) {
  const { video } = sb;
  const problems = copyProblems({ sb, copy, lang }), notes = [];
  if (problems.length) return { plan: null, problems, notes };
  const filmed = Object.fromEntries(footage.chapters.map(c => [c.id, c]));

  const parts = sb.chapters.map(ch => {
    if (ch.card) return { ch, card: true, seconds: ch.seconds ?? 2.6 };
    const f = filmed[ch.id];
    if (!f) die(`Chapter "${ch.id}" has no footage in ${rel(path.join(buildDir, lang))} — the storyboard changed since it was filmed. Run \`npm run app-preview\` without --compose.`);
    const text = ch.caption ? copy.captions[ch.caption] : null;
    return { ch, f, text, hold: text ? ch.hold ?? 1.6 : 0, play: f.seconds };
  });

  // The length. Captions and the end card keep theirs; the filmed parts give way.
  const fixed = sum(parts.map(p => (p.card ? p.seconds : p.hold)));
  const play = sum(parts.filter(p => !p.card).map(p => p.play));
  let speed = 1;
  if (fixed + play > video.maxSeconds) {
    speed = play / (video.maxSeconds - fixed);
    const table = parts.map(p => `    ${p.ch.id.padEnd(10)} ${p.card ? `${p.seconds.toFixed(1)} s (card)` : `${p.hold.toFixed(1)} s caption + ${p.play.toFixed(1)} s film`}`).join('\n');
    if (speed > MAX_SPEED || video.maxSeconds <= fixed) {
      die(`${lang}: the film is ${(fixed + play).toFixed(1)} s, and Apple takes ${video.maxSeconds} s at most — too much to play faster.\n${table}\n  Take a step out of a chapter or shorten its pauses (config/storyboard.mjs), then film again.`);
    }
    notes.push(`played ${Math.round((speed - 1) * 100)} % faster to fit ${video.maxSeconds} s (the film ran ${(fixed + play).toFixed(1)} s)`);
  }
  if (fixed + play / speed < video.minSeconds) {
    die(`${lang}: the film is ${(fixed + play).toFixed(1)} s, and Apple takes ${video.minSeconds} s at least. Give a chapter more to show (config/storyboard.mjs).`);
  }

  const plan = {
    lang, fps: video.fps, width: video.width, height: video.height, scale: video.scale,
    dir: copy.dir ?? 'ltr', safeArea: video.safeArea, statusBar: video.statusBar || null,
    theme: th, speed: round(speed, 4),
    clips: [], captions: [], lights: [], zooms: [], taps: [], chapters: [], poster: null,
    footage: Object.fromEntries(footage.chapters.map(c => [c.id, { theme: c.theme, frames: c.frames.map(f => [f.t, `/footage/${f.file}`]) }])),
    card: null,
  };

  let T = 0, last = null, first = true;
  for (const p of parts) {
    const start = T;
    if (p.card) {
      if (!last) die('The end card needs a filmed chapter before it.');
      plan.clips.push({ type: 'card', start: T, end: T + p.seconds, fade: 0.45, under: { chapter: last.id, t: last.seconds } });
      plan.card = { icon: '/icon.png', name: copy.card.name, points: copy.card.points ?? [] };
      T += p.seconds;
      plan.chapters.push({ id: p.ch.id, start, end: T, card: true });
      continue;
    }
    // A chapter with a setup starts somewhere else than the last one ended.
    const dissolve = p.ch.setup && last ? { chapter: last.id, t: last.seconds, dur: DISSOLVE } : null;
    if (p.hold) {
      plan.clips.push({ type: 'hold', chapter: p.ch.id, start: T, end: T + p.hold, at: 0, dissolve });
      // The first caption is there from the first frame: it is what a search result shows.
      plan.captions.push({ start: T, end: T + p.hold, in: first ? 0 : CAPTION_IN, out: CAPTION_OUT, text: p.text, chapter: p.ch.id });
      T += p.hold;
    }
    const at = t => round(T + t / speed);
    plan.clips.push({ type: 'play', chapter: p.ch.id, start: T, end: T + p.play / speed, from: 0, speed, dissolve: p.hold ? null : dissolve });
    for (const e of p.f.events) {
      if (e.type === 'tap' && video.touchDots !== false) plan.taps.push({ t: at(e.t), x: e.x, y: e.y });
      if (e.type === 'light') plan.lights.push({ start: at(e.t0), end: at(e.t1), boxes: e.boxes });
      if (e.type === 'zoom') plan.zooms.push({ start: at(e.t0), end: at(e.t1), box: e.box, scale: e.scale });
      if (e.type === 'poster') plan.poster = at(e.t);
    }
    T += p.play / speed;
    plan.chapters.push({ id: p.ch.id, start, end: T, caption: p.text ?? null });
    last = p.f;
    first = false;
  }
  plan.seconds = round(T);
  plan.frames = Math.round(T * video.fps);

  for (const z of plan.zooms) if (z.scale > 1.25) notes.push(`a zoom to ${z.scale}× — past 1.25 the picture goes soft, and Apple asks for the app at its own resolution`);

  // The poster frame: the still the App Store shows where the video does not
  // play. A moment the storyboard marked (a.poster()), else the middle of the
  // longest filmed stretch.
  if (plan.poster == null) {
    const longest = plan.clips.filter(c => c.type === 'play').sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
    plan.poster = round((longest.start + longest.end) / 2);
    notes.push(`no chapter marks the poster frame (a.poster()) — took ${clock(plan.poster)}`);
  }
  // Never the frame a caption comes in on.
  const veiled = plan.captions.find(c => plan.poster >= c.start - 0.05 && plan.poster < c.end);
  if (veiled) plan.poster = round(Math.max(0, veiled.start - 0.1));
  plan.poster = Math.min(plan.poster, (plan.frames - 1) / video.fps);
  return { plan, problems, notes };
}

/* ----------------------------------------------------------------- serving */

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

/** The stage, the type, the icon and one language's footage, on a port of their own. */
async function serve(th, lang) {
  const mounts = [
    ['/stage/', path.join(skillDir, 'templates')],
    ['/assets/', path.join(skillDir, 'assets')],
    ['/fonts/', path.join(root, th.font.files)],
    ['/footage/', path.join(buildDir, lang)],
  ];
  const icon = path.join(root, th.icon);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = url === '/icon.png' ? icon : null;
    for (const [prefix, dir] of mounts) {
      if (!file && url.startsWith(prefix)) {
        const wanted = path.join(dir, url.slice(prefix.length));
        if (wanted.startsWith(dir)) file = wanted;
      }
    }
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(() => r())) };
}

/* ---------------------------------------------------------------- encoding */

/**
 * ffmpeg, fed PNG frames on stdin. What comes out is what App Store Connect
 * asks for (reference/app-preview-specs.md): H.264 up to High Profile Level
 * 4.0, progressive, 30 frames a second, at most 12 Mbit/s, with a stereo AAC
 * track at 256 kbit/s — silence, or the storyboard's music.
 */
function encoder({ ffmpeg, file, video, seconds }) {
  const music = video.music ? path.resolve(root, video.music) : null;
  if (music && !fs.existsSync(music)) die(`The storyboard's music (${video.music}) is not there.`);
  const audioIn = music
    ? ['-stream_loop', '-1', '-i', music]
    : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];
  const audioFx = music ? ['-af', `afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, seconds - 1.4).toFixed(2)}:d=1.4`] : [];
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(video.fps), '-c:v', 'png', '-i', 'pipe:0',
    ...audioIn,
    '-map', '0:v:0', '-map', '1:a:0',
    // sRGB pictures → BT.709 video, said so in the file, so the teal stays the icon's teal.
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p',
    '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-preset', 'slow',
    '-crf', '14', '-maxrate', '12M', '-bufsize', '24M',
    '-r', String(video.fps), '-g', String(video.fps * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    ...audioFx,
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-t', seconds.toFixed(3), '-movflags', '+faststart',
    file,
  ];
  const child = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'pipe'] });
  let err = '';
  child.stderr.on('data', d => { err += d; });
  const closed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg stopped (${code}):\n${err.trim().split('\n').slice(-6).join('\n')}`))));
  });
  child.stdin.on('error', () => {}); // ffmpeg's own message, above, is the one that matters
  return {
    async write(buf) { if (!child.stdin.write(buf)) await once(child.stdin, 'drain'); },
    async end() { child.stdin.end(); await closed; },
  };
}

/* ----------------------------------------------------------------- compose */

export async function compose({ langs } = {}) {
  const sb = await loadStoryboard();
  langs = langs ?? langsArg(sb.locales);
  const ffmpeg = tool('ffmpeg');
  const th = loadTheme();
  const { video } = sb;
  fs.mkdirSync(outDir, { recursive: true });

  // The stage is as dense as the footage: one pixel of film is one pixel of video.
  const browser = await launch([`--force-device-scale-factor=${video.scale}`]);
  try {
    for (const lang of langs) {
      const dir = path.join(buildDir, lang);
      if (!fs.existsSync(path.join(dir, 'footage.json'))) die(`${lang} has not been filmed yet (${rel(dir)}/footage.json). Run \`npm run app-preview\` without --compose.`);
      const footage = readJson(path.join(dir, 'footage.json'));
      if (footage.video.width !== video.width || footage.video.height !== video.height) die(`${lang} was filmed at ${footage.video.width} × ${footage.video.height}, the storyboard now says ${video.width} × ${video.height}. Film again.`);
      const { plan, problems, notes } = makePlan({ sb, footage, copy: copyFor(lang), th, lang });
      if (problems.length) die(`${lang}: the copy needs another look (config/copy.${lang}.json, config/storyboard.mjs):\n  - ${problems.join('\n  - ')}`);

      const stills = path.join(dir, 'stills');
      fs.rmSync(stills, { recursive: true, force: true });
      fs.mkdirSync(stills, { recursive: true });
      const server = await serve(th, lang);
      const ctx = await browser.newContext({ viewport: { width: video.width / video.scale, height: video.height / video.scale }, deviceScaleFactor: video.scale });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${server.origin}/stage/stage.html`, { waitUntil: 'load' });
      const cdp = await ctx.newCDPSession(page);
      const dressed = await page.evaluate(p => window.stage.init(p), plan);
      if (dressed.missingFonts.length) die(`The type did not load (${dressed.missingFonts.join(', ')}): config/theme.json › font, assets/fonts.css.`);
      for (const c of dressed.captions) {
        if (!c.fits) die(`${lang}: "${c.text}" does not fit ${th.caption.maxLines} lines even at the smallest size. Shorten it (config/copy.${lang}.json).`);
      }

      console.log(`Composing ${lang}: ${plan.seconds.toFixed(1)} s, ${plan.frames} frames`);
      for (const c of plan.chapters) console.log(`  ${clock(c.start).padStart(7)}  ${c.id.padEnd(10)} ${c.card ? plan.card.name : c.caption ?? ''}`);
      for (const n of notes) console.log(`  · ${n}`);

      const snap = shooter(page, cdp, { width: video.width, height: video.height }, 'png');

      const file = path.join(outDir, `app-preview-${lang}.mp4`);
      const out = encoder({ ffmpeg, file, video, seconds: plan.frames / video.fps });
      const posterFrame = Math.round(plan.poster * video.fps);
      const stillEvery = Math.round(video.fps / 2);
      const stillList = [];
      try {
        for (let n = 0; n < plan.frames; n += 1) {
          await page.evaluate(i => window.stage.render(i), n);
          if (errors.length) throw new Error(`the stage: ${errors[0]}`);
          const png = await snap();
          await out.write(png);
          if (n % stillEvery === 0) {
            const name = `${String(n).padStart(5, '0')}.png`;
            fs.writeFileSync(path.join(stills, name), png);
            stillList.push({ file: name, t: round(n / video.fps, 2) });
          }
          if (n === posterFrame) fs.writeFileSync(path.join(outDir, `poster-${lang}.png`), png);
          if (process.stdout.isTTY && n % 15 === 0) process.stdout.write(`\r  frame ${n + 1} / ${plan.frames}`);
        }
        if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
        await out.end();
      } catch (e) {
        await ctx.close();
        await server.close();
        die(`${lang}: ${e.message}`);
      }
      await ctx.close();
      await server.close();

      // What the other steps read: the validator (lengths, the poster frame) and the contact sheet.
      const { theme: _theme, footage: _footage, ...lean } = plan;
      fs.writeFileSync(path.join(dir, 'plan.json'), `${JSON.stringify({ ...lean, file: rel(file), captionSizes: dressed.captions, stills: stillList, camera: footage.camera, filmed: footage.filmed }, null, 1)}\n`);
      console.log(`  → ${rel(file)}   poster frame at ${clock(plan.poster)} → ${rel(path.join(outDir, `poster-${lang}.png`))}`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await compose();
