# 22 · iPad and wide screens

- **Covers:**
  - F21.
  - Competitors with iPad apps: YNAB, Copilot, Wallet, Money Manager, Finanzguru, Outbank, finanzblick, MoneyControl, Cashew, Bluecoins.
  - MoneyControl's latest update also adapts to the iPhone Duo's wider screen.
- **Depends on:** 00, 17
- **Size:** M
- **Native:** iOS (target settings)
- **Schema:** no change

## What the user gets

Spartopf on iPad:

- **Landscape:** the month on one side, *Planen* or *Statistik* on the other.
- **Sheets:** centred panels.
- **Keyboard shortcuts:** ⌘N new entry, ⌘F search, ←/→ to change month.
- **Widgets:** on iPad too.

## Keep it simple

Nothing changes on the iPhone. On the iPad it's the same app, just wider.

## Design

- **Device family:** set `TARGETED_DEVICE_FAMILY` to `"1,2"`. `Info.plist` already lists the iPad orientations.
- **Layout by width, not by device:**
  - Below 700 pt: the phone layout.
  - From 700 pt: two columns (month + detail pane), built on `ui/Screen`.
  - `ui/useWidth.ts` drives this, so a wide iPhone gets the two columns too (the iPhone Duo when open, if it exists).
- **Sheets:** at most 560 pt wide and centred. Menus stay anchored as they are today.
- **Keyboard:** a `useShortcuts` hook on keydown. It leaves text fields alone and swaps the arrow keys in RTL.
- **`scripts/ui-review.mjs`:** add iPad 11" (820 × 1180) and 13" (1032 × 1376), in portrait and landscape.
- **Store:** iPad screenshots (13") come in plan 38.

## Tests and checks

- ui-review on the iPad sizes in DE and AR.
- A real iPad with a hardware keyboard: the shortcuts, both orientations and Split View.

## Done when

- [ ] The app passes ui-review on the iPad sizes and works on a real iPad with a keyboard. (The layout, the shortcuts and ui-review on the iPad sizes in DE and AR are done; the real iPad waits for the device family, see below.)

## Notes (built)

Where the build differs from the plan above:

- **The iPad target is not switched on yet.** `TARGETED_DEVICE_FAMILY` is still `1`. Turning it to `"1,2"` is a decision for the release: once a build with iPad support is in the App Store it cannot be taken back, and every submission then needs 13" iPad screenshots (plan 38). It is one line in Xcode (*App › General › Supported Destinations › iPad*); it is in TODO.md. Until then an iPad runs the iPhone app, and the layout is ready for the day it is switched.
- **Which pane:** the month is always on the leading side. Beside it is what the tab bar picks — *Statistik* first, *Planen*, *Optionen* — and every pushed screen (categories, reports, accounts …) opens there. The tab bar has three tabs then, and sits over that pane with the add button.
- **Two scrolling columns** instead of one page: each side keeps its place while the other scrolls.
- **No swipe-back** in two columns; the back button and the keyboard stay.
- **Sheets** were already centred panels from 640 px, 512 px wide; nothing to change.
- **⌘N in a desktop browser** opens a browser window — the browser keeps that one. In the app (WKWebView) it reaches Spartopf.
- **Widgets on iPad** come with plan 17.
