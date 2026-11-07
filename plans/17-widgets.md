# 17 · Widgets and controls

- **Covers:** F18 and the widget idea in PLAN.md's "Ideas for later". Competitors with widgets: Cashew, Monefy, Money Manager, finanzblick, MoneyControl.
- **Depends on:** 14, 09
- **Size:** L
- **Native:** iOS (WidgetKit extension, SwiftUI)
- **Schema:** no change

## Why

Checking what's left, or logging a coffee, shouldn't mean opening the app. The effort of each entry is the main reason people give up on a Haushaltsbuch.

## What the user gets

- **Small widget:** *Jetzt* and *Am Monatsende*.
- **Medium widget**, in two kinds:
  - the same figures plus the next three open bills;
  - the favourites as buttons that log an entry without opening the app (interactive widgets, iOS 17).
- **Lock screen:**
  - "≈ 72 € pro Tag" (rectangular);
  - the paid ring (circular).
- **Control Center and Action button:** *Eintrag hinzufügen* opens the entry sheet (controls, iOS 18).
- **Taps:** tapping a widget opens the right place, the month or the entry sheet.

## Keep it simple

Nothing changes inside the app. Widgets live where iOS users look for widgets. One line in *Optionen* explains the switch for showing amounts.

## Privacy and security

- **No amounts outside the app by default.**
  - Widgets show labels and the ring ("6 von 9 bezahlt"), but no money.
  - Money appears only once *Beträge in Widgets zeigen* is on, under *Optionen › Sicherheit und Mitteilungen*.
  - With the app lock on, amounts on the lock screen are also hidden while the phone is locked (`.privacySensitive()` redaction).
- **Favourite buttons** only add an item to the inbox. They never read data.

## Design

- **Target:** a new target, `SpartopfWidgets` (WidgetKit + SwiftUI), in the App Group. It reads `snapshot.json` (14).
- **Colours:** the accent gradient and the category hues, as static colours per accent and theme.
  - A small script generates one Swift file from `src/index.css`, so widget colours stay in step with the app's tokens.
  - SF Rounded for money.
  - Support the tinted and clear rendering modes.
- **Buttons:**
  - an `AppIntent` that adds an inbox item (favourite → entry);
  - `widgetURL` / `OpenURLIntent` for the deep links.
- **Timeline:** reload when the snapshot changes (plan 14 calls `reloadAllTimelines`), plus one entry at midnight.
- **Strings:** `Localizable.xcstrings` in DE, EN and AR, with an RTL layout.
- **Release:**
  - `scripts/release.js` archives the extension.
  - Signing and `ExportOptions.plist` include it.

## Steps

1. Target, App Group and snapshot reader; the small widget, with amounts hidden and shown.
2. Medium and lock-screen widgets; the favourite buttons.
3. The Control Center control.
4. The colour script, localization and the release script.

## Tests and checks

On a device:

- Every widget size in DE and AR, in light, dark and tinted mode.
- Amounts are hidden by default.
- A favourite button adds an entry while the app is closed; it shows up, with undo, when the app opens.
- With the app lock on, nothing readable is on the lock screen.

## Done when

- [ ] All widgets and the control work.
- [ ] They respect the privacy defaults.
- [ ] They ship through the release script.
