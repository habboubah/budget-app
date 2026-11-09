# 16 · Store listing, accessibility labels and permission texts

- **Covers:** S1, S2 and S5 from COMPETITOR_ANALYSIS.md, plus these issues:
  - the listing and the App Review note are out of date;
  - permission prompts are in English only.
- **Depends on:** 00 (the listing must describe the redesigned app)
- **Size:** S
- **Native:** iOS (localized `Info.plist` strings)
- **Schema:** no change

## Why

- **Outdated listing.** `store/listing.md` describes the app as it was before bank import, Insights/*Planen* and budgets.
- **Outdated review note.** The App Review note still says users type everything in by hand.
- **Missing language.** The listing exists only in DE and EN, while the app speaks Arabic.
- **English-only prompts.** The camera and photo permission prompts are English only, even for German users. They come from `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` in `ios/App/App/Info.plist`.

## What the user gets

A store page that shows what the app does, in their language and with accessibility labels, and permission prompts in their language.

## Steps

1. **Listing text** (DE, EN, AR) in `store/listing.md`.
   - Lead with the privacy promise and "kostenlos, ohne Werbung, ohne Abo".
   - Then: the two balances, budgets, bank CSV and screenshot import without a bank login, *Planen*, Excel import, Arabic.
   - Stay within Apple's limits: name 30, subtitle 30, promotional text 170 and keywords 100 characters.
2. **Keywords.**
   - No bank or competitor brand names (App Review Guideline 2.3.7).
   - Check the search results for "Spartopf" against the Sparkasse feature *Spartöpfe*.
   - Keep "Haushaltsbuch" in the name.
3. **App Review note.** Describe:
   - on-device OCR, no network use and no account;
   - local notifications and Face ID;
   - how to test the import with a fixture file.
4. **Privacy policy** (`store/privacy/`). Add local notifications, Face ID, file storage and automatic backups. It still says "no data collected".
5. **Accessibility Nutrition Labels.**
   - Check the redesigned app against Apple's criteria for VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast and Reduced Motion.
   - Declare only what passes, and note the results in `APP_STORE_RELEASE.md`.
6. **Permission texts.** Move them to `InfoPlist.xcstrings` (or `de.lproj`, `en.lproj` and `ar.lproj` `InfoPlist.strings`) with DE, EN and AR texts. Later plans add their own keys there: Face ID, local network, and so on.
7. **Arabic reader check.** Have an Arabic reader look at the € placement in Arabic sentences (REDESIGN.md §9). Decide, and record the rule in CLAUDE.md.

## Done when

- [x] The listing, the review note and the privacy policy match the app.
- [ ] Accessibility labels are declared after the check.
- [ ] Permission prompts appear in the device's language (built; to see on a device).

## Notes (built, 9 November 2026)

- **Listing** (`store/listing.md`): DE, EN and a new AR column and texts.
  Promotional text and description lead with "free, no ads, no subscription,
  no sign-up", then the two balances, bank CSV and photo import without a
  bank login, quick entry, Planen, statistics, privacy (Face ID, reminders,
  encrypted and automatic backups) and the 14 languages. DE/EN name and
  subtitle unchanged. Keywords without brand names and without words from
  the name or subtitle; the Arabic list fits 100 *bytes* in case App Store
  Connect counts bytes.
- **Review note**: rewritten as Apple's six 2.1 answers (recording, purpose,
  how to use incl. *Try it out → Add test data*, external services, regional
  differences, regulated industry), with every permission and why. 3,844 of
  4,000 characters. It describes the build after 1.2.4 (test data, 14
  languages), not the rejected build 5.
- **Privacy policy** (`store/privacy/`, copied to `~/repos/privacy-policy/spartopf/`):
  camera and photos, saving to photos, file imports, Face ID, local
  notifications, where the data lives, the automatic backups, encrypted
  exports, what *Alle Daten löschen* removes. Still "Data Not Collected".
- **Permission prompts**: `InfoPlist.strings` in 14 `.lproj` folders, one
  variant group in the Xcode project. Added `NSPhotoLibraryAddUsageDescription`:
  the year review's picture goes to the share sheet, whose *Save Image* needs
  it (without the key iOS ends the app). Translations drafted, like plan 25's.
- **Not done:** step 5 (accessibility labels — on a device) and step 7 (the
  Arabic € placement — an Arabic reader decides).
