#!/usr/bin/env node
// The app preview, from nothing to the files for App Store Connect:
//   film → compose → validate → contact sheet
//
//   npm run app-preview                    every language
//   npm run app-preview -- --lang de       one language
//   npm run app-preview -- --compose       keep the footage, make the video again
//                                          (after changing a caption, a hold, the theme)
//
// Once per Mac: npx playwright install chromium, brew install ffmpeg.
// Out: screenshots/store/app-preview/ — app-preview-<lang>.mp4, poster-<lang>.png,
// contact-sheet-<lang>.png. Film the upload on the Mac (Apple's emoji and
// system font, and a smooth film); a Linux container is good for a proof.
import { loadStoryboard, langsArg, flag, tool, outDir, rel, copyFor, die } from './lib/common.mjs';
import { film } from './film.mjs';
import { compose, copyProblems } from './compose.mjs';
import { validate } from './validate.mjs';
import { sheet } from './sheet.mjs';

const sb = await loadStoryboard();
const langs = langsArg(sb.locales);
// Before anything is filmed: a missing ffmpeg or a caption that is too long
// should not cost a film.
tool('ffmpeg');
tool('ffprobe');
for (const lang of langs) {
  const problems = copyProblems({ sb, copy: copyFor(lang), lang });
  if (problems.length) die(`${lang}: the words need another look:\n  - ${problems.join('\n  - ')}`);
}

const started = Date.now();
if (!flag('--compose')) await film({ langs });
await compose({ langs });
await sheet({ langs });
await validate({ langs });
console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s → ${rel(outDir)}/`);
