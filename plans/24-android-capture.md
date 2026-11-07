# 24 · Android capture and widgets

- **Covers:** the Android equivalent of plans 17–19, and the Monefy reviewer's request to read bank messages
- **Depends on:** 23, 19
- **Size:** L
- **Native:** Android
- **Schema:** no change

## What the user gets

- **Bank notifications become entries.** With the user's permission, Spartopf reads notifications from the banking and payment apps they choose and books the payments, as plan 19 does on iOS.
- **Widgets:** balances, open bills, favourite buttons.
- **Quick Settings tile** and **app shortcuts** (long press on the icon): *Ausgabe* and *Einnahme*.
- **Share to Spartopf:** screenshots and CSV files from any app.

## Keep it simple

Nothing changes for people who don't use it. Notification access is a single screen that explains why it's needed and then opens the system setting.

## Privacy and security

- **Permission:** `NotificationListenerService` starts only after the user grants notification access in the system settings.
- **Chosen apps only:** Spartopf ignores every app that isn't on the user's list.
- **On the phone:** texts are parsed on the device, and only the resulting entry is kept.
- **Widgets:** same rule as on iOS, no amounts by default.

## Design

- **Native module** in `android/`, with the same contract as plan 14:
  - a snapshot file and an inbox, both in the app's private storage;
  - read by the web side's `src/native/bridge.ts` through the same API on both platforms.
- **Widgets** use Jetpack Glance. Their buttons add items to the inbox.
- **Shared parser:** plan 19's `parseNotificationText` runs in the web layer, so iOS and Android share the parser and its tests.

## Tests and checks

Two Android devices:

- notification capture with the Sparkasse and PayPal apps;
- the widgets with amounts hidden and shown;
- the tile and the app shortcuts;
- sharing a screenshot and a CSV.

## Done when

- [ ] Notification capture, widgets, the tile, app shortcuts and sharing work on two Android devices with the privacy defaults.
