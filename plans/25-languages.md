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
- [ ] The checklist above is in CLAUDE.md for the next language.
