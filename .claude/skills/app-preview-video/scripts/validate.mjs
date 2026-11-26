#!/usr/bin/env node
// Step 3 of the app preview: checks the finished file against what App Store
// Connect takes (reference/app-preview-specs.md), by asking ffprobe what is
// really in it — not what compose meant to write. A file that fails here is
// refused at upload, so the run fails here instead.
//
//   node .claude/skills/app-preview-video/scripts/validate.mjs [--lang de]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDir, outDir, rel, die, readJson, loadStoryboard, langsArg, tool, clock } from './lib/common.mjs';

// App Store Connect › Reference › App preview specifications (read 15 November 2026).
const SPEC = {
  minSeconds: 15,
  maxSeconds: 30,
  maxBytes: 500 * 1024 * 1024,
  maxFps: 30,
  maxLevel: 40,
  profiles: ['Constrained Baseline', 'Baseline', 'Main', 'High'],
  maxBitrate: 12_000_000,
  sampleRates: [44100, 48000],
  extensions: ['.mp4', '.mov', '.m4v'],
  // Portrait and landscape. 886 × 1920 serves every iPhone slot from 6.1″ to 6.9″; 1080 × 1920 is the 5.5″ slot.
  sizes: [[886, 1920], [1920, 886], [1080, 1920], [1920, 1080]],
  defaultPoster: 5,
};

const rate = r => { const [a, b] = String(r).split('/').map(Number); return b ? a / b : a; };

function probe(ffprobe, file) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8' });
  if (r.status !== 0) die(`ffprobe could not read ${rel(file)}: ${r.stderr.trim().split('\n')[0]}`);
  return JSON.parse(r.stdout);
}

/** One file's verdict: what must be fixed, and what is worth knowing. */
export function check(info, file, plan) {
  const errors = [], warnings = [];
  const v = info.streams.filter(s => s.codec_type === 'video');
  const a = info.streams.filter(s => s.codec_type === 'audio');
  const seconds = Number(info.format.duration);
  const bytes = Number(info.format.size);

  if (!SPEC.extensions.includes(path.extname(file).toLowerCase())) errors.push(`the file is a ${path.extname(file)} — Apple takes ${SPEC.extensions.join(', ')}`);
  if (v.length !== 1) errors.push(`${v.length} video tracks — there has to be one`);
  const s = v[0] ?? {};
  if (s.codec_name !== 'h264') errors.push(`the video is ${s.codec_name} — it has to be H.264`);
  if (!SPEC.profiles.includes(s.profile)) errors.push(`H.264 profile "${s.profile}" — Apple takes up to High`);
  if (s.level > SPEC.maxLevel) errors.push(`H.264 level ${s.level / 10} — Apple takes up to 4.0`);
  if (!SPEC.sizes.some(([w, h]) => w === s.width && h === s.height)) errors.push(`${s.width} × ${s.height} — the iPhone slots take 886 × 1920 (6.1″ to 6.9″) or 1080 × 1920 (5.5″)`);
  if (s.pix_fmt !== 'yuv420p') errors.push(`pixel format ${s.pix_fmt} — players expect yuv420p`);
  if (s.field_order && s.field_order !== 'progressive') errors.push(`the video is interlaced (${s.field_order}) — it has to be progressive`);
  const fps = rate(s.r_frame_rate);
  if (fps > SPEC.maxFps + 0.01) errors.push(`${fps} frames a second — Apple takes 30 at most`);
  if (Math.abs(rate(s.avg_frame_rate) - fps) > 0.01) errors.push(`the frame rate is not constant (${s.avg_frame_rate} on average, ${s.r_frame_rate} nominal)`);
  if (seconds < SPEC.minSeconds) errors.push(`${seconds.toFixed(1)} s — Apple takes 15 s at least`);
  if (seconds > SPEC.maxSeconds) errors.push(`${seconds.toFixed(1)} s — Apple takes 30 s at most`);
  if (bytes > SPEC.maxBytes) errors.push(`${(bytes / 1e6).toFixed(0)} MB — Apple takes 500 MB at most`);
  const bitrate = Number(s.bit_rate ?? info.format.bit_rate);
  if (bitrate > SPEC.maxBitrate * 1.05) warnings.push(`${(bitrate / 1e6).toFixed(1)} Mbit/s — Apple's target is 10–12`);

  // Without a stereo track App Store Connect answers "unsupported or corrupted audio".
  if (a.length < 1) errors.push('no audio track — Apple wants a stereo AAC track, even a silent one');
  const t = a[0] ?? {};
  if (a.length && t.codec_name !== 'aac') errors.push(`the audio is ${t.codec_name} — it has to be AAC`);
  if (a.length && t.channels !== 2) errors.push(`${t.channels} audio channel(s) — it has to be stereo`);
  if (a.length && !SPEC.sampleRates.includes(Number(t.sample_rate))) errors.push(`audio at ${t.sample_rate} Hz — Apple takes 44.1 or 48 kHz`);

  if (plan) {
    if (Math.abs(plan.seconds - seconds) > 0.2) warnings.push(`the file runs ${seconds.toFixed(1)} s, the plan says ${plan.seconds.toFixed(1)} s`);
    // Where App Store Connect puts the poster frame until it is set by hand.
    const veiled = plan.captions.some(c => SPEC.defaultPoster >= c.start && SPEC.defaultPoster < c.end);
    if (veiled) warnings.push(`at 0:05, where App Store Connect puts the poster frame by itself, a caption is up — set the poster frame to ${clock(plan.poster)} there`);
    if ((plan.camera?.mode && plan.camera.mode !== 'screencast') || plan.camera?.p95Ms > 50) warnings.push(`filmed choppily (${plan.camera.fps} frames a second, the slowest 5 % ${plan.camera.p95Ms} ms apart) — film the upload on the Mac`);
  }
  return { errors, warnings, seconds, bytes, width: s.width, height: s.height, fps };
}

export async function validate({ langs } = {}) {
  const sb = await loadStoryboard();
  langs = langs ?? langsArg(sb.locales);
  const ffprobe = tool('ffprobe');
  let failed = false;
  console.log('\nfile                                                size         length   MB     status');
  for (const lang of langs) {
    const file = path.join(outDir, `app-preview-${lang}.mp4`);
    if (!fs.existsSync(file)) die(`${rel(file)} is not there — compose ${lang} first.`);
    const planFile = path.join(buildDir, lang, 'plan.json');
    const plan = fs.existsSync(planFile) ? readJson(planFile) : null;
    const r = check(probe(ffprobe, file), file, plan);
    const status = r.errors.length ? 'FAIL' : r.warnings.length ? 'ok, see below' : 'ok';
    console.log(`${rel(file).padEnd(51)} ${`${r.width} × ${r.height}`.padEnd(12)} ${`${r.seconds.toFixed(1)} s`.padEnd(8)} ${(r.bytes / 1e6).toFixed(1).padEnd(6)} ${status}`);
    for (const e of r.errors) console.log(`  ✗ ${e}`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
    if (plan) console.log(`  poster frame: ${clock(plan.poster)} (${rel(path.join(outDir, `poster-${lang}.png`))})`);
    if (r.errors.length) failed = true;
  }
  if (failed) { console.error('\n✗ Not ready to upload — see above.\n'); process.exit(1); }
  console.log('\nReady for App Store Connect (iPhone 6.9″ / 6.5″ / 6.3″ / 6.1″ app previews).');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await validate();
