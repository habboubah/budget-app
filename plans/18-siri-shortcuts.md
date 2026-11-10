# 18 · Siri and Shortcuts

- **Covers:** F19. YNAB has Siri; Cashew and Wallet have Shortcuts actions.
- **Depends on:** 14, 09
- **Size:** M
- **Native:** iOS (App Intents)
- **Schema:** no change

## What the user gets

- **By voice:** "Hey Siri, Ausgabe in Spartopf: 12 Euro Tanken." The entry is booked, Siri confirms it, and the app shows an undo.
- **App Shortcuts** in the Shortcuts app and in Spotlight:
  - **Eintrag hinzufügen**
  - **Was bleibt am Monatsende?**
  - **Offene Rechnungen**
- **In automations:** users can put these actions into their own automations.

## Keep it simple

There's nothing to set up: iOS shows the actions in Siri and Shortcuts by itself. The app mentions them once, as one of plan 37's tips.

## Privacy and security

- Everything runs on the device through App Intents.
- Actions that answer with amounts require an unlocked phone and respect the app lock (`authenticationPolicy`).

## Design

- **`AddEntryIntent`:** `amount: IntentCurrencyAmount`, `name: String?`, `category: CategoryEntity?`, `date: Date?`, `paid: Bool = true`. It creates an inbox item with `source: 'siri'`.
- **`CategoryEntity`:** built from the snapshot's categories, with localized names and emoji.
- **`MonthEndIntent` and `OpenBillsIntent`:** read the snapshot. If amounts are hidden, they answer only after the phone is unlocked.
- **`AppShortcutsProvider`:** phrases in DE, EN and AR, each with `\(.applicationName)`.

## Tests and checks

On a device, try every phrase in every language:

- with the app closed, and with it open (the inbox is read on resume);
- with the app lock on.

## Done when

- [ ] The three actions work by voice and in Shortcuts, in all three languages.

## Notes (built)

- **Where the amounts come from.** The widget snapshot holds no amounts on purpose (plan 14). So the answers read a second file, `amounts.json`, built by `buildAmounts` (src/native/snapshot.ts): the main account's two balances, the next three open bills with their amounts, and how many bills are open. It has class Complete, so it can't be read while the phone is locked. It is written with the snapshot, but only while the app lock is off; with the lock on, it is removed. It counts only for the running month: in a new month, the app has to be opened once first. Without the file, both actions say "Öffne Spartopf, um es zu sehen." (TODO.md had this as option (b).) *Beträge verbergen* doesn't stop them: as the plan says, they answer once the phone is unlocked.
- **Swift:** `ios/App/App/SpartopfIntents.swift`, in the app target, not an extension. App Intents need iOS 16, and the app still supports 15, so everything is `@available(iOS 16.0, *)`. `AddEntryIntent` (amount as `IntentCurrencyAmount`, name, `CategoryEntity`, date, paid) writes `inbox/siri-<uuid>.json`. The book's own currency wins over the one spoken. `MonthEndIntent` and `OpenBillsIntent` have `authenticationPolicy = .requiresAuthentication`. `SpartopfShortcuts` uses `AppShortcut(intent:phrases:)` (iOS 16's initializer; newer SDKs mark it deprecated in favour of the one with `shortTitle`, which is a warning, not an error). `SpartopfShared` got `writeAmounts` / `removeAmounts`, and `clear` removes the file too.
- **Texts:** English in the code, German and Arabic in `de.lproj` / `ar.lproj` (`Localizable.strings` for titles and answers, `AppShortcuts.strings` for the phrases), added to the Xcode project as variant groups. The other eleven languages fall back to English. Siri speaks several of them, so translating them is a follow-up.
- **Not checked here:** the Swift has not been compiled (no Xcode in this environment). It needs a build, and then the phrases tried on a device.
