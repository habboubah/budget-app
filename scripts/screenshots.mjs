// Raw store screenshots of Spartopf, in German, English and Arabic.
//
// Six realistic months (salary, rent, insurances, groceries …, generated
// relative to today so the current month is always "Dieser Monat") and four
// category budgets, ten screens per language — the most App Store Connect
// takes per slot — at 1290 × 2796 (430 × 932 pt @3x), as plain app screens.
// Twice: as the iPhone app (for the App Store) and as the Android app (its
// own wording — no iCloud, fingerprint instead of Face ID — and its rounded
// face, for Google Play). Next to each capture, <screen>.marks.json says
// where its parts are (the amount field, a category's card, the month
// report's summary …) for the pieces the store set lifts out of the phone.
//
// These are the raw captures. `npm run store-screenshots` frames and captions
// them at the sizes the stores ask for — upload those, not these.
//
// Usage:  npm run screenshots                          iPhone and Android, de + en + ar (all store-screenshots needs)
//         npm run screenshots -- --ios                 only the iPhone ones  → screenshots/<de|en|ar>/
//         npm run screenshots -- --android             only the Android ones → screenshots/<de|en|ar>-android/
//         npm run screenshots -- --lang ar             one language (or --lang de,en)
//         npm run screenshots -- --only 08-category,10-plan
// Once per machine:  npx playwright install chromium
// Output: screenshots/<lang>[-android]/01-month.png, 01-month.marks.json … 10-plan.png
// (a full run empties each folder first, so screens that left the set leave with it)
//
// Run it on the Mac, so the emoji and the system font are Apple's own. The
// screens, the data and how each screen is reached: scripts/lib/shots.mjs.
import path from 'path';
import { SCREENS, capture, langArg, onlyArg, root } from './lib/shots.mjs';

const args = process.argv.slice(2);
const onlyAndroid = args.includes('--android');
const onlyIos = args.includes('--ios');
const langs = langArg(args);
const ios = langs.map(lang => ({ id: lang, lang }));
const android = langs.map(lang => ({ id: `${lang}-android`, lang, platform: 'android' }));
const variants = onlyAndroid ? android : onlyIos ? ios : [...ios, ...android];

const failed = await capture({ variants, screens: SCREENS, outDir: path.join(root, 'screenshots'), onlyNames: onlyArg(args) });
if (failed.length) {
  console.error(`\n✗ ${failed.length} screen(s) not captured: ${failed.join(', ')}`);
  process.exit(1);
}
const where = variants.map(v => v.id).join(', ');
console.log(`\nDone → screenshots/{${where}}/  (${SCREENS.length} per folder, 1290 × 2796). Next: npm run store-screenshots`);
