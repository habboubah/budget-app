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
