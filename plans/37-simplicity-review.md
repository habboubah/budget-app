# 37 · Simplicity review

- **Covers:** "keep the app simple for new users". Competitors lost ratings when updates cluttered them (Bluecoins, Spendee 6, finanzblick).
- **Depends on:** all earlier plans. Run the checklist after plans 13, 21 and 32 as well.
- **Size:** M
- **Native:** none
- **Schema:** no change

## Checklist

Also used as a checkpoint after plans 13, 21 and 32.

1. **Fresh install.** Test with three people who don't know the app, plus ui-review's first-run captures.
   - The first entry takes under 30 seconds, with at most three decisions before it.
   - Nothing is on the first screens that wasn't there after plan 00.
2. **Where features appear.** Make a table: every feature from plans 01–36, and where a new user first meets it. The answer should be "nowhere until …". Anything visible without a trigger needs a reason, or it moves.
3. **Month page count.** Count the controls and figures in the first viewport on SE and Pro Max, and compare with plan 00's captures. No growth without a decision.
4. ***Optionen*.**
   - The groups stay as plan 00 set them.
   - Advanced rows go at the bottom of each group.
   - No group is longer than one screen on SE.
5. **Tips instead of tours.** One contextual tip at a time, at most one a week, each dismissible for good:
   - after three card payments typed by hand → "Apple-Pay-Zahlungen automatisch übernehmen" (19)
   - after the same entry three times → "Als Favorit merken" (09)
   - after the first yearly entry → "Rücklage planen" (11)
   - after a month over budget → "Budget anpassen?" (00)
   - after 30 days without an export while the backup switch is off → plan 03's card
6. **Copy.** DE, EN, AR and TR without jargon. Every empty state says what to do next.
7. **Accessibility.**
   - A VoiceOver walk-through of the main flows.
   - 200 % text.
   - A Voice Control name for every control.
8. **Speed.** Cold start and entry latency, measured against plan 01's budgets on the oldest supported iPhone and Android phone.

## Done when

- [ ] Every item passes, or has a merged fix. (Items 2–5 are done below; 1, 7 and 8 need people and devices and are in TODO.md; 6 waits for the native speakers of plan 25.)
- [x] The tip system ships with the five tips above. (`src/tips.ts`, tested.)

## Review, November 2026 (after plan 32)

### 2 · Where a new user first meets each feature

A fresh install shows: the month title with its two arrows and the menu, the search, the setup card (balance, salary, fixed costs, Excel import, *Später*), the empty categories, and the tab bar with the add button. Everything else:

Written from the code as built, not from a walk through a fresh install — check it against one (TODO.md, the three-people test).

| Feature (plan) | First seen | Trigger |
|---|---|---|
| Balance card, *Demnächst fällig* | month page | the first balance / the first open dated entry |
| Gestures card | month page | after the setup, once there is an entry; ✕ for good |
| Budgets (00) | category menu, *Planen* | setting a limit |
| Auto backups, versions (03) | *Sichern und übertragen* | opening that screen |
| Backup password (04), app lock, hidden amounts (05/06) | *Optionen › Sicherheit* | iPhone app only |
| Currency (07) | *Optionen › Darstellung* | — |
| Calculator (08) | entry sheet | typing + − × ÷ in the amount |
| Favourites (09) | entry sheet chips | saving one (or the tip) |
| Bank match / import (10, 20) | month menu | choosing *Kontoauszug importieren* |
| Yearly reserve (11) | *Planen* | the first yearly entry (and the tip) |
| Savings pots (12) | *Planen* | — (one card, empty state) |
| Month report, year review (13) | month page card / *Planen* | a finished month / December |
| Rating prompt (15) | iOS | 14 days, 30 entries, a good moment |
| Siri (18), automatic capture (19) | iOS / *Optionen* | the user's own phrase or automation (and the tip) |
| Split (21), tags (26), receipts (27) | entry sheet | *Aufteilen* in the editor; the *Tag* and *Beleg* pills |
| Two columns, shortcuts (22) | — | a window from 700 px |
| PDF report (28), year comparison (29) | report screens, *Statistik* | opening them; a second year of data |
| Accounts, transfers (30) | *Optionen › Konten* | adding a second account — then the switch on the balance card |
| Debts (31) | *Optionen › Schulden und Kredite* | adding one — then the card on *Planen* |
| Month from payday (32) | *Optionen › Monat beginnt am* | changing it — then the dates under the title |

**Visible without a trigger, with their reason:** the *Tag*, *Beleg* and *Notiz* pills in the entry sheet (one row of small pills under the three things every entry needs; they replace a *Weitere* screen); the Spartöpfe card on *Planen* (its empty state is the invitation); *Konten*, *Schulden und Kredite*, *Regeln* and *Monat beginnt am* as rows in *Optionen › Haushaltsbuch* (now at the end of the group, see 4). Nothing was added to the first screens by plans 18–32.

### 3 · Month page count (first viewport, German, test data)

| | Fresh install | A filled month |
|---|---|---|
| iPhone SE (375 × 667) | 15 controls, 4 figures | 31 controls, 14 figures |
| iPhone 17 Pro Max (440 × 956) | 25 controls, 4 figures | 42 controls, 17 figures |

Counted by script (every button, link and field touching the viewport — a category chip and each tab count; figures are the money amounts). Plan 00's captures have no such count, so these are the numbers to compare with from now on. The tip card (5) sits under *Demnächst fällig*, below the first viewport on an SE.

### 4 · Optionen

Groups as plan 00 set them: *Sicherheit und Mitteilungen*, *Darstellung*, *Haushaltsbuch*, *Ausprobieren*, *Über Spartopf*. *Haushaltsbuch* is the longest: 481 px on an SE (667 px), seven rows. **Changed:** its rows now run from everyday to advanced — Kategorien und Budgets, Favoriten, Konten, Schulden und Kredite, Regeln, Monat beginnt am — with *Sichern und übertragen* last, where the group's footer explains it.

### 5 · Tips

`nextTip` (pure, tested) picks at most one, in this order, on the running month once the setup and the gestures card are gone; closing it or using it ends it for good, and the next comes no sooner than a week later:

1. Three payments typed by hand within 14 days, nothing captured yet, iPhone → *Automatisch erfassen* (19).
2. The same one-off expense three times within 60 days, not a favourite → *Als Favorit merken*, one tap (09).
3. The first yearly bill → *Rücklage ansehen* on Planen (11).
4. Last month over a budget (the category that went over by most) → *Budget anpassen* opens its budget sheet (00).
5. iPhone backup switch off, the book older than 30 days and no export for 30 days (or ever) → *Jetzt sichern* opens *Sichern und übertragen*. Plan 03's own card on that screen stays as it is (90 days).

"Card payments" can't be told from cash, so tip 1 counts every paid one-off expense typed in.

### Not done here

- **1 Fresh install with three people** and **7 VoiceOver / 200 % text / Voice Control** and **8 speed on the oldest phones**: on devices, with people — TODO.md.
- **6 Copy**: DE/EN/AR were written with the features; the other eleven languages are machine-drafted and wait for plan 25's native speakers. The empty states were not gone through one by one in this pass.
