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

- [ ] The app passes ui-review on the iPad sizes and works on a real iPad with a keyboard.
