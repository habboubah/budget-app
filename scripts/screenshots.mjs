// Raw store screenshots of Spartopf, in German, English and Arabic.
//
// Six realistic months (salary, rent, insurances, groceries …, generated
// relative to today so the current month is always "Dieser Monat") and four
// category budgets, ten screens per language — the most App Store Connect
// takes per slot — at 1290 × 2796 (430 × 932 pt @3x), as plain app screens.
// One set for both stores: the App Store and Google Play frame the same
// captures (the iPhone set in an iPhone, Google Play's in a Pixel). None of
// the ten screens names a platform — no iPhone, iCloud or Face ID — and the
// run fails if one ever does. Next to each capture, <screen>.marks.json says
// where its parts are (the amount field, a category's card, the month
// report's summary …) for the pieces the store set lifts out of the phone.
//
// These are the raw captures. `npm run store-screenshots` frames and captions
// them at the sizes the stores ask for — upload those, not these.
//
// Usage:  npm run screenshots                          de + en + ar (all store-screenshots needs)
//         npm run screenshots -- --lang ar             one language (or --lang de,en)
//         npm run screenshots -- --only 03-contracts,10-plan
// Once per machine:  npx playwright install chromium
// Output: screenshots/<lang>/01-month.png, 01-month.marks.json … 10-plan.png
// (a full run empties each folder first, so screens that left the set leave with it)
//
// Run it on the Mac, so the emoji and the system font are Apple's own. The
// screens, the data and how each screen is reached: scripts/lib/shots.mjs.
import fs from 'fs';
import path from 'path';
import { SCREENS, capture, langArg, onlyArg, root } from './lib/shots.mjs';

const args = process.argv.slice(2);
const langs = langArg(args);
const variants = langs.map(lang => ({ id: lang, lang }));
const outDir = path.join(root, 'screenshots');

// Words that tie a screen to one store; the set is shown on both.
const ONE_STORE = /\b(iPhone|iPad|iOS|iCloud|Face ID|Touch ID|Siri|App Store|Google Play|Android)\b|آيفون|آيكلاود/;

const failed = await capture({ variants, screens: SCREENS, outDir, onlyNames: onlyArg(args), forbidden: ONE_STORE });
// The Android folders of the time when Google Play had its own captures.
if (!onlyArg(args)) for (const lang of langs) fs.rmSync(path.join(outDir, `${lang}-android`), { recursive: true, force: true });
if (failed.length) {
  console.error(`\n✗ ${failed.length} screen(s) not captured: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nDone → screenshots/{${langs.join(',')}}/  (${SCREENS.length} per folder, 1290 × 2796, for both stores). Next: npm run store-screenshots`);
