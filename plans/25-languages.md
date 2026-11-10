# 25 · Turkish and more languages

- **Covers:** F27; Finanzguru reviewers asking for other languages; the large Turkish-speaking community in Germany
- **Depends on:** 07, 16
- **Size:** M per language
- **Native:** strings on iOS and Android
- **Schema:** no change

## What the user gets

Spartopf in Turkish first, then French, Spanish, Italian and Polish. That covers:
- the app itself, including categories and name suggestions
- widgets, Siri phrases and permission prompts
- the store listing

## Keep it simple

On first launch the app follows the device language, as it does today.

## Checklist per language

1. **`src/translations.ts`:** a complete block (e.g. `tr`) with every key, an entry in the `languages` list, and the `locale` (`tr-TR`).
2. **`src/data/defaults.ts`:** names and name suggestions for every built-in category.
3. **Search:** `foldForSearch()` handles the language's special letters.
   - Turkish İ/i and I/ı: use `toLocaleLowerCase('tr')` for Turkish, plus a fold so "istanbul" finds "İstanbul" for every user.
   - Write tests for it.
4. **Amounts:** check `parseAmount()` and the calculator (08) with the language's number format. Turkish writes "1.050,50", like German.
5. **Native strings:** `Localizable.xcstrings`, `InfoPlist.xcstrings` and the App Shortcuts phrases on iOS; `strings.xml` on Android.
6. **Store listing:** in the new language.
7. **Review:** a native speaker checks every string before release. Keep a glossary per language in `plans/glossary.md` (Kontostand, Monatsende, offen, bezahlt, Budget, Spartopf and so on).

## Tests and checks

- Every key exists in the new language (an automated test over `translations.ts`).
- Search folding for the language's letters.
- ui-review in the new language, light and dark.
- A native speaker's sign-off.

## Done when

- [ ] Turkish ships complete, with no German fallbacks, after a native speaker's review.
- [x] The checklist above is in CLAUDE.md for the next language.

## Notes (built, November 2026)

- Scope grew to one language per supported currency's main language: Turkish,
  Polish, Czech, Swedish, Norwegian (Bokmål), Danish, French, Italian,
  Spanish, Dutch and Portuguese (European) — fourteen with de/en/ar. All
  strings, category names and name suggestions are machine-drafted and still
  need a native speaker's review per language (step 7) before they ship as
  final; shipped keywords (`data/keywords.ts`) stay de/en/ar for now.
- Each new language is its own chunk (`src/i18n/xx.ts`, ~15 kB gzip), loaded
  when picked, so the main bundle grew by only ~2 kB (the registry and the
  built-in category names in `data/names.ts`): 304.7 kB gzip against the
  280 kB baseline (+10 % = 308 kB). The suggestion words live in the chunks.
- Schema 19: no new field; built-ins still named as shipped get the eleven
  languages' names (`upgradeCategories`).
- Search folds Turkish ı/İ, ø, æ, œ, ł, đ; `parseAmount` takes the grouping
  mark from the locale's decimal mark instead of `locale.startsWith('de')`.
- ui-review (se and 17promax, all languages): tab labels shortened where they
  truncated (fr *Stats*, es *Análisis*, pt *Análise*, sv *Alternativ*, nb
  *Valg*, da *Opsætning*, nl *Opties*, it *Opzioni*); the hint action button
  got `min-w-tap` (three-letter labels were under 44 px); month titles are
  capitalised.
- (The iOS permission prompts are in all 14 languages since plan 16.)

## Notes (November 2026, the rest of what can be done without reviewers)

- **Siri and Shortcuts** speak the eleven languages too: `Localizable.strings`
  (31 texts — the three intents of plan 18 and the two capture actions of
  plan 19) and `AppShortcuts.strings` (the seven Siri phrases) in every
  `xx.lproj`, registered in the Xcode project. Not compiled yet. Where the
  app says "waiting" for an open entry (sv *väntar*, pl *oczekuje*, cs *čeká*,
  tr *bekliyor* …) the Siri answers use the same word.
- **Category guessing** works in the eleven languages: their words for a
  category are the names they already suggest there (`suggestionNames`), so
  "Kira" finds *Wohnen* in Turkish (`shippedKeywords`, tested). No second
  word list to translate and keep in step. The German, English and Arabic
  lists stay behind them, with the brands.
- **`plans/glossary.md`** (step 7): 34 core terms per language, generated from
  the strings themselves so it can't drift
  (`WRITE_GLOSSARY=1 npx vitest run src/glossary.gen.test.ts`), with a
  *Reviewed* column for the native speaker.
- **Store listing** in the eleven languages: `store/listing-languages.md` —
  name, subtitle, short description, keywords, promotional text and one
  description for both stores, every length checked. Drafts.
- **Android** (`strings.xml`) has only the app's name; nothing to translate.

**Still open, and not something Claude can do:** a native speaker reads each
language — the app's strings, the Siri texts and the store listing — and
ticks the glossary. Until then every one of the eleven is machine-drafted,
Turkish included, and the first *Done when* stays open.
