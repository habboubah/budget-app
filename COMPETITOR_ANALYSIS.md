# Spartopf — competitor analysis and feature roadmap

Research for Spartopf 1.2.0, checked on **7 November 2026**. Research only: no code was changed.

- **App Store** figures come from the **German storefront** (apps.apple.com/de) unless marked **US**.
- **Google Play** figures come from **AppBrain** (global Google Play data, refreshed 25 Oct – 7 Nov 2026). My fetches of Google Play's own pages didn't return ratings or install counts.
- **unknown** means I couldn't retrieve a number. Nothing here is estimated.
- Spartopf's column is based on the code (see the [appendix](#appendix--spartopf-today-from-the-code)), not only on the README.
- A web search didn't turn up a public App Store page for Spartopf, so I couldn't check whether it's live or read its ratings.

---

## 1. Summary

The most important gaps, in order:

1. **Data safety (P0).** All data lives in the web view's `localStorage`, and backups are manual. Capacitor's own docs say localStorage must be treated as temporary, because iOS can reclaim web-view storage when the device runs low on space. Lost data is the angriest theme in competitors' reviews (MoneyControl, Bluecoins, Monefy). → **F23**
2. **No category budgets (P0).** All 13 competitors have per-category limits. Spartopf only runs the 50/30/20 check. → **F1**
3. **Every entry still has to be typed.** Spartopf has no widgets, no Siri/Shortcuts and no Apple Pay capture. Spendee and Wallet now log Apple Pay payments by themselves, and iOS 27 lets a Shortcut react to a banking app's push notification. Both run on the device with no bank login. The effort per entry is the main reason people give up on a Haushaltsbuch. → **F8, F18, F19**
4. **No reminders.** Spartopf knows every due date but never sends a notification. Cashew, Wallet, Copilot, Finanzguru, Outbank, finanzblick and Bluecoins do. → **F16**
5. **No app lock.** Monefy, Money Manager, finanzblick and Goodbudget offer a passcode or Face ID. A privacy-first finance app without one looks unfinished. → **F17**
6. **Limited reach.** Spartopf is iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), has no Android app, and the currency is hard-coded to EUR even though the app speaks Arabic. In Germany, Android has a much larger share than iOS, and every competitor except Copilot ships on Android. → **F20, F21, F26, F27**
7. **No savings goals.** The app is literally called "savings pot". YNAB, Copilot, Outbank, MoneyControl and Monefy all have goals. → **F2**
8. **No sync or sharing for couples.** YNAB, Monefy, Spendee, Wallet, Goodbudget and Bluecoins let two people share a budget. Spartopf could do this through the user's own iCloud without running a server, but the wording of the privacy promise would change. → **F24, F25**
9. **The store listing lags behind the product.** It doesn't mention bank CSV/photo import or the Insights tab. There's no Arabic listing, no accessibility labels and no rating prompt. → **S1–S4**
10. **Bank connection.** This is what puts Finanzguru, Outbank and finanzblick on top in Germany, and Stiftung Warentest rated apps with account linking higher. Treat it as a strategic decision. On-device FinTS (Outbank's model) is the only route that keeps the privacy promise. → **F11**

**Bottom line:** Spartopf's core is ahead of most manual apps: two balances, paid/open, carry-over, bank import on the device, free in-depth insights, and real privacy. To feel professional it still needs trust basics (durable data, an app lock, reminders), budgets and goals, and faster capture from outside the app. None of that requires breaking the privacy promise. Quick wins and a three-release plan are in [§9](#9-roadmap).

---

## 2. Competitor overview

**How the apps were chosen:**
- **Global leaders:** YNAB, Copilot, Monefy, Spendee, Wallet, Money Manager, Goodbudget.
- **The German market:** Finanzguru, Outbank, finanzblick, MoneyControl. German comparison articles keep naming these (e.g. [Handelsblatt](https://www.handelsblatt.com/vergleich/kostenlose-haushaltsbuch-apps-vergleich/)).
- **Privacy-first or offline apps:** Cashew, Bluecoins.

All 13 apps shipped at least one store update in 2026, so all are active.

| App | Type | Platforms | Price (App Store DE) | App Store ★ (ratings) | Google Play ★ (ratings) | Play installs | Last update | Notable features |
|---|---|---|---|---|---|---|---|---|
| **Spartopf** 1.2.0 | Private budget book | iPhone; PWA in any browser | Free, no IAP | not verified | — | — | — | Two balances, paid/open, carry-over, bank CSV and screenshot import on the device, Excel import, Insights, DE/EN/AR |
| YNAB | Zero-based budgeting (US) | iPhone, iPad, Watch, Android | 30-day trial, then 15.49 €/mo or 119 €/yr | 4.7 (1,082) · **US** 4.8 (62K) | 4.62 (24,702) | 3.4M | iOS ~4 Nov 2026 · Play 27 Nov 2024 (per AppBrain) | Plans shared with up to 6 people, bank import, goals, loan planner, Siri |
| Copilot Money | Premium bank sync (US only) | iPhone, iPad, Mac, web; no Android | **US**: 1-month trial, then $18/mo or $109/yr | **US** 4.8 (31K) | — (no Android app) | — | iOS ~5 Nov 2026 | AI "Money Assistant", auto-categorization, recurring-charge detection, alerts, investments; Apple Editors' Choice |
| Monefy | Fast manual tracker | iPhone, Android | Free; Premium 41.99–69.99 € | 4.5 (4,819) | 3.98 (190,548) | 11M | iOS 30 Oct · Play 11 Aug 2026 | Entering an amount is all it takes, budget mode, multi-currency, sync via your own Google Drive/Dropbox, passcode, widgets, calculator |
| Spendee | Budgets + bank links | iPhone, Mac, Android, web | Free; Premium e.g. 6.99 €/mo, lifetime 49.99–69.99 € | 4.5 (1,121) | 3.96 (62,517) | 2.9M | iOS 27 Oct · Play 21 Oct 2026 | Shared wallets, AI receipt scanner, labels, multi-currency, Apple Pay payments logged automatically from iOS 27 |
| Wallet (BudgetBakers) | Bank-sync money manager | iPhone, iPad, Mac, Android, web | Free; Premium 5.99–29.99 €, lifetime 49.99 € | 4.3 (1.1k) | unknown | unknown (vendor: "millions of users") | iOS 15 Oct 2026 | 4,000 banks, planned payments, shared accounts, stock tracking, Apple Pay import, 48 languages |
| Money Manager (Realbyte) | Double-entry book | iPhone, iPad, Android (+ PC over Wi-Fi) | Free with ads; sync 2.49 €/mo or 20.99 €/yr | 4.6 (8,947) | unknown | unknown (vendor: 20M+ downloads) | iOS ~6 Nov 2026 | Budgets, Excel import/export, custom first day of the month, subcategories, tags, quick-add widgets, passcode |
| Goodbudget | Envelope budgeting | iPhone, Android, web | Free (10+10 envelopes); Plus 5.99–8.49 €/mo or 49.99–73.99 €/yr | 4.3 (83) | 3.23 (18,475) | 3.4M | iOS ~4 Nov 2026 · Play 8 Dec 2023 | Envelopes, sharing across 5 devices, debt tracking, bank sync for subscribers |
| Finanzguru | German #1, bank aggregation | iPhone, iPad, Mac, Android | Free with ads; "Plus" from 0.99 € (weekly) to 35.99 €/yr | 4.7 (128,755) | 4.27 (78,381) | 3.5M | iOS ~6 Nov · Play 4 Nov 2026 | All accounts and depots, AI contract detection with one-tap cancellation, contract alarm, smart budgets; best Play ranking #1 top-grossing finance app in Germany |
| Outbank | German multibanking, data stays on the device | iPhone, iPad, Mac, Watch, Android | 3.99 €/mo or 39.99 €/yr (Business 9.99/99.99) | 4.1 (17,504) | unknown | 100k+ | iOS 20 Oct 2026 · Play 28 Jan 2025 | 4,500 DACH banks without a central server, payments, contract detection and notice-period reminders, budgets, savings goals, hashtags and rules, CSV/PDF export |
| finanzblick | German multibanking (Buhl) | iPhone, iPad, Watch, Android, web | Free | 4.3 (10,496) | 4.23 (13,442) | 430k | iOS 19 Oct · Play 20 Oct 2026 | 4,000 banks, budget alarms, push for every booking, tax-relevance check, receipts, Face ID, widget for cash |
| MoneyControl | German manual Haushaltsbuch (15+ years) | iPhone, iPad, Mac, Watch, Android, web app | Free (20 entries/mo); one-time 9.99 € or 14.99 € bundle; add-ons 2.49 € | 4.6 (6,993) | 4.34 (5,110) | 510k | iOS ~6 Nov · Play 14 Oct 2026 | Fast entry with shortcuts, recurring entries, preview of coming months, savings goals, custom financial month, receipt and PDF add-ons, opt-in sync |
| Cashew | Privacy-first manual tracker | iPhone, iPad, Android | Free; Pro 1.99 €/mo, 12.99 €/yr or 22.99 € lifetime | 4.9 (147) | 4.80 (27,746) | 940k | iOS 22 Oct · Play 12 Oct 2026 | Budgets for any period, subscriptions with reminders, home and lock-screen widgets, Shortcuts, 46 languages, "Data Not Collected" |
| Bluecoins | Privacy-first manual tracker (Android-first) | Android, iPhone, iPad, Mac | Android free with ads; iOS Bluecoins+ 17.99 € | 2.7 (33) | 4.29 (39,530) | 2.1M | iOS 18 Jul · Play 29 Oct 2026 | Reports, budgets, reminders, family budget, cross-platform sync, spreadsheet/PDF export |

---

## 3. Feature matrix

**Legend:**
- ✅ = the app's store listing, help page or user reviews (linked in [§10](#10-sources)) say it has the feature.
- ◐ = partial.
- ❌ = absent according to the listing (for example its compatibility list) or reviews.
- ? = not mentioned in anything I read. It may still exist.

Spartopf's column comes from the code.

| Feature | Spartopf | YNAB | Copilot | Monefy | Spendee | Wallet | MoneyMgr | Goodbudget | Finanzguru | Outbank | finanzblick | MoneyCtrl | Cashew | Bluecoins |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Quick manual entry | ✅ | ✅ | ? | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recurring entries | ✅ | ? | ✅ | ✅ | ? | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bill reminders / alerts | ❌ | ? | ✅ | ? | ? | ✅ | ? | ? | ✅ | ✅ | ✅ | ? | ✅ | ✅ |
| Category budgets (limits) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Savings goals | ❌ | ✅ | ✅ | ✅ | ? | ◐ | ? | ? | ? | ✅ | ? | ✅ | ? | ? |
| Left to spend / forecast | ✅ | ✅ | ✅ | ? | ? | ✅ | ◐ | ✅ | ✅ | ? | ? | ✅ | ? | ? |
| Multiple accounts | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bank sync | ❌ | ✅ | ✅ US | ? | ✅ | ✅ | ? | ✅ paid | ✅ | ✅ on device | ✅ | ❌ | ? | ? |
| Bank file import (CSV etc.) | ✅ | ? | ? | ? | ? | ✅ | ✅ | ◐ | ? | ✅ | ? | ? | ? | ? |
| Photo → entries (OCR) | ✅ | ? | ? | ? | ✅ | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| Receipt attachments | ❌ | ? | ? | ? | ✅ | ? | ? | ? | ? | ? | ✅ | ✅ add-on | ? | ? |
| Apple Pay auto-capture | ❌ | ? | ◐ | ? | ✅ | ✅ | ? | ? | ? | ? | ? | ? | ? | ? |
| Contracts / subscriptions | ◐ | ? | ✅ | ◐ | ? | ✅ | ? | ? | ✅ | ✅ | ? | ◐ | ✅ | ? |
| Tags / labels | ❌ | ? | ? | ? | ✅ | ? | ✅ | ✅ | ? | ✅ | ✅ | ? | ? | ? |
| Multi-currency | ❌ | ? | ? | ✅ | ✅ | ✅ | ✅ | ? | ? | ✅ | ? | ? | ✅ | ? |
| Search across all history | ◐ | ? | ? | ? | ✅ | ◐ | ✅ | ? | ? | ? | ? | ✅ | ? | ? |
| Export (CSV / Excel / PDF) | ✅ | ? | ? | ✅ | ? | ? | ✅ | ✅ | ? | ✅ | ? | ✅ | ? | ✅ |
| Multi-device sync | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ paid | ✅ | ? | ✅ | ✅ | ✅ | ? | ✅ |
| Shared household budget | ❌ | ✅ | ? | ✅ | ✅ | ✅ | ? | ✅ | ? | ? | ? | ? | ? | ✅ |
| App lock (passcode / Face ID) | ❌ | ? | ? | ✅ | ? | ? | ✅ | ✅ | ? | ? | ✅ | ? | ? | ? |
| Widgets | ❌ | ? | ? | ✅ | ? | ? | ✅ | ? | ? | ? | ✅ | ✅ add-on | ✅ | ? |
| Siri / Shortcuts | ❌ | ✅ | ? | ? | ? | ✅ | ? | ? | ? | ? | ? | ? | ✅ | ? |
| Apple Watch | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Android app | ◐² | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| iPad app | ◐² | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Languages | 3 | 1 | 1 | 16 | 27 | 48 | 19 | 1 | 2 | 2 | 2 | 27 | 46 | 39 |
| App Store privacy label | Not collected¹ | Linked | Linked | Not linked | Linked | Linked | Tracking | Linked | Tracking | Linked | Tracking | Not linked | Not collected | Not collected |
| Ads | No | No | No | No | No | ? | Yes (free) | No | Yes (iOS) | No | No | No | No | Yes (Android) |

**Notes on the matrix:**
- ¹ This is the planned label from `store/listing.md`. I couldn't verify a live listing.
- ² The PWA runs in any browser, including on Android and iPad. There is no Play Store app, and the iOS app is iPhone-only.
- **Privacy label values:** "Linked" = data linked to your identity, "Tracking" = data used to track you, as declared on each product page.
- **Spartopf's partial marks:**
  - Search covers one month at a time.
  - Contracts: Insights lists fixed costs and flags price changes and missing regular payments, but there are no notice periods.
  - Spartopf has no per-category limits, only the 50/30/20 split and a 20 % savings-rate target.

---

## 4. What users love and hate

All review content is paraphrased.

### What users praise

- **Simple, fast entry they keep up for years.**
  - Monefy reviewers on Google Play mention using it daily for 6–7 years because it's simple ([AppBrain](https://www.appbrain.com/app/com.monefy.app.lite)).
  - MoneyControl reviewers call it clear and grown-up, and like shortcuts for logging small cash payments on the go ([App Store reviews](https://apps.apple.com/de/app/haushaltsbuch-moneycontrol/id465909912?see-all=reviews)).
  - Goodbudget reviewers like how easy the envelope logic is to understand, and Bluecoins reviewers like its simplicity.
- **Looking ahead.** A Finanzguru reviewer says the app already warned them that the yearly Kfz-Steuer is due next month, and that they can plan budgets months ahead ([App Store reviews](https://apps.apple.com/de/app/finanzguru-konten-vertr%C3%A4ge/id1214803607?see-all=reviews)).
- **Contract detection and cancellation.** Finanzguru reviewers praise recognized contracts, deadline reminders and in-app cancellation (same source).
- **Money as a couple.** YNAB reviewers highlight tracking finances together with a partner ([AppBrain](https://www.appbrain.com/app/com.youneedabudget.evergreen.app)).
- **Design.** Reviewers call Cashew very beautiful ([AppBrain](https://www.appbrain.com/app/com.budget.tracker_app)), and like Finanzguru's dark design and MoneyControl's modern look.
- **Support that rescues data.** A Bluecoins user's data was recovered by support after a bad update ([AppBrain](https://www.appbrain.com/app/com.rammigsoftware.bluecoins)). Finanzguru's support is described as fast and friendly.

### What users complain about

- **Lost data and broken backups.**
  - MoneyControl: years of data gone after a phone broke, and the Dropbox backup has failed since January 2026 ([AppBrain](https://www.appbrain.com/app/com.priotecs.MoneyControl)).
  - Bluecoins: recent data lost after updates even though it was synced.
  - Monefy: Dropbox restore fails on a new phone ([AppBrain](https://www.appbrain.com/app/com.monefy.app.lite)).
- **Purchases not restored, and pressure to subscribe.**
  - Monefy lifetime buyers aren't recognized and are pushed to a subscription.
  - Bluecoins asks buyers to pay again.
  - YNAB is called too expensive for what it does.
- **Bank sync breaks.**
  - YNAB users have to relink accounts again and again.
  - Some Finanzguru banks need a manual login every time ([AppBrain](https://www.appbrain.com/app/de.dwins.financeguru)).
  - finanzblick syncs broke when banks changed authentication ([AppBrain](https://www.appbrain.com/app/de.buhl.finanzblick)).
- **Wrong totals.**
  - Finanzguru counts PayPal twice, books transfers between your own accounts as both income and expense, and counts refunds as income.
  - finanzblick counts transfers between your own accounts.
  - Goodbudget shows wrong envelope totals ([AppBrain](https://www.appbrain.com/app/com.dayspringtech.envelopes)).
- **Updates that make things worse.**
  - Spendee 6 made entering amounts laggy and hid categories ([AppBrain](https://www.appbrain.com/app/com.cleevio.spendee)).
  - Bluecoins became cluttered.
  - A YNAB redesign removed the red colour that marked outflows.
  - finanzblick's redesign made targets too small.
- **Language.** Finanzguru users ask for an English version. YNAB is English-only.

### Requests that come up again and again

- **Capture without typing.** A Monefy reviewer asks for expenses to be read from bank messages, with approval. iOS 27's notification trigger makes this possible on the device (→ F8).
- **Track cash.** A Finanzguru reviewer wants to follow cash withdrawals. Spartopf already handles cash by hand.
- **Adjust to the real bank balance.** A MoneyControl reviewer asks for a "Kontostand anpassen" button. Spartopf has an opening-balance override, and U6 would complete it.
- **Spending by shop or place.** A MoneyControl reviewer asks for this. Spartopf already has the payee card.
- **Other currencies.** A [Finanzfluss Copilot reviewer](https://apps.apple.com/ch/app/finanzfluss-copilot/id6482296545?platform=iphone&see-all=reviews) asks for CHF (→ F26).
- **Own rules, and transfers excluded from totals.** finanzblick reviewers ask for this.

### What this means for Spartopf

- **Reliability beats features.** Durable data (F23) comes first. Updates must never break the maths or slow down entry, and the existing vitest suite is an asset here.
- **If you ever charge, keep it one-time and never lock existing data.** MoneyControl reviewers who bought the one-time full version are happy. Monefy and Bluecoins buyers are angry when purchases vanish.
- **Capture without a bank login (F8)** answers two complaints at once: having to type everything, and bank sync breaking.

---

## 5. Where Spartopf is already strong

| Strength | Why it matters against the competition | Highlight in the listing? |
|---|---|---|
| **Privacy by architecture:** no account, no server, no ads, no tracking | Among the 13 apps, only Cashew and Bluecoins (iOS) have "Data Not Collected". Finanzguru, Money Manager and finanzblick declare tracking data, and Finanzguru and Money Manager show ads. | **Yes, lead with it** |
| **Two balances plus paid/open** (*Jetzt* vs. *Am Monatsende*) | It answers "what's left?" directly. Finanzguru sells a similar number in Plus, and YNAB's whole pitch is knowing what you can spend. | Yes |
| **Bank data without a bank login:** Sparkasse/ING CSV and screenshot OCR, read on the device | Testers call "automatic import plus manual cash" the best compromise ([MonsterDealz](https://www.monsterdealz.de/magazin/haushaltsbuch-app)). A MoneyControl reviewer notes it has no statement import. | **Yes** ("ohne Bank-Login") |
| **Import from the user's own Excel sheet,** with a preview and undo | Unique for people coming from a spreadsheet, which is how most Haushaltsbuch users start | Yes (DE) |
| **In-depth insights for free:** 50/30/20, savings rate, reserve, forecast, unusual spending, price changes, missing regular payments | Finanzguru Plus and Wallet Premium sell their analyses as paid features | Yes |
| **No subscription** | Subscriptions and lost purchases are among the angriest review themes (Monefy, Bluecoins, YNAB's price) | Yes ("kostenlos, ohne Abo") |
| **Correct maths by design:** one account, so no double-counted transfers; opening balance can be corrected | These are exactly the errors Finanzguru and finanzblick users complain about | No (internal) |
| **Undo for every destructive action,** plus a crash screen that rescues data | Trust; the opposite of the "lost my data" reviews | Indirectly |
| **Arabic with right-to-left layout and Arabic digits** | The German leaders are DE/EN only. Among the 13, only Wallet, Cashew and Bluecoins offer Arabic. | Yes |
| **Native iOS craft and accessibility:** Dynamic Type, VoiceOver labels, reduced motion, a contrast audit for every accent | YNAB and Outbank show Accessibility Nutrition Labels; Spartopf could too (S2) | Yes, via labels |
| **Payee analysis** ("Lidl · 6× · 12 %") | A MoneyControl reviewer asks for this kind of per-shop view | Optional |

---

## 6. What the top 3 apps have that we don't

I ranked by verified number of ratings and installs. Money Manager says it has 20M+ downloads, but I couldn't get its Play numbers, so it isn't ranked; it's covered in a note at the end of this section.

| App | App Store ratings | Google Play ratings | Installs |
|---|---|---|---|
| Finanzguru | 128,755 (DE) | 78,381 | 3.5M |
| Monefy | 4,819 (DE) | 190,548 | 11M |
| YNAB | 62K (US) · 1,082 (DE) | 24,702 | 3.4M |

### Finanzguru: the German market leader

- Automatic import from all bank accounts, depots and crypto accounts.
- AI contract detection, a contract alarm for notice periods, and free one-tap cancellation.
- Smart budgets per category.
- "Freely available income" until month end or the next salary (Plus). Spartopf has *Am Monatsende*, but not tied to payday.
- Savings-potential analysis and notifications.
- iPad, Mac and Android apps.
- A test win at Stiftung Warentest (Finanztest 11/2023, according to [mystipendium.de](https://www.mystipendium.de/geld/haushaltsbuch-apps)).
- **Not worth copying:** ads, tracking, insurance cross-selling.

### Monefy: the mass-market manual tracker

- A chart of where the money went, and entry where the amount is all you need to type.
- Budget mode, multiple accounts and multi-currency.
- **Sync with a partner through the user's own Google Drive or Dropbox, with no Monefy server.** This is the closest model to what Spartopf could do with iCloud.
- Passcode, home-screen widgets and a built-in calculator.
- 16 languages and an Android app.

### YNAB: the most loved budgeting method

- A plan for every euro, with category balances so you always know what you can spend.
- Goals with progress, and net worth.
- Real-time sharing with up to six people across devices.
- Bank import, or manual entry.
- Loan planner.
- Siri, an Apple Watch app and iPad.
- Declared Accessibility Nutrition Labels.
- An education and community programme, and a support team it advertises.

**Money Manager** (developer claims 20M+ downloads, 4.6★ from 8,947 German ratings) adds double-entry bookkeeping, Excel import/export, a custom first day of the month, subcategories, passcode and editing on a PC over Wi-Fi.

---

## 7. New features

**How to read the entries:**
- **Impact:** High / Medium / Low.
- **Effort:** rough estimate for one developer who knows the code. S ≤ 2 days, M 3–10 days, L 2–6 weeks, XL more than that.
- **Priority:**
  - **P0**: do first; trust and core features.
  - **P1**: the next releases; growth.
  - **P2**: later, once demand is confirmed.
- ⚠ marks a conflict with the privacy promise.

### Core budgeting

#### F1 · Category budgets (monthly limits) — P0
- **What:** An optional monthly limit per expense category (e.g. Lebensmittel 450 €).
  - The category card's bar shows spending against the limit, with "noch 120 € übrig" or "38 € drüber". Open entries count as planned spending.
  - Limits carry into new months and can be changed for a single month.
  - Insights lists categories that went over their limit.
- **Who has it:** All 13 competitors. Goodbudget uses envelopes, Finanzguru calls them "smart budgets", and finanzblick adds a budget alarm.
- **Value:** It turns "what happened" into "what I can still spend", which is what people mean when they search for a budget app.
- **Impact:** High · **Effort:** M · **Priority:** P0
- **Privacy:** None; everything stays on the device.
- **Code:**
  - `src/types.ts`: a new `Category.limit?: number` in cents. The name `budget` is already taken by need/want/save. Add an optional per-month override on `MonthRecord`.
  - `src/logic.ts`: `limitStatus()` with tests, plus `normalizeCategory` and `SCHEMA_VERSION`.
  - `CategorySheet.tsx` for the field, and `CategorySection.tsx` for the bar (in the category's hue, overspending in `text-neg`).
  - `src/insights.ts` and `InsightsView.tsx` for the over-limit hint, plus `translations.ts`.

#### F2 · Savings goals ("Spartöpfe") — P1
- **What:** Named goals with a target, an optional date (Urlaub 1.200 € bis Juni) and an emoji and colour.
  - A progress ring shows how far along each goal is, plus the monthly amount still needed.
  - Money put aside is booked as an expense in a `save` category linked to the goal, so balances stay correct.
- **Who has it:** YNAB, Copilot, Outbank, MoneyControl and Monefy; Wallet partly.
- **Value:** A reason to keep using the app. The name means "savings pot", and the existing 20 % savings-rate and reserve cards become something you can act on.
- **Impact:** High · **Effort:** M · **Priority:** P1
- **Privacy:** None.
- **Code:**
  - `src/types.ts`: `Goal`, `AppData.goals`, `Entry.goalId?`.
  - `src/logic.ts`: `normalizeState`, `makeBackup`/`parseBackup`, schema bump.
  - `src/insights.ts`: progress and monthly amount, with tests.
  - `InsightsView.tsx` ("Sparen und Reserve"), `EntrySheet.tsx` (goal picker for `save` categories), `translations.ts`.

#### F3 · Reserve for yearly bills — P1, quick win
- **What:** Based on yearly entries (Kfz-Steuer, insurance), show "lege 42 € im Monat zurück", list the next yearly bills, and say whether the reserve covers them.
- **Who has it:** YNAB ("Cost to Be Me" and goals). Finanzguru reviewers praise being warned early about the yearly Kfz-Steuer.
- **Value:** No more surprise months, using data Spartopf already has.
- **Impact:** Medium · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `src/insights.ts` (`commitments()` already returns `yearly`; add `yearlyReserve()` and a test), `InsightsView.tsx`, `translations.ts`.

#### F4 · Calculator in the amount field — P1, quick win
- **What:** Accept "12,50+4,80" or "3×2,99" and show the result while typing.
- **Who has it:** Monefy (built-in calculator) and Money Manager (calculator button).
- **Value:** Faster entry for receipts with several items, and fewer mistakes.
- **Impact:** Medium · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `src/logic.ts`: `parseAmount()` currently rejects operators, so add a small parser for + − × ÷ (no `eval`). Plus `logic.test.ts` and `EntrySheet.tsx`.

#### F5 · Extra accounts for cash and savings — P2, decision needed
- **What:** Optional accounts besides the main one (Bargeld, Tagesgeld), with transfers that count as neither income nor expense. The month page still shows one account by default.
- **Who has it:** Every competitor.
- **Value:** Helps people who pay cash or keep a savings account. Finanzguru and finanzblick reviews show how often transfers between your own accounts end up counted as both income and expense, so this has to be done carefully.
- **Impact:** Medium–High · **Effort:** L · **Priority:** P2
- **Privacy:** None. **Conflict:** PLAN.md says "One bank account only, on purpose", so this is your decision.
- **Code:**
  - `src/types.ts`: `Account`, `Entry.accountId?`, a transfer type.
  - `src/logic.ts`: `computeBalances()` per account, and `monthTotals()` without transfers.
  - `src/insights.ts`, `BalanceCard.tsx`, `statementImport.ts` (target account), backup schema.

#### F6 · Month that starts on payday — P2, decision needed
- **What:** Let a month run from payday to payday, e.g. the 25th to the 24th.
- **Who has it:** Money Manager (choose the first day of the month), MoneyControl (custom financial month), Finanzguru (what's left until the next salary).
- **Value:** Matches how many households actually budget.
- **Impact:** Medium · **Effort:** L · **Priority:** P2
- **Privacy:** None.
- **Code:** Changes the meaning of `MonthKey` across:
  - `src/logic.ts`: `monthKeyOf`, `defaultEntryDate`, `isOverdue`, `carryCandidates`.
  - `excelImport.ts`, and `statementImport.ts` (date → month).
  - Chart labels.
  - Needs a design spike first.

#### F7 · Debts and loans — P2
- **What:** Track a loan or debt (Ratenkredit, money owed to family) with its balance, payments and payoff date.
- **Who has it:** YNAB (Loan Planner), Goodbudget (debt tracking), Wallet (debt management), Money Manager (loans).
- **Value:** Useful for some users, but low priority for a monthly budget book.
- **Impact:** Low–Medium · **Effort:** M · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/types.ts`, `src/insights.ts`, a new card in `InsightsView.tsx`.

### Import and automation

#### F8 · Apple Pay payments and bank notifications become entries — P1
- **What:** An App Intent "Eintrag hinzufügen" (amount, name, date, card). Users add one of two Shortcuts automations:
  - **Transaction:** runs right after an Apple Pay/Wallet payment (iOS 17+).
  - **Notification:** runs when, for example, the Sparkasse app posts "Kartenzahlung 12,40 € bei REWE" (iOS 27).

  Entries land in an inbox and go through `planStatement()`: known payees get your own name and category, and duplicates are skipped by `Entry.ref`. They're booked as paid, with undo. Ship a ready-made Shortcut and a short setup guide.
- **Who has it:**
  - [Spendee](https://apps.apple.com/de/app/spendee-budget-money-tracker/id635861140): Apple Pay payments are logged automatically from iOS 27.
  - [Wallet](https://support.budgetbakers.com/hc/en-us/articles/26593713953554-Apple-Pay-Integration): Apple Pay import through Shortcuts.
  - [MoneyCoach](https://moneycoach.ai/apple-pay-import): works wherever Apple Pay works, with no bank login.
  - Newer apps use the iOS 27 notification trigger ([Monetor](https://apps.apple.com/us/app/monetor-finance-tracker/id6768699065), [CapyCash](https://apps.apple.com/us/app/capycash-budget-tracker/id6752520088)).
  - Apple's [FinanceKit](https://developer.apple.com/financekit/) only covers the US and UK, so in Germany Shortcuts is the way in.
- **Value:** Card payments with no typing (typing is the main reason people give up a Haushaltsbuch) and no bank login.
- **Impact:** High · **Effort:** M (shares one native bridge with F18/F19) · **Priority:** P1
- **Privacy:** Fully on the device and no credentials, so it fits the promise.
- **Code:**
  - A Swift App Intent and an App Group container in `ios/App/App/`, plus a small Capacitor plugin that reads the inbox.
  - `src/statementImport.ts`: reuse `planStatement()` and `applyStatement()`.
  - `StatementImportSheet.tsx` (review), `App.tsx` (import when the app resumes), a setup guide in `SettingsView.tsx`.

#### F9 · Import from other apps — P2
- **What:** CSV import with column mapping (date, payee, amount, category), plus presets for exports from Finanzguru, Outbank, Money Manager and Monefy.
- **Who has it:** Outbank (import from other finance apps and bank portals), Wallet (from your bank or spreadsheets), Money Manager (Excel import).
- **Value:** Makes switching cheaper. Reviews show users ready to leave apps over subscriptions and lost purchases.
- **Impact:** Medium · **Effort:** M · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/statementImport.ts` (`parseBankCsv()` already finds header rows by column title; add a mapping step), `StatementImportSheet.tsx`, `statementImport.test.ts`.

#### F10 · Receipt and document attachments — P2
- **What:** Attach a photo or PDF to an entry (warranty, tax). Files are stored in the app's own storage and included in backups.
- **Who has it:** MoneyControl (receipt photos, paid add-on), finanzblick (documents linked to bookings), Spendee (the receipt scanner keeps the photo).
- **Value:** Warranty and tax evidence next to the payment.
- **Impact:** Medium · **Effort:** M · **Priority:** P2
- **Privacy:** Stays on the device. Backups get bigger, so zip them.
- **Code:** `src/types.ts` (`Entry.files?`), `@capacitor/filesystem` (already a dependency), `src/export.ts` and `BackupGroup.tsx` (zip backup with `fflate`, also already a dependency), `EntrySheet.tsx`.

#### F11 · Bank connection for German banks — P2, ⚠ privacy
- **What:** Optional automatic import of transactions. There are two routes:
  - **(a) A PSD2 aggregator.** This needs a server and a licensed partner.
  - **(b) On-device FinTS, like [Outbank](https://apps.apple.com/de/app/outbank-banking-finanzen/id1094254051).** The app talks to the bank directly and the data stays on the phone.
- **Who has it:** Finanzguru, Outbank, finanzblick, Wallet, Spendee, YNAB, Goodbudget (paid), Copilot (US only).
- **Value:** It's what puts the top German apps on top, and [Stiftung Warentest](https://www.test.de/Haushaltsbuch-App-Test-5600647-0) rated apps with account linking better. But broken sync is a top complaint (YNAB, Finanzguru, finanzblick), and cash never shows up.
- **Impact:** High · **Effort:** XL · **Priority:** P2 (strategic decision; try F8 first)
- **Privacy:** ⚠ Route (a) breaks "no server". Route (b) keeps the promise but needs:
  - A [FinTS product registration](https://www.fints.org/de/hersteller/produktregistrierung) with Die Deutsche Kreditwirtschaft. It's currently free, and the number usually arrives in 10–15 working days.
  - TAN/SCA handling for each bank.
  - Credentials stored in the Keychain.
- **Code:** a new `src/fints/` or a native module; native HTTP (CapacitorHttp), because a web view's `fetch` will probably hit CORS; Keychain storage; `statementImport.ts` for planning.

### Insights and reports

#### F12 · Search across all months — P1
- **What:** Search every month at once, with results grouped by month. Tapping a result jumps to it. Filters for category, open only and amount.
- **Who has it:** MoneyControl (searches all bookings), Spendee (searches across accounts), Money Manager (search page with tags).
- **Value:** "When did I last pay the dentist?" is a question a budget book kept for years has to answer.
- **Impact:** Medium · **Effort:** S–M · **Priority:** P1
- **Privacy:** None.
- **Code:** `src/logic.ts` (`searchEntries()` takes a list, so pass all entries and group by `month`), a new pushed screen `SearchView.tsx` registered in the `pushed` array in `App.tsx`, an entry point next to `SearchField` in `MonthView.tsx`.

#### F13 · Contracts and notice periods — P2
- **What:** For a recurring entry, an optional contract end date and notice period, a reminder before the deadline, and a contract list under fixed costs in Insights.
- **Who has it:** Finanzguru (contract alarm, one-tap cancellation), Outbank (notice-period reminders), MoneyControl (contract management, mentioned in reviews).
- **Value:** Saves money on forgotten contracts. It's the Finanzguru feature reviewers praise most.
- **Impact:** Medium · **Effort:** S–M (after F16) · **Priority:** P2
- **Privacy:** Stays on the device.
- **Code:** `src/types.ts` (contract fields on the series), `src/insights.ts` (`commitments()`), `InsightsView.tsx`, the scheduler from F16.

#### F14 · Tags — P2
- **What:** Tags like `#Urlaub` or `#Hochzeit` that work across categories, with a tag report and tag search.
- **Who has it:** Spendee (labels), Money Manager (tags), Outbank (hashtags), finanzblick (keywords), Goodbudget (hashtags, mentioned in reviews).
- **Value:** Answers "what did the holiday cost?" across categories.
- **Impact:** Low–Medium · **Effort:** M · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/types.ts` (`Entry.tags?`), `src/logic.ts` (`searchEntries` and a report like `topNames`), `EntrySheet.tsx`, `StatsView.tsx`.

#### F15 · PDF report — P2
- **What:** A one-page month or year report (totals, categories, open items) to share or print.
- **Who has it:** MoneyControl (PDF reports, paid add-on), Outbank (PDF export), Bluecoins (PDF export).
- **Value:** Useful for a partner, a tax advisor or a loan application.
- **Impact:** Low–Medium · **Effort:** S–M · **Priority:** P2
- **Privacy:** Leaves the device only when the user shares it.
- **Code:** a print stylesheet in `src/index.css`, a "Bericht teilen" action in `StatsView.tsx`, `src/export.ts`.

### Platform features

#### F16 · Reminders (local notifications) — P1
- **What:** Notifications:
  - on the morning a bill is due (an open entry with a date)
  - when income is expected
  - when a new month starts with its recurring entries
  - a monthly "back up now" nudge

  In Settings: on/off and the time of day.
- **Who has it:** Cashew (automatic reminders), Wallet (due dates, predictive alerts), Copilot (custom alerts), Finanzguru (contract alarm, notifications), Outbank, finanzblick (push for every booking, budget alarm), Bluecoins.
- **Value:** Fewer overdue bills, and a reason to come back every month.
- **Impact:** High · **Effort:** S–M · **Priority:** P1
- **Privacy:** Scheduled on the device; no push server.
- **Code:** [`@capacitor/local-notifications`](https://capacitorjs.com/docs/apis/local-notifications) (official plugin; pin it to the Capacitor 8 line), `src/logic.ts` (`reminderPlan(data, today)` with tests), `App.tsx` (reschedule after changes), `SettingsView.tsx`, `translations.ts`.

#### F17 · App lock with Face ID — P1
- **What:** An optional Face ID/Touch ID lock (device passcode as fallback) at launch and after N minutes in the background. A cover in the app switcher so balances don't show.
- **Who has it:** Monefy (password), Money Manager (passcode), finanzblick (password, Touch ID, Face ID), Goodbudget (Face ID).
- **Value:** Protects financial data on a shared family phone, and it's an expected trust signal for a privacy app.
- **Impact:** High · **Effort:** S–M · **Priority:** P1
- **Privacy:** Positive.
- **Code:** native LocalAuthentication (a small custom plugin in `ios/App/App/`, or a maintained Capacitor 8 plugin, pinned), `App.tsx` (`appStateChange` from `@capacitor/app`, which is already used), `SettingsView.tsx`, `Info.plist` (`NSFaceIDUsageDescription`).

#### F18 · Widgets and a quick-add control — P1
- **What:**
  - A home-screen widget with *Jetzt* and *Am Monatsende*, and a medium size that lists the next open bills.
  - A lock-screen widget with "noch X € pro Tag".
  - A "+" that opens the entry sheet, and a Control Center control for quick add.
  - An option to hide amounts on the lock screen.

  PLAN.md already lists the widget as an idea.
- **Who has it:** Cashew (home and lock-screen widgets), Monefy and Money Manager (widgets, quick-add widgets on Android), finanzblick (widget for cash entries), MoneyControl (shortcut widget, paid add-on).
- **Value:** Numbers at a glance and entry in two taps help retention.
- **Impact:** High · **Effort:** M–L · **Priority:** P1
- **Privacy:** Stays on the device (App Group). Amounts on the lock screen are optional.
- **Code:**
  - A WidgetKit extension target in `ios/App/`, with an App Group entitlement.
  - A small plugin that writes a snapshot JSON from `src/store.ts` after every save.
  - A deep link `spartopf://add` handled by `CapacitorApp.addListener('appUrlOpen')` in `App.tsx` (URL scheme in `Info.plist`).

#### F19 · Siri and Shortcuts actions — P1
- **What:** App Shortcuts: "Ausgabe eintragen", "Wie viel bleibt am Monatsende?", "Offene Rechnungen".
- **Who has it:** YNAB (Siri), Cashew (Shortcuts automation), Wallet (Apple Pay import through Shortcuts).
- **Value:** Hands-free entry, and the groundwork for F8.
- **Impact:** Medium · **Effort:** M (same native layer as F8/F18) · **Priority:** P1
- **Privacy:** Stays on the device.
- **Code:** App Intents in `ios/App/App/`, the snapshot/inbox plugin from F18, phrases in `translations.ts` (de/en/ar).

#### F20 · Android app — P1
- **What:** A Capacitor Android build on Google Play. The PWA already runs in Android browsers, but people look for apps in the store.
- **Who has it:** Every competitor except Copilot.
- **Value:** Reach. In Germany, Android has long had a much larger share of smartphones than iOS ([Statista](https://www.statista.com/statistics/461900/android-vs-ios-market-share-in-smartphone-sales-germany/)). Worldwide it's about 68.5 % in 2026 ([StatCounter via Mobiloud](https://mobiloud.com/blog/android-vs-ios-market-share)).
- **Impact:** High · **Effort:** M–L · **Priority:** P1 (after F23, so Android doesn't start out on localStorage)
- **Privacy:** None. Play's Data safety form can say "no data collected".
- **Code:**
  - Run `npx cap add android` to create `android/`. Keep `@capacitor/android` on the same version as `@capacitor/core`, the same rule CLAUDE.md sets for iOS.
  - Check `@capacitor/status-bar`, `haptics`, `share`, `filesystem` and `app` on Android. The hardware back button is already handled in `App.tsx`.
  - OCR assets via `scripts/copy-ocr.mjs`, and edge-to-edge insets (`safe-top`/`safe-bottom`).
  - A Play upload step next to `scripts/release.js`, and a Play listing in `store/`.
  - The iOS look will feel foreign on Android, so plan design time.

#### F21 · iPad app — P2
- **What:** Turn on iPad support (today `TARGETED_DEVICE_FAMILY = 1`, iPhone only) with a two-column layout (month and statistics side by side).
- **Who has it:** YNAB, Copilot, Wallet, Money Manager, Finanzguru, Outbank, finanzblick, MoneyControl, Cashew, Bluecoins. MoneyControl's latest update also adapts to the iPhone Duo's wider screen.
- **Value:** For households that budget on an iPad. A wide layout also helps larger phones.
- **Impact:** Low–Medium · **Effort:** S–M · **Priority:** P2
- **Privacy:** None.
- **Code:** `ios/App/App.xcodeproj/project.pbxproj`, `src/ui/useWidth.ts`, the layouts in `ui/Screen.tsx`, iPad sizes in `scripts/screenshots.mjs`.

#### F22 · Apple Watch — P2
- **What:** Glance at *Jetzt* and *Monatsende*, tick off an open bill, add an amount.
- **Who has it:** YNAB, Outbank, finanzblick, MoneyControl.
- **Value:** Nice to have, for a small audience.
- **Impact:** Low · **Effort:** L · **Priority:** P2
- **Privacy:** Stays on the device (WatchConnectivity).
- **Code:** a new watchOS target in `ios/` that reuses the snapshot from F18.

### Sync, backup and sharing

#### F23 · Durable storage and automatic backups — P0
- **What:**
  - Keep the data in a file in the app's own storage, using `@capacitor/filesystem` (already a dependency), instead of only in the web view's localStorage.
  - Write a dated snapshot every day (keep the last 30) and show "last backup" in Settings.
  - Optionally make the folder visible in the Files app.
  - Optionally offer a password-protected backup export, since today's JSON is plain text once it leaves the device.
- **Who has it:** MoneyControl (internal backups), Money Manager (automatic backup), Outbank (local backup), Bluecoins (Google Drive backup), Monefy (backup to your own Dropbox or Google Drive).
- **Value:** [Capacitor's storage guide](https://next.capacitorjs.com/docs/next/guides/storage) says localStorage must be treated as temporary, because the OS reclaims web-view storage when space runs low. Lost data produces the angriest reviews in this category.
- **Impact:** High · **Effort:** M · **Priority:** P0
- **Privacy:** Stays on the device.
- **Code:**
  - `src/store.ts` (`persist()`, `readJson()`): move the existing `spartopf-*` keys over on first launch, and keep localStorage as the PWA fallback.
  - `src/main.tsx`: the rescue screen should read the file too.
  - `src/export.ts`, `BackupGroup.tsx`.
  - `Info.plist`: `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` to make the folder visible in Files.
  - `navigator.storage.persist()` for the PWA.

#### F24 · iCloud sync between your devices — P2, ⚠ privacy wording
- **What:** Optional sync through the user's own iCloud (a CloudKit private database with encrypted fields). Off by default.
- **Who has it:** Monefy (through your own Google Drive or Dropbox), Outbank (iPhone/iPad/Mac), YNAB, Spendee, Wallet, Goodbudget, MoneyControl (optional), Bluecoins.
- **Value:** iPhone and iPad stay in step, and a new phone works without restoring a file.
- **Impact:** Medium–High · **Effort:** L · **Priority:** P2
- **Privacy:** ⚠ There's no developer server, but data does leave the device for the user's iCloud. CloudKit's encrypted fields use keys from the user's iCloud Keychain ([Apple sample](https://github.com/apple/sample-cloudkit-encryption), [Platform Security](https://support.apple.com/guide/security/sec3cac31735/web)). For users who opt in, the "everything stays on this device" copy has to change.
- **Code:** a native CloudKit plugin, `src/store.ts` (per-record `updatedAt` and deletions so changes can be merged), `src/types.ts`, merge tests in `logic.test.ts`.

#### F25 · Shared household budget — P2, ⚠ privacy wording
- **What:** Share one Spartopf with a partner through iCloud sharing. Both can add and tick off entries.
- **Who has it:** YNAB (up to six people), Monefy (partner via sync), Spendee (shared finances), Wallet (shared accounts), Goodbudget (five devices), Bluecoins (with a spouse).
- **Value:** A household book is often kept by two people, and YNAB reviewers single out budgeting together.
- **Impact:** High for couples · **Effort:** L (after F24) · **Priority:** P2
- **Privacy:** ⚠ Data is shared only with the invited person and hosted by Apple. Needs a clear consent screen.
- **Code:** builds on F24 (CloudKit sharing), plus an invite flow in `SettingsView.tsx`.

### Accessibility and languages

#### F26 · Currency setting — P1, quick win
- **What:** Choose the currency once (EUR, CHF, GBP, USD, TRY, SAR, AED, EGP, MAD …), and every amount follows it.
- **Who has it:** Monefy, Spendee, Wallet, Money Manager, Outbank and Cashew (multi-currency). A Finanzfluss Copilot reviewer asks for CHF.
- **Value:** `formatMoney()` is hard-wired to EUR even though the app is available in Arabic and English. Users outside the euro area can't use it today.
- **Impact:** Medium–High · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `src/logic.ts` (`moneyFormat()` sets `currency: 'EUR'`, `parseAmount()` only strips `€`, `searchTerms()`), `Charts.tsx` (`compact()`), `toCsv()`, `src/store.ts` (the setting, included in backups), `translations.ts`.

#### F27 · More languages, Turkish first — P2
- **What:** Add Turkish first (Germany has a large Turkish-speaking community), then French, Spanish, Italian and Polish.
- **Who has it:** Wallet has 48 languages, Cashew 46, Bluecoins 39, Spendee 27, MoneyControl 27, Money Manager 19 and Monefy 16. The German leaders are DE/EN only, and Finanzguru reviewers keep asking for English.
- **Value:** New storefronts and communities where German apps don't compete.
- **Impact:** Medium · **Effort:** M per language · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/translations.ts` (every key), `src/data/defaults.ts` (built-in category names and suggestions), `store/listing.md`.

### Store presence

#### S1 · Update and translate the listing — P1, quick win
- **What:**
  - **Description:** In `store/listing.md` it stops at statistics and categories. Add:
    - bank CSV and screenshot import (on the device, no bank login)
    - the Insights tab (50/30/20, savings rate, reserve)
    - Excel import
    - search
    - Arabic
  - **App Review note:** It still says users type everything by hand. Update it.
  - **Arabic listing:** Add one (name, subtitle, description, keywords). The app is in Arabic, but apart from the What's New text the listing exists only in DE and EN (U.K.).
- **Who has it:** Wallet, Cashew and Bluecoins list Arabic among their languages.
- **Value:** Nobody picks an app for a feature they can't see.
- **Impact:** High · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `store/listing.md` only.

#### S2 · Accessibility Nutrition Labels — P1, quick win
- **What:** Declare the supported features in App Store Connect after checking each one against [Apple's criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels): VoiceOver, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion.
- **Who has it:** YNAB and Outbank show these labels on their German product pages.
- **Value:** Spartopf already does the work (VoiceOver labels, Dynamic Type, reduced motion, `npm run audit:contrast`). The labels make it visible.
- **Impact:** Medium · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** none. It's done in App Store Connect; add it to the `APP_STORE_RELEASE.md` checklist.

#### S3 · Rating prompt and in-app feedback — P1, quick win
- **What:**
  - Ask for a rating at a good moment, such as a month closed with money saved or a successful import, and never right after an error. iOS shows the prompt [at most three times in 365 days](https://developer.apple.com/forums/thread/81703) anyway.
  - Add "Feedback senden" (an email with the app version) in Settings, and reply to store reviews.
- **Who has it:** Finanzguru replies to reviews in the store, and YNAB advertises its support team.
- **Value:** Ratings drive ranking and trust. Feedback catches problems before they become 1-star reviews.
- **Impact:** High · **Effort:** S · **Priority:** P1
- **Privacy:** None (the email is optional).
- **Code:** a native review request (a small plugin or a maintained one, pinned), a trigger in `App.tsx`, `SettingsView.tsx`.

#### S4 · Screenshots that lead with the difference — P1
- **What:** Start with "Kein Konto. Keine Cloud. Kein Tracking." and "Kontoumsätze per CSV oder Screenshot – ohne Bank-Login". Then show the two balances, Insights and the Excel import. Consider a short App Preview video.
- **Who has it:** Copilot leads with its design awards, and Finanzguru with "Die Höhle der Löwen". Privacy is the one angle none of the big German apps can claim: Finanzguru and finanzblick declare tracking data, and Finanzguru shows ads.
- **Value:** Screenshots are what people look at before installing, so they should show what Spartopf does that the market leaders don't.
- **Impact:** Medium–High · **Effort:** S–M · **Priority:** P1
- **Privacy:** None.
- **Code:** `scripts/screenshots.mjs`, `.claude/skills/app-store-screenshots/`.

#### S5 · Check the name and keywords — P2
- **What:** "Spartopf" is also the name of the Sparkasse app's savings-pot feature ([Spartöpfe](https://www.sparkasse.de/pk/produkte/konten-und-karten/banking/online-services/spartoepfe.html)), so store and web searches may mix the two up.
  - Keep "Haushaltsbuch" in the name, as it is now.
  - Watch your search rank after launch.
  - Keep bank brand names out of the keywords; [guideline 2.3.7](https://developer.apple.com/app-store/review/guidelines/#2.3.7) rules out trademarked terms.
- **Who has it:** —
- **Value:** People who hear about "Spartopf" should find this app and not a Sparkasse help page. Keeping the listing within the rules also avoids a rejection at review.
- **Impact:** Low–Medium · **Effort:** S · **Priority:** P2
- **Privacy:** None.
- **Code:** `store/listing.md`.

---

## 8. UI improvements

Everything here reuses the existing native iOS system in CLAUDE.md:
- `ui/Card`, `ui/Sheet` and `Segmented`
- colour tokens only, no hover styles
- logical (RTL-safe) spacing
- `rounded-num` for money
- motion that respects reduced motion

### Onboarding and empty states

#### U1 · First-run setup in three steps — P1
- **Where:** `IntroCard.tsx`, `MonthView.tsx` (`showIntro`), `OpeningSheet.tsx`, `CategoriesView.tsx` (standard toggles).
- **What:** Before the first month:
  1. language and currency
  2. today's account balance
  3. which categories you use and which bills come monthly

  Offer "Excel importieren" and "Kontoumsätze importieren" as shortcuts. Then land on the month page, where the tap and drag gestures appear once as hints instead of a five-step text card. Put a short privacy line on the first screen.
- **Who has it:** Copilot's assistant builds a starting budget once accounts are connected.
- **Value:** The first session decides whether people stay. Today the intro is a block of text to read.
- **Impact:** High · **Effort:** M · **Priority:** P1
- **Privacy:** None.
- **Code:** the files above, plus `src/store.ts` (`introDone`) and `translations.ts`. Follow the `apple-design` skill.

#### U2 · Month-end review — P2
- **Where:** `MonthView.tsx` (a card at the top of the new month), `InsightsView.tsx`.
- **What:** "Oktober: 412 € gespart – 80 € mehr als üblich", the biggest change, and what's still open. It can be shared as an image, but only if the user taps share.
- **Who has it:** Spendee (tips and hints), Copilot (alerts for unusual spending and paydays).
- **Value:** A reason to open the app every month. It reuses `savings()`, `unusual()` and `biggestExpenses()`.
- **Impact:** Medium · **Effort:** S–M · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/insights.ts` (the building blocks exist), `MonthView.tsx`, `ui/Card`.

### Visual and interaction polish

#### U3 · "Per day" figure on the balance card — P1, quick win
- **Where:** `BalanceCard.tsx`.
- **What:** Under *Am Monatsende* in the current month: "≈ 23,40 € pro Tag bis zum 30." (what's left divided by the days remaining).
- **Who has it:** Finanzguru Plus (freely available income until month end), YNAB ("always know how much you have to spend"), [Haushaltsbuch to go](https://apps.apple.com/at/app/haushaltsbuch-to-go/id957335241) (daily budget).
- **Value:** Turns the month-end number into something you can act on today.
- **Impact:** Medium–High · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `src/logic.ts` (`perDayLeft()` with a test), `BalanceCard.tsx`, `translations.ts`. Use `text-on-hero-mute` on the gradient; the warning colours belong only on the `hero-panel`, as CLAUDE.md says.

#### U4 · This month at a glance in Statistics — P1, quick win
- **Where:** `StatsView.tsx` (new first card), `Charts.tsx`.
- **What:** A single stacked bar of this month's spending by category in each category's colour, with the open part hatched. Show the top five with percentages, and let a tap filter.
  - `categoryBreakdown()` already exists in `logic.ts`, with a test, but no screen uses it.
  - A stacked bar fits the dataviz rules better than a pie chart.
- **Who has it:** Monefy (spending-distribution chart), Goodbudget (pie chart of spending by envelope), Cashew (pie charts).
- **Value:** Statistics opens with 12-month charts, but the first question is usually "where did it go this month?".
- **Impact:** Medium · **Effort:** S · **Priority:** P1
- **Privacy:** None.
- **Code:** `Charts.tsx` (a `ShareBar` like `BudgetSplitBar`), `StatsView.tsx`, `data-hue` and `bg-hue-chart` tokens, a table fallback for VoiceOver.

#### U5 · Favourites in the entry sheet — P1
- **Where:** `EntrySheet.tsx`.
- **What:** Pin frequent entries ("Bäcker 4,80 €", "Tanken") as chips above the name field. One tap fills in the name, category and amount.
- **Who has it:** Money Manager (bookmarks), Wallet (templates), MoneyControl (shortcuts for frequent bookings, praised in reviews).
- **Value:** Fewer taps for small everyday purchases.
- **Impact:** Medium · **Effort:** S–M · **Priority:** P1
- **Privacy:** None.
- **Code:** `EntrySheet.tsx`, `src/types.ts`/`store.ts` (a favourites list, included in backups), `translations.ts`.

#### U6 · Match the bank balance — P2
- **Where:** `MonthActionsSheet.tsx`, `OpeningSheet.tsx`, `BalanceCard.tsx`.
- **What:** "Kontostand abgleichen": type in the real balance, see the difference, then either book a correction entry or adjust the opening balance (today that's only possible at the start of the month).
- **Who has it:** A MoneyControl reviewer asks for exactly this. Bluecoins users complain that its reconcile button messes up the totals, so keep it to one step.
- **Value:** Keeps the app's number trustworthy.
- **Impact:** Medium · **Effort:** S · **Priority:** P2
- **Privacy:** None.
- **Code:** `src/logic.ts` (difference from `balance.now`), plus the three components above.

#### U7 · Periods and year-over-year comparison in Statistics — P2
- **Where:** `StatsView.tsx`.
- **What:** Besides "last 12" and "all", add a year picker and a "compared with last year" view on each card.
- **Who has it:** Cashew (compares periods, budgets for any period).
- **Value:** Answers "are we spending more than last year?".
- **Impact:** Low–Medium · **Effort:** M · **Priority:** P2
- **Privacy:** None.
- **Code:** `StatsView.tsx` (`Range`), `src/insights.ts` (slices of `monthSeries()`), `Charts.tsx`.

---

## 9. Roadmap

### Quick wins (high impact, low effort)

| # | Item | Effort | Why it's quick |
|---|---|---|---|
| 1 | S1 Update the listing, fix the App Review note, add an Arabic listing | S | Text only |
| 2 | S2 Accessibility Nutrition Labels | S | The work is already in the app |
| 3 | S3 Rating prompt and "Feedback senden" | S | Small plugin plus one trigger |
| 4 | F26 Currency setting | S | One formatter and a setting |
| 5 | U3 "Per day" on the balance card | S | One pure function |
| 6 | F4 Calculator in the amount field | S | Extends `parseAmount()` |
| 7 | U4 This month at a glance | S | `categoryBreakdown()` already exists |
| 8 | F3 Reserve for yearly bills | S | `commitments().yearly` already exists |

### Release 1.3: "Safe and in control"
- **F23** Durable storage and automatic backups (P0)
- **F1** Category budgets (P0)
- Quick wins 1–4

### Release 1.4: "Reminds, protects, motivates"
- **F16** Reminders
- **F17** App lock with Face ID
- **F2** Savings goals ("Spartöpfe")
- **F12** Search across all months
- **U5** Favourites in the entry sheet
- Quick wins 5–8

### Release 1.5: "Faster capture, wider reach"
- **F18** Widgets and a quick-add control
- **F19 + F8** Siri/Shortcuts actions and Apple Pay/notification capture (build the native bridge once)
- **U1** First-run setup
- **F21** iPad
- **In parallel:** **F20** Android. Start once F23 is done, so Android doesn't inherit the localStorage risk.

### Later (P2, once demand is confirmed)
- F24 iCloud sync, then F25 household sharing
- F5 extra accounts and F6 payday month (both need your decision first)
- F10 attachments, F13 contracts (after F16), F14 tags
- F9 import presets, F15 PDF report
- U2 month-end review, U6 match the bank balance, U7 periods
- F27 Turkish, F22 Apple Watch
- F11 bank connection: start with an on-device FinTS spike and the registration

**Dependencies:**
- F8, F18 and F19 share one native layer (App Group plus a small plugin).
- F13 needs F16.
- F25 needs F24.
- F20 should start after F23.

---

## 10. Sources

All checked on 7 Nov 2026. Store texts and reviews are paraphrased; content was rephrased for compliance with licensing restrictions.

### App Store product pages (German storefront unless noted)
- YNAB: https://apps.apple.com/de/app/ynab/id1010865877 · US: https://apps.apple.com/us/app/ynab/id1010865877
- Copilot Money (US): https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651
- Monefy: https://apps.apple.com/de/app/monefy-budget-planer/id1212024409
- Spendee: https://apps.apple.com/de/app/spendee-budget-money-tracker/id635861140
- Wallet by BudgetBakers: https://apps.apple.com/de/app/wallet-budget-money-manager/id1032467659?l=en-GB
- Money Manager (Realbyte): https://apps.apple.com/de/app/money-manager-expense-budget/id560481810
- Goodbudget: https://apps.apple.com/de/app/goodbudget-budget-planner/id471112395
- Finanzguru: https://apps.apple.com/de/app/finanzguru-konten-vertr%C3%A4ge/id1214803607 · reviews: https://apps.apple.com/de/app/finanzguru-konten-vertr%C3%A4ge/id1214803607?see-all=reviews
- Outbank: https://apps.apple.com/de/app/outbank-banking-finanzen/id1094254051
- finanzblick: https://apps.apple.com/de/app/finanzblick/id401912744
- MoneyControl: https://apps.apple.com/de/app/haushaltsbuch-moneycontrol/id465909912 · reviews: https://apps.apple.com/de/app/haushaltsbuch-moneycontrol/id465909912?see-all=reviews · English listing (savings goals): https://apps.apple.com/is/app/moneycontrol-spending-tracker/id465909912
- Cashew: https://apps.apple.com/de/app/cashew-expense-budget-tracker/id6463662930
- Bluecoins: https://apps.apple.com/de/app/bluecoins-finance-budget/id1590297575
- Haushaltsbuch to go (daily budget, PIN, iCloud sync): https://apps.apple.com/at/app/haushaltsbuch-to-go/id957335241
- Monetor (iOS 27 notification import): https://apps.apple.com/us/app/monetor-finance-tracker/id6768699065
- CapyCash (iOS 27 notification import): https://apps.apple.com/us/app/capycash-budget-tracker/id6752520088
- Finanzfluss Copilot reviews (CHF request): https://apps.apple.com/ch/app/finanzfluss-copilot/id6482296545?platform=iphone&see-all=reviews

### Google Play data and reviews via AppBrain (global)
- Monefy: https://www.appbrain.com/app/com.monefy.app.lite · Play listing: https://play.google.com/store/apps/details?id=com.monefy.app.lite
- YNAB: https://www.appbrain.com/app/com.youneedabudget.evergreen.app
- Finanzguru: https://www.appbrain.com/app/de.dwins.financeguru
- Spendee: https://www.appbrain.com/app/com.cleevio.spendee
- Goodbudget: https://www.appbrain.com/app/com.dayspringtech.envelopes
- MoneyControl: https://www.appbrain.com/app/com.priotecs.MoneyControl
- finanzblick: https://www.appbrain.com/app/de.buhl.finanzblick
- Cashew: https://www.appbrain.com/app/com.budget.tracker_app
- Bluecoins: https://www.appbrain.com/app/com.rammigsoftware.bluecoins
- Outbank: https://www.appbrain.com/app/com.stoegerit.outbank.android
- Wallet (listing text only, no stats returned): https://www.appbrain.com/app/com.droid4you.application.wallet
- Money Manager (listing text only, no stats returned): https://www.appbrain.com/app/com.realbyteapps.moneymanagerfree

### Vendor and help pages
- Copilot platforms: https://copilot.money/download
- Outbank: https://outbankapp.com/
- BudgetBakers ("millions of users"): https://budgetbakers.com/en/
- Wallet Apple Pay integration: https://support.budgetbakers.com/hc/en-us/articles/26593713953554-Apple-Pay-Integration
- MoneyCoach Apple Pay import: https://moneycoach.ai/apple-pay-import

### Platform documentation
- Capacitor storage guide (localStorage is temporary): https://next.capacitorjs.com/docs/next/guides/storage
- Capacitor Local Notifications: https://capacitorjs.com/docs/apis/local-notifications
- FinanceKit availability (US and UK): https://developer.apple.com/financekit/
- Accessibility Nutrition Labels: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels
- Review prompt limit: https://developer.apple.com/forums/thread/81703
- App Review Guidelines 2.3.7 (metadata): https://developer.apple.com/app-store/review/guidelines/#2.3.7
- CloudKit encryption: https://github.com/apple/sample-cloudkit-encryption · https://support.apple.com/guide/security/sec3cac31735/web
- iOS 27 notification trigger in Shortcuts: https://www.macstories.net/ios/deflector-turns-ios-27-notification-triggers-into-a-shortcut-launcher/
- FinTS product registration: https://www.fints.org/de/hersteller/produktregistrierung · FAQ: https://www.fints.org/de/hersteller/faq-produktregistrierung

### Market data and tests
- Stiftung Warentest, Haushaltsbuch apps (Finanztest 11/2023): https://www.test.de/Haushaltsbuch-App-Test-5600647-0
- mystipendium.de (Finanzguru test winner, Oct 2023): https://www.mystipendium.de/geld/haushaltsbuch-apps
- Handelsblatt (popular household planners): https://www.handelsblatt.com/vergleich/kostenlose-haushaltsbuch-apps-vergleich/
- MonsterDealz, manual entry vs. account linking (Aug 2026): https://www.monsterdealz.de/magazin/haushaltsbuch-app
- Statista, Android vs. iOS in Germany: https://www.statista.com/statistics/461900/android-vs-ios-market-share-in-smartphone-sales-germany/
- Mobiloud citing StatCounter (global share, 2026): https://mobiloud.com/blog/android-vs-ios-market-share
- Sparkasse "Spartöpfe": https://www.sparkasse.de/pk/produkte/konten-und-karten/banking/online-services/spartoepfe.html

### Spartopf (this repo)
`README.md`, `PLAN.md`, `CLAUDE.md`, `store/listing.md`, `src/` (files listed in the appendix), `ios/App/App.xcodeproj/project.pbxproj`, `capacitor.config.ts`, `package.json`.

---

## Appendix — Spartopf today (from the code)

| Area | What it does | Where it lives |
|---|---|---|
| App shell | Four tabs (Monat, Statistik, Analyse, Einstellungen) in a floating tab bar with the add button beside it | `src/App.tsx`, `src/ui/TabBar.tsx` |
| Navigation | No router: pushed screens (categories) with slide transitions and the hardware back button | `src/App.tsx` |
| Feedback | Bottom sheets, confirm dialogs, toasts with undo, haptics | `src/ui/Sheet.tsx`, `src/ui/Toast.tsx`, `src/ui/haptics.ts` |
| Safety | Storage-error banner; crash screen that rescues the stored data | `src/App.tsx`, `src/store.ts`, `src/main.tsx` |
| Month page | ‹ › switcher and a month picker that shows each month's end balance | `MonthView.tsx`, `MonthPickerSheet.tsx` |
| Balance card | *Jetzt auf dem Konto* with a ring for bills paid, carried-over amount, *Bezahlt/Offen* columns, *Am Monatsende*; amounts count up to their new value | `BalanceCard.tsx`, `ui/CountingMoney.tsx`, `ui/useCountUp.ts` |
| Opening balance | Manual override to match the real bank | `OpeningSheet.tsx` |
| Category cards | Paid bar in the category's colour, fold/unfold (remembered), "open only" filter per card, add row | `CategorySection.tsx` |
| Filter and search | Page-wide "only open" filter; search within the month (name, note, category, amount) with highlights | `MonthView.tsx`, `ui/SearchField.tsx`, `ui/Highlight.tsx`, `logic.ts` `searchEntries()` |
| Paid / open | Tap the circle (a real checkbox for VoiceOver); swipe right to toggle, swipe left to delete with undo | `CategorySection.tsx`, `ui/SwipeRow.tsx` |
| Sorting | Long-press drag within or between categories, auto-scroll near the edges, Alt + ↑/↓ | `ui/useEntryDrag.ts`, `logic.ts` `moveEntry()` |
| Carry-over | Start a month with monthly and yearly entries copied in as open; the current and next month start automatically; pull in recurring entries that are missing | `StartMonthCard.tsx`, `App.tsx`, `logic.ts` `carryCandidates()`, `carryOver()`, `laterCopies()` |
| Overdue | Open entries past their date; banner for open entries left in earlier months | `logic.ts` `isOverdue()`, `openBefore()`, `MonthView.tsx` |
| Categories per month | Each month has its own set; add one or remove an empty one | `AddCategorySheet.tsx`, `logic.ts` `monthCategories()` |
| Month actions | Opening balance, pull recurring entries, fold all, import CSV or photo, delete month | `MonthActionsSheet.tsx` |
| Entry sheet | Date, name with suggestions from all history (and last amount), category (top 3 + all), amount (DE/EN formats, Arabic digits), status, repeat, note; "Sichern & nächster" | `EntrySheet.tsx`, `logic.ts` `suggestNames()`, `topCategories()`, `parseAmount()`, `normalizeDigits()` |
| Bank CSV import | Sparkasse CSV-CAMT, ING-style debit/credit columns, English exports (Windows-1252/UTF-8); review sheet marking new / already entered / pays an open bill | `statementImport.ts`, `StatementImportSheet.tsx`, `ocr.ts` `readTextFile()` |
| Photo import | Screenshot of a banking app read on the device by tesseract.js (German model) | `ocr.ts`, `statementImport.ts` `parseStatementText()` |
| Excel import | Your own budget sheet → months, with preview and undo | `xlsx.ts`, `excelImport.ts`, `ExcelImportSheet.tsx` |
| Backup | JSON export/import through the share sheet; CSV export for Excel | `BackupGroup.tsx`, `export.ts`, `logic.ts` `makeBackup()`, `parseBackup()`, `toCsv()` |
| Statistics | Income vs. expenses, balance over time, income/expense lines, saved vs. overspent, average per category (3/6/12/all finished months), categories per month with legend toggles, payees over 1–12 months, data table | `StatsView.tsx`, `Charts.tsx`, `insights.ts` |
| Insights | Fixed costs (monthly/yearly), trends, best and weakest month, hints for one month (unusual spending, biggest expenses, new names, missing regulars, price changes), savings rate vs. 20 %, 50/30/20 with need/want/save per category, emergency reserve, forecast to year end and 12 months out | `InsightsView.tsx`, `insights.ts` |
| Settings | Language DE/EN/AR (right to left), theme (system/light/dark), 8 accent colours, categories (21 built-in, 8 shown in new months by default; create/edit/reorder/delete/restore, emoji, colour, need/want/save), backup, Excel, reset, about | `SettingsView.tsx`, `CategoriesView.tsx`, `CategorySheet.tsx`, `data/defaults.ts`, `translations.ts` |
| Onboarding | Intro card on the first month: five steps, set the starting balance, import Excel, dismiss | `IntroCard.tsx` |
| Platform | Capacitor 8 iPhone app (`TARGETED_DEVICE_FAMILY = 1`); installable PWA; status bar, share sheet, filesystem; Dynamic Type | `ios/`, `capacitor.config.ts`, `vite.config.ts`, `dynamicType.ts` |
| Data | `localStorage` keys `spartopf-*`, integer cents, `YYYY-MM` months, schema migrations | `store.ts`, `types.ts`, `logic.ts` `normalizeState()`, `upgradeData()` |
| Currency | EUR only | `logic.ts` `moneyFormat()` |
| Accessibility | VoiceOver labels, checkbox semantics, reduced motion, contrast audit for every accent and theme | `CLAUDE.md`, `scripts/contrast-audit.mjs` |
