# 00 · Finish the redesign

- **Covers:**
  - F1 budgets, U3 per-day figure, F12 search all months, F13 Abos & Verträge, F16 reminders, F17 Face ID lock, U1 first run
  - U4 in part ("Wofür das Geld geht")
- **Depends on:** —
- **Size:** L
- **Native:** iOS (reminders, lock)
- **Schema:** 9 (budgets, already in the code); contracts as REDESIGN.md §6.7

## Why

REDESIGN.md is approved and half built. Steps 1–3 are done, and budgets (step 4) are in the working tree but not committed. Every later plan builds on what it introduces:

- **Navigation:** one pushed screen per tab, `ui/Menu`, the sheet toolbar.
- **Tabs:** *Planen* and *Optionen*.
- **Schema:** version 9.

Finishing it first means nothing gets built twice.

## Scope

REDESIGN.md §8, steps 4–14, exactly as written there. REDESIGN.md stays the source of truth for the design. This plan only adds the points below, so later plans don't have to reopen these steps.

| Step | Add to it |
|---|---|
| 4 Budgets | Add a schema-8 payload as a fixture (plan 01 picks it up). Check that `limit` survives a backup export and import. |
| 7 Search | Keep `searchEntries` a pure function over any list of entries. Plans 26 (tags) and 30 (accounts) extend it. |
| 9 Planen | Keep room on *Planen* for later cards, in this order: Budgets, Abos & Verträge, Spartöpfe (12), Rücklage (11), Schulden (31), then the hints. `AppData.contracts` goes into backups and `normalizeState`. |
| 10 Optionen | Group the rows so later plans have a home (see the list below this table). |
| 11 Reminders | Build `reminderPlan()` as one scheduler with pluggable sources, so plans 03 (backup nudge), 12 (goals), 13 (month review) and 31 (debts) can add one without touching scheduling. Pin `@capacitor/local-notifications` to an exact version. No amounts in notification texts by default. |
| 12 Face ID lock | The lock must: <ul><li>cover the app before the first frame on a cold start, so balances never flash;</li><li>blank the app-switcher snapshot;</li><li>fall back to the device passcode;</li><li>lock after 1 minute in the background by default.</li></ul> Pick the plugin after the vetting REDESIGN.md describes, and record the choice and the reason in CLAUDE.md. Plan 06 adds protection for the data itself. |
| 13 First run | No currency step: plan 07 takes the currency from the device region. At most three steps. |
| 14 Final pass | Commit in small pieces. Update CLAUDE.md, PLAN.md and README.md, and tick REDESIGN.md §10. |

The *Optionen* groups for step 10:

- **Sicherheit und Mitteilungen:** lock, reminders. Later: backup switch and *Beträge verbergen* (06), widget amounts (17), automatic capture (19).
- **Darstellung:** language, appearance, colour. Later: currency (07).
- **Haushaltsbuch:** categories and budgets. Later: favourites (09), rules (20), accounts (30), month start (32).
- **Sichern und übertragen:** backup, Excel, CSV. Later: automatic backups (03), encrypted files (04), transfer (33), sharing (34), bank (36).

## Done when

- [ ] Every step in REDESIGN.md §10 is ticked and committed.
- [ ] `npm run lint`, `npm test`, `npm run audit:contrast` and `node scripts/ui-review.mjs` are all clean.
- [ ] The additions in the table above are in.

## Not in this plan

Everything in plans 01–38.

## Notes (done)

- Steps 8–14 are in REDESIGN.md §10, one commit each (11 and 12 share one).
- The additions above: the schema-8 and schema-9 fixtures are in
  `src/fixtures/` with `fixtures.test.ts` (golden balances; `limit` survives a
  round trip, also in `budgets.test.ts`); `searchEntries` stays pure; *Planen*
  opens Budgets → Abos & Verträge, room left below for 12, 11, 31;
  `reminderPlan()` takes sources (`ReminderSource`); `@capacitor/local-notifications`
  is pinned to 8.3.1; no amounts in notifications by default; the Optionen
  groups are as listed (Sicherheit und Mitteilungen shows in the iPhone app).
- The lock: covered from the first render (the flag is read synchronously and
  only `LockScreen` renders while locked), passcode fallback, one minute in
  the background. The app-switcher snapshot is covered from JavaScript; if a
  device shows the book in the switcher, move the cover into
  `SceneDelegate.sceneWillResignActive`.
- **Dependencies and the ground rule on native code:** the lock plugin
  (`@aparajita/capacitor-biometric-auth`, vetted, choice in CLAUDE.md) only
  asks iOS to authenticate — no secret and no financial data pass through it.
  Notification texts (bill names, amounts only if switched on) go through the
  official Capacitor plugin. Plan 14 can replace either with our own plugin.
- **Not run on a device yet:** reminders (permission, delivery, tap), the lock
  (cold start, return after a minute, passcode, app switcher). The checklist
  is in REDESIGN.md §10, step 14.
