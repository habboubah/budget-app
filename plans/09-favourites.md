# 09 · Favourites

- **Covers:**
  - U5.
  - Competitor equivalents: Money Manager bookmarks, Wallet templates, MoneyControl shortcuts (praised in reviews).
  - Groundwork for widget buttons (17), Siri (18) and the Watch (35).
- **Depends on:** 00
- **Size:** S–M
- **Native:** none
- **Schema:** bump (`AppData.favorites?`)

## Why

The small daily things (Bäcker, Tanken, Kantine) are the entries people give up on. One tap should be enough.

## What the user gets

- **Pinning:** *Als Favorit merken*, in an entry's "⋯" menu and in the entry sheet.
- **Using:** at the top of a new entry's sheet, the favourites appear as chips ("🥐 Bäcker 4,80 €").
  - A tap saves the entry straight away, dated today and paid, with the usual undo toast.
  - A long press opens it pre-filled, to change something first.
- **Managing:** *Optionen › Haushaltsbuch › Favoriten*, to reorder and remove them.

## Keep it simple

- The chip row doesn't exist until the first favourite is pinned.
- At most 8 favourites. They fit on two lines, so there's no "Alle" chip.

## Design

- **Type:** `Favorite = { id, name, categoryId, amount?: number, repeat?: Repeat }`.
- **Storage:** `AppData.favorites?: Favorite[]`, in backups and `normalizeState`.
- **Deleted category:** a favourite whose category was deleted falls back to `extra` (Sonstiges), the same rule entries follow.
- **No amount:** tapping a favourite without one opens the sheet with the amount focused, instead of saving.
- **`createEntry` in `App.tsx`:** gets a path from a favourite. It already sets `lastCategory` and shows the toast.

## Tests and checks

- Normalising bad favourites.
- The category fallback.
- An entry created from a favourite has today's date, is paid, and takes the favourite's repeat.
- ui-review: the entry sheet with 0, 3 and 8 favourites, in DE and AR.

## Done when

- [x] Pinning, using, reordering and removing all work.
- [x] Undo works after a one-tap save.

## Notes (built)

- Type `Favorite` (`types.ts`); `AppData.favorites?` (schema **12**, optional, in backups). `normalizeFavorites` in `logic.ts` (tested): name + category required, a deleted category falls to `extra`, bad amount/repeat dropped, capped to `MAX_FAVORITES = 8`.
- `store.ts`: `favorites` state (data, serialised only when non-empty), `addFavorite` (dedupes, respects the cap), `removeFavorite`/`restoreFavorite` (undo), `reorderFavorites`; reset/import/restore handle it.
- `EntrySheet.tsx`: a chip row at the top of a **new** entry — `FavoriteChip` (tap = use, 500 ms long-press = open pre-filled). "Als Favorit merken" button builds a favourite from the current draft. `App.tsx` `addFromFavorite`: with an amount it saves straight away (today, paid) with the undo toast; without one it opens the sheet, amount focused.
- `FavoritesView.tsx` (pushed under *Optionen › Haushaltsbuch › Favoriten*): reorder (up/down) and remove with undo. Settings row shows the count.
- Decision taken here: entries open straight into the sheet (there is no per-row "⋯" menu in this design), so the sheet's "Als Favorit merken" is the entry's pin action; reordering is up/down buttons rather than drag (simpler, VoiceOver-friendly).
- Still to do: ui-review of the sheet with 0/3/8 favourites in DE + AR on device.

## Not in this plan

Favourites in widgets (17), Siri (18) and the Watch (35).
