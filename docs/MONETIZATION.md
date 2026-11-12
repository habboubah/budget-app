# Spartopf — how it can earn money

Research and plan, checked on **12 November 2026**. Research only: no code and no store setting was changed.

> **A proposal, not a decision.** [plans/README.md](plans/README.md) still says "Free for everyone, no ads. No in-app purchases, no 'Pro' and no paywalled features, ever", and lists "No paid tier" under the decisions already taken. This document shows what changes if Ahmad reverses that. Until he does, the rule there stands. [§14](#14-decisions-for-ahmad) lists what he has to decide.

**How to read it**
- Prices are in euros, from the German stores, unless marked otherwise.
- Features are compared in [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md). This document adds what the competitors charge.
- The revenue benchmarks come mostly from subscription apps (RevenueCat's yearly report). I found no public data for one-time purchases in budget apps, so every euro figure is an order of magnitude.
- The targets in the timeline are goals, not forecasts.
- This is not legal or tax advice. [§12](#12-before-the-first-euro-germany) says what to take to a Steuerberater.
- Sources are in [§15](#15-sources).

**Contents**
1. [The short answer](#1-the-short-answer)
2. [Where Spartopf stands today](#2-where-spartopf-stands-today)
3. [What the stores allow: free first, paid later](#3-what-the-stores-allow-free-first-paid-later)
4. [What the competitors charge, and what works](#4-what-the-competitors-charge-and-what-works)
5. [The options, compared](#5-the-options-compared)
6. [The recommended model](#6-the-recommended-model)
7. [When to start charging](#7-when-to-start-charging)
8. [Will it make money, and is it worth more time?](#8-will-it-make-money-and-is-it-worth-more-time)
9. [Timeline and goals](#9-timeline-and-goals)
10. [How to get attention](#10-how-to-get-attention)
11. [The store listings](#11-the-store-listings)
12. [Before the first euro (Germany)](#12-before-the-first-euro-germany)
13. [Building it: notes for the code](#13-building-it-notes-for-the-code)
14. [Decisions for Ahmad](#14-decisions-for-ahmad)
15. [Sources](#15-sources)

---

## 1. The short answer

1. **Keep the download free on both stores, for good.** Google Play never lets a free app become a paid one. Apple does, but there is no reason to. The money comes from in-app purchases added later, which both stores allow at any time.
2. **Sell one thing: "Spartopf Plus", bought once.** Suggested price 14.99 €, and 9.99 € in the launch month. It unlocks *new* features. Everything in the app today stays free. No ads, and no subscription for the budget book.
3. **Why this model.** German budget books that are filled in by hand sell as one-time purchases (MoneyControl, Money Manager, Cashew's lifetime option). It keeps the listing's promise "ohne Werbung, ohne Abo" true. It needs no server. And reviewers in this category punish forced subscriptions.
4. **Switch it on by numbers, not by date:** 3,000 downloads in total, 300 new downloads a month, 50 ratings averaging 4.5 or better, and two Plus features that users asked for. A realistic target is summer 2027.
5. **A subscription only for a running service**, such as the bank connection (plan 36) or sharing a book between two phones. That is the only income that repeats. Decide once Plus has six months of numbers.
6. **Will it make money?** Probably some, unlikely much. One 14.99 € sale pays out about 10.71 €. For 1,000 € a month Spartopf needs about 93 sales, which means roughly 2,300 to 4,700 downloads a month. The median new subscription app earns about $72 a month a year after launch, and 17.3 % reach $1,000 a month within two years.
7. **Is more time worth it?** More *features*: no, not now. The app already offers about as much as the paid manual books, and has no users. Time on shipping and on being found: yes, up to the checkpoint in [§8](#the-checkpoint). Keeping the app alive costs about 100 € a year, which ten Plus sales cover.
8. **The most urgent thing is the launch date.** Finance apps are installed most in the first quarter of the year. Be live before 1 January 2027.
9. **Attention comes from** store search, ratings, German comparison articles and app blogs, the privacy angle, and Arabic. Paid ads cost more per download than a download earns.
10. **Before the first euro:** a Gewerbe, the tax questionnaire, and a decision about which address and phone number may be public. A developer who earns money has to show them on the EU store pages.

---

## 2. Where Spartopf stands today

| | |
|---|---|
| Version | 1.2.14: iPhone, Android (Capacitor) and a web app |
| On the stores | Not yet. The first App Store submission came back with questions (Guideline 2.1). The Android app has not run on a device yet ([TODO.md](TODO.md)) |
| Users, ratings, feedback from strangers | None |
| Running costs | Apple Developer Program: US$99 a year. Google Play: $25, paid once. No server |
| Promise in the listing | Free, no ads, no in-app purchases, no subscription, nothing leaves the device |
| Numbers you can see | Only what App Store Connect and the Play Console show. The app has no analytics, on purpose |
| Languages | 14. German, English and Arabic are the main ones; the other eleven are machine-drafted and wait for a native reader |

**What Spartopf has to sell** (from [COMPETITOR_ANALYSIS.md §5](COMPETITOR_ANALYSIS.md#5-where-spartopf-is-already-strong)):
- Privacy by architecture. Among the 13 competitors only Cashew and Bluecoins (iOS) carry Apple's "Data Not Collected" label.
- Two balances and paid/open, bank transactions without a bank login, Excel import.
- Arabic with right-to-left layout, which none of the German leaders has.

**What is missing is not features.** It is users, ratings, and proof that strangers keep using the app.

---

## 3. What the stores allow: free first, paid later

### What can be changed later

| | App Store | Google Play |
|---|---|---|
| Free download now, a price on the download later | Possible. A price can be set or scheduled at any time once the Paid Apps Agreement is signed | **Not possible.** An app that was offered for free can never be changed to paid. It would need a new app with a new package name, without the ratings and users |
| Paid download → free | Possible | Possible, and final |
| A free app adds in-app purchases or subscriptions later | Possible, with an app update | Possible, with an app update |
| Change the price of an in-app purchase | Any time, also for a limited period | Any time |
| Name, subtitle, keywords, description, screenshots | Only together with a new app version | Any time |
| Promotional text | Any time | — |
| Bundle ID / package name | Never | Never |

**So:** set the price to *Free* in both stores and never touch that field again. "Free now, paid later" works through in-app purchases, not through the download price.

**Who installed before the change?** On iPhone the App Store tells the app which version a user first installed (`AppTransaction.originalAppVersion`), so early users can be treated differently. Google Play has nothing like it; the app has to remember its first start itself.

### What the stores keep

- **Apple:** 15 % of in-app purchases for members of the App Store Small Business Program (up to US$1 million in proceeds in the year before). You have to enrol; it is not automatic. Under Apple's EU terms in force since 1 October 2026 the standard rate is 26 %, and the Small Business rate stays 15 %.
- **Google:** for buyers in the EEA the fee has been split since 30 June 2026 into a 10 % service fee and a 5 % billing fee on the first US$1 million a year. Together that is 15 %, as before.
- **VAT:** the stores take the VAT out of the price first (19 % in Germany) and their fee from the rest.

| Price in the store | After 19 % VAT | After the 15 % fee: what you get |
|---|---|---|
| 9.99 € | 8.39 € | **7.14 €** |
| 14.99 € | 12.60 € | **10.71 €** |
| 19.99 € | 16.80 € | **14.28 €** |

About 71 % of the price reaches you, before your own income tax.

Before anything can be sold, Apple wants the Paid Apps Agreement with bank and tax details (App Store Connect › Business), and Google a payments profile.

---

## 4. What the competitors charge, and what works

| App | Free | Paid | The model |
|---|---|---|---|
| **MoneyControl** (Priotecs, Germany) | Up to 20 entries a month | 9.99 € once for unlimited entries; 14.99 € for the bundle; add-ons at 2.49 € each (PDF reports, receipt photos, shortcuts widget); a web app for 12.99–31.99 € per 3 or 12 months | A limit, lifted by a one-time purchase. Add-ons. A paid service on top |
| **Money Manager** (Realbyte) | Everything, with ads | About 6–7 € once removes the ads; sync for 2.49 € a month or 20.99 € a year | Ads, removed by a one-time purchase. A subscription only for sync |
| **Monefy** | Basic tracking | Premium from 41.99 € a year; use on several devices is part of it | Subscription. Lifetime buyers complain in reviews about being pushed to it |
| **Cashew** | Most of the app | Pro: 1.99 € a month, 12.99 € a year or 22.99 € once | A cheap subscription with a lifetime option |
| **Bluecoins** | Android: with ads | iOS: 17.99 € | Ads on Android, paid on iOS |
| **Finanzguru** | Bank accounts, contracts, one overall budget; with ads and insurance offers | Plus: 2.99 € a month, also weekly and yearly plans; budgets per category, more analysis | Free bank aggregation, a subscription for analysis |
| **Outbank** | — | 3.99 € a month or 39.99 € a year | Subscription only. Bank connection on the device |
| **finanzblick** (Buhl) | Everything | — | Free. The company sells tax software |
| **Wallet** (BudgetBakers) | Limited | 6.99 € a month; 49.99 € lifetime | Subscription: bank sync, several devices |
| **Spendee** | Limited | From 14.99 € a year; 49.99–69.99 € lifetime | Subscription tiers |
| **Goodbudget** | 10 + 10 envelopes | Plus: 5.99–8.49 € a month | A limit, lifted by a subscription |
| **YNAB** | 30-day trial | 15.49 € a month or 119 € a year | Subscription only |
| Small German books (Moneystats Pro, Unser Haushaltsbuch Pro) | Basic | 4.99 € and 2.99 €, once | One-time |

Prices: the apps' App Store pages (MoneyControl and Cashew read on 12 Nov 2026), Finanztip's comparison table (October 2026) and [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md) (7 Nov 2026).

**What works**

1. **Subscriptions are accepted where the app runs a service:** a bank connection (Finanzguru Plus, Outbank, Wallet, YNAB) or sync between devices (Monefy, Money Manager).
2. **Books filled in by hand sell once,** for about 3 € to 23 €.
3. **The gates in use:** a monthly entry limit (MoneyControl), removing ads (Money Manager), sync (Monefy, Money Manager), deeper analysis (Finanzguru), add-ons (MoneyControl).
4. **What reviewers punish:** a purchase that turns into a subscription, purchases that are not restored, and lost data ([COMPETITOR_ANALYSIS.md §4](COMPETITOR_ANALYSIS.md#4-what-users-love-and-hate)). That document already concluded: if you ever charge, charge once and never lock existing data.
5. **The audience is real but smaller than for bank apps.** German App Store ratings: Finanzguru 128,755; the manual books Money Manager 8,947, MoneyControl 6,993, Monefy 4,819.
6. **Many Germans don't pay for apps at all.** In a 2023 survey 46 % of app users said they are not willing to pay once for an app. A free version that is good by itself is therefore not a gift; it is how the app gets installed, rated and recommended.

---

## 5. The options, compared

| Option | How it would work | For Spartopf | Verdict |
|---|---|---|---|
| **Paid download** | A price on the store page | Nobody can try the app first, and an unknown app without ratings doesn't sell. On Google Play the choice can't be made later anyway | No |
| **A second, paid "Pro" app** | A free and a paid app side by side | Splits ratings and downloads over two listings and doubles the release work. Apple's review treats near-identical apps as spam (Guideline 4.3) | No |
| **Ads** | Banners or full-screen ads from an ad network | Ends "no network requests", "no tracking" and "Data Not Collected", and needs a consent dialog in the EU. Pays roughly $0.01–0.10 per monthly user; banners earn well under $1 per 1,000 views | No |
| **Limit the free version** | Free up to a limit (MoneyControl: 20 entries a month), pay to lift it | Probably the strongest converter for a manual book. But it takes away what is free today | No: it breaks "keep the current state free" |
| **Subscription for the whole book** | A monthly or yearly fee | In RevenueCat's data, apps that put everything behind a paywall turn 10.7 % of downloads into payers; freemium apps 2.1 %. Against it here: there is no running service to justify it, the listing says "ohne Abo", reviewers of manual books object to subscriptions, and only about 28 % of yearly subscribers are still there after a year | Not for the book |
| **One-time "Plus" for new features** | A free app; one purchase unlocks extras for good | Matches how manual books sell in Germany. Keeps "ohne Werbung, ohne Abo" true. No server. The weakness: income only grows with new downloads | **Yes: the core** |
| **Tip jar** | "Spartopf unterstützen": 1.99 €, 4.99 € or 9.99 € | Locks nothing and brings small money. It already makes you a trader ([§12](#12-before-the-first-euro-germany)) | Optional first step |
| **Subscription for a service** | A fee for the bank connection, or for sharing a book between phones | The only income that repeats. Big to build and to keep running, because banks change | Later, with data |
| **Partner offers** | Commission on products recommended in the app, as Finanzguru does with insurance | Needs many users, and puts the app's neutrality and its privacy promise in question | No |

---

## 6. The recommended model

**Free app + "Spartopf Plus" bought once + later, perhaps, a subscription for one service.**

### 6.1 What stays free

Everything in the first public version. Say so in the app and in the listing: *"Was heute kostenlos ist, bleibt kostenlos."*

Nobody has installed Spartopf yet, so strictly speaking "what is free today" is still open: a feature built last week could be held back for Plus before the launch. I advise against it. You asked to keep the current state free, the listing already describes these features as free, and a generous free app is what earns the first ratings. But from the launch on:

- **free feature work stops**, apart from fixes and small things real users ask for;
- **every larger new feature is planned as a Plus feature from the start.**

### 6.2 What goes into Plus

Only new things. The candidates, with the evidence that people pay for them:

| Candidate | Who sells it | Size | Note |
|---|---|---|---|
| **Share the book** with a partner or a second phone, through the user's own iCloud or Google Drive, without a Spartopf server | Monefy (Premium), Money Manager (2.49 € a month), YNAB | L | The strongest reason to pay in a household book. It reverses "no sync" in [plans/README.md](plans/README.md) and changes the privacy wording: the data then also lies in the user's own cloud |
| **Several books:** private, a side business, a club, a child's pocket money | Common in the paid tiers of budget apps | M | No conflict with any rule |
| **Reports for power users:** any date range, this year against last year, a tax-year export | MoneyControl sells PDF reports as a 2.49 € add-on | M | Today's reports stay free |
| **Look:** more themes, more accent colours, other app icons | A common cosmetic extra | S | No risk, but too weak to carry Plus alone |
| **Bank connection on the device** (FinTS, plan 36) | Outbank: 3.99 € a month for exactly this | XL, plus upkeep | Better as a subscription ([6.6](#66-later-a-subscription-for-a-service)) |
| Widgets, Apple Watch, iPad layout | MoneyControl sells a widget add-on for 2.49 € | M–L | You ruled these out. Listed only because competitors charge for them |

**Don't choose by guessing.** Add a "Was fehlt dir?" row next to *Feedback senden* that opens a mail, and count the answers in the first months. Build the two things asked for most.

A first version to aim at: *sharing the book* as the reason to buy, with *several books* and the *look* pack. If "no sync" stays, then *several books*, *reports* and *look*.

### 6.3 The price

- **14.99 € once.** During the first four weeks **9.99 €**.
- Where that sits: Money Manager about 6–7 €, MoneyControl 9.99 € and 14.99 €, Cashew 22.99 € for lifetime, Wallet and Spendee 50–70 € for lifetime, Monefy from 41.99 € a year.
- Turn on Family Sharing for it on the App Store. A household book is used by a household.
- Both stores let you change the price at any time, so the first number is a test, not a commitment.

### 6.4 Early users

**Offer: everyone who installs before Plus is released gets Plus for good, without paying.**

- It gives people a reason to install now, when ratings matter most, and it is a line an editor can repeat.
- It costs little: 3,000 early users × 2 % × 10.71 € is about 640 € not earned.
- On iPhone the App Store knows the first installed version. On Android the app has to write the date of its first start into the book file and its backups, starting with the next release.
- It is a promise. Announce it only once it is decided, and then keep it.

### 6.5 A tip jar, if you want a first step

*Optionen › Spartopf unterstützen* with three one-time amounts and a thank-you. Apple's guidelines allow in-app purchases as tips for the developer.

- **For it:** it tests the whole chain (agreements, tax forms, purchase code, payouts) with nothing locked and nobody annoyed.
- **Against it:** little money, the store pages then say "In-App Purchases", and it starts the trader duties in [§12](#12-before-the-first-euro-germany). So it belongs in phase 2 of the timeline, not in the launch.

### 6.6 Later: a subscription for a service

One-time sales stop when downloads stop. Income that repeats needs something that keeps costing work:

- **The bank connection (plan 36).** Outbank charges 3.99 € a month or 39.99 € a year for an on-device connection, Finanzguru Plus 2.99 € a month. A price below both: **2.99 € a month or 24.99 € a year**. A yearly subscriber then brings about 17.85 € a year after VAT and fee.
- **What it costs you:** the FinTS registration, each bank's login and TAN method, and support whenever a bank changes something. Broken bank sync is one of the angriest review themes ([COMPETITOR_ANALYSIS.md §4](COMPETITOR_ANALYSIS.md#4-what-users-love-and-hate)).
- **The wording:** "ohne Abo" would have to become "Haushaltsbuch ohne Abo. Nur die Bankanbindung kostet monatlich."
- **When to decide:** after Plus has six months of numbers ([§8](#the-checkpoint)).

---

## 7. When to start charging

Not on a date. Plus is released when all six gates are met:

| Gate | Number | Where to read it | Why |
|---|---|---|---|
| Downloads so far | 3,000, both stores together | App Store Connect › Analytics; Play Console › Statistics | Enough people for the first buyers, and for the numbers to mean something |
| New downloads | 300 a month, three months in a row, without paid ads | The same | Below that, Plus earns under 65 € a month at 2 % |
| Ratings | 50, averaging 4.5 or better | The store pages | A paywall in an app with few ratings looks like a risk to a buyer |
| People stay | 8 % of iPhone users still open the app four weeks after installing | App Store Connect › Analytics › Retention (only users who share analytics) | Benchmark reports put finance apps at about 3–8 % after 30 days. Nobody pays for a book they stopped keeping |
| Something to sell | Two Plus features finished, both asked for by users | Your inbox | A paywall needs something behind it |
| Paperwork | [§12](#12-before-the-first-euro-germany) done | — | No sale before the Gewerbe and the trader details |

**If a gate hangs:**
- Downloads too low → the listing and [§10](#10-how-to-get-attention). More features won't fix it.
- Ratings too low → check when the rating prompt appears, and answer every review.
- People don't stay → the first five minutes. Run plan 37's test with three strangers and fix what stops them.

---

## 8. Will it make money, and is it worth more time?

### What the benchmarks say

From RevenueCat's *State of Subscription Apps 2026* (115,000 apps):

- A new app earns a median of about **$72 a month** one year after its launch. The top quarter earns more than $429, the top tenth more than $2,574.
- **17.3 %** of new apps reach $1,000 a month within two years. **4.6 %** reach $10,000.
- Freemium apps turn a median **2.1 %** of downloads into payers within 35 days. The App Store converts better than Google Play.
- About 14,700 new subscription apps appeared per month in January 2026, against about 2,000 in January 2022. The market gets fuller every month.

Android is the bigger market in Germany, with roughly two thirds of the phones sold. Expect more downloads from Android and more buyers per download on iPhone.

### What that means in euros

Proceeds per month from Plus at 14.99 € (10.71 € per sale):

| New downloads a month | 1 % buy | 2 % buy | 4 % buy |
|---|---|---|---|
| 300 | 32 € | 64 € | 128 € |
| 1,000 | 107 € | 214 € | 428 € |
| 3,000 | 321 € | 642 € | 1,285 € |
| 10,000 | 1,071 € | 2,141 € | 4,283 € |

- 2 % is the freemium median. 1 % is a weak paywall, 4 % a very good one.
- **100 € a month** needs about 470 downloads a month at 2 %. **500 €** needs about 2,300. **1,000 €** needs about 4,700.
- For scale: MoneyControl has been on the market for more than 15 years and shows 510,000 installs on Google Play. That is under 3,000 a month on average.
- These are one-time sales. When downloads stop, income stops.

### What it costs

- Apple: US$99 a year. Google: already paid. A domain: about 15 € a year. One hour with a Steuerberater, once.
- Ten Plus sales a year cover the running costs.
- The real cost is your time.

### The verdict

**Will it make money?** The likely result a year after the launch lies between nothing and a few hundred euros a month. A living from one-time sales alone is unlikely: it needs MoneyControl's download numbers, or a service that people subscribe to.

**For Spartopf:**
- Costs are close to zero, so it never has to earn anything to survive.
- The position is clear and rare: no account, no ads, no subscription, nothing leaves the phone.
- Arabic, where the German leaders don't compete.
- The product is finished. Most apps that try this are not.

**Against:**
- A crowded category with established apps that have thousands of ratings.
- No audience yet, and no proof that strangers keep using it.
- Support, reviews and store paperwork all land on one person.

**Is more time worth it?** It depends on which time:

1. **Features: no.** Not until real users ask. Spartopf already offers about as much as the paid manual books.
2. **Launch and being found: yes.** Two to four hours a week until the checkpoint. This is the one part where nobody knows the answer yet, and it is cheap to find out.
3. **Purchase code and Plus features: later.** Only when the gates in [§7](#7-when-to-start-charging) are within reach.

Even if the money stays small, you keep an app you use yourself instead of the Excel sheet, and a release pipeline and store know-how that your other apps reuse.

### The checkpoint

Twelve months after the launch (target: December 2027), read the numbers once and decide:

| | Signal | Then |
|---|---|---|
| **Green** | 300 € a month or more, or 1,500 downloads a month or more | Build the service tier ([6.6](#66-later-a-subscription-for-a-service)) |
| **Yellow** | 50–300 € a month | Keep it running at about two hours a week. Cheap experiments only |
| **Red** | Under 50 € a month and under 300 downloads a month | Stop feature work. One maintenance release a quarter. Put the time into the next app |

---

## 9. Timeline and goals

| Phase | When | What happens | Goal at the end |
|---|---|---|---|
| **0 — Ship** | now → 31 Dec 2026 | Answer Apple's 2.1 questions and release. First Android run, Play listing, the closed test if the account needs one. Price: Free, all countries. Privacy policy published. A one-page website. Plan 37's test with three strangers. **No new features** | iPhone app live by 20 December. Android by the end of January |
| **1 — First 1,000** | Jan → Mar 2027 | Launch posts and pitches ([§10](#10-how-to-get-attention)). Featuring nomination. Every review and mail answered within two days. Releases with fixes only. Count what people ask for | 1,000 downloads · 25 ratings at 4.5 or better · 20 messages from users |
| **2 — Prepare** | Apr → Jun 2027 | Paperwork ([§12](#12-before-the-first-euro-germany)). Purchase code with "restore", switched off. The first two Plus features. A second round on keywords and screenshots. Turkish read by a native speaker. Optional: the tip jar | 3,000 downloads · 300 a month · 50 ratings |
| **3 — Spartopf Plus** | Jul → Sep 2027, or whenever the gates are met | Version 2.0 with Plus. 9.99 € for four weeks, then 14.99 €. Early users keep everything. A second press round: "einmal kaufen statt Abo" | 2 % of new downloads buy · 100 € a month by the end of September · rating still 4.5 or better |
| **4 — Checkpoint** | Oct → Dec 2027 | Read the numbers against [the checkpoint](#the-checkpoint) | A decision, written into this file |

If the gates are not met in summer 2027, Plus waits and the work of phase 1 goes on. The checkpoint in December 2027 stays where it is.

---

## 10. How to get attention

**The one sentence:** *Das Haushaltsbuch ohne Anmeldung, ohne Werbung, ohne Abo. Alles bleibt auf deinem Handy.* The proof: the App Store label "Keine Daten erfasst", and an app that works in flight mode.

Ordered by what they bring for the effort. All free, except the last.

1. **Store search.** Most people find a budget book by typing "Haushaltsbuch" into the store. See [§11](#11-the-store-listings).
2. **Ratings.** The rating prompt and *Spartopf bewerten* exist (plan 15). Ask the first testers in person. Reply to every review.
3. **The January wave.** Finance apps see more installs in the first quarter than in any other, driven by New Year's resolutions. Be live, show "2027" in the screenshots, and run an in-app event such as "Haushaltsbuch 2027 starten".
4. **Comparison articles.** They sit at the top of Google for "Haushaltsbuch App": Finanztip (table updated October 2026, with a column "Konto erforderlich"), finanzwissen.de, mystipendium.de, Handelsblatt, WirtschaftsWoche. Stiftung Warentest tested these apps in Finanztest 11/2023. Send each editor three sentences, the store links and a press kit: icon, five screenshots, one page of facts.
5. **App and tech blogs.** Candidates: iphone-ticker.de, appgefahren.de, Caschys Blog, mobiFlip, GIGA, SmartDroid. The story: one developer, free, no tracking, no subscription.
6. **Privacy sites.** Candidates: mobilsicher.de, the Kuketz blog and its forum. Have the Android app scanned by Exodus Privacy and link the report. A finance app with no trackers is rare.
7. **Communities.** r/Finanzen, the Finanzfluss and Finanztip forums, mydealz for free apps; in English r/iosapps, r/androidapps, Product Hunt, and "Show HN" on Hacker News. Read each community's rules on self-promotion first. Post as the developer, ask for feedback, answer every comment.
8. **Arabic.** Among the 13 competitors only Wallet, Cashew and Bluecoins offer Arabic. The Arabic listing exists, and you can speak to this audience yourself: Arabic keywords, Arabic finance groups and channels, short videos. Turkish follows once a native speaker has read it.
9. **A website.** Today there are only the privacy pages. Make one page per language: what the app does, screenshots, store buttons, the Impressum. Host the web build next to it as "Im Browser ausprobieren". Then write a few pages people search for: an Excel Haushaltsbuch template that Spartopf imports, "Haushaltsbuch ohne Anmeldung", "50/30/20-Regel".
10. **Short videos.** 20 to 40 seconds of screen: the two balances, the photo import, the Excel import. The App Review recorder (`ios/AppReviewRecorder/`) can film such scenes by itself. In German and Arabic, on TikTok, Reels and Shorts.
11. **Apple's editors.** App Store Connect › Featuring › Nominations. Angles: the New Year, Data Privacy Day on 28 January, accessibility and right-to-left support.
12. **Inside the app.** Put the app's name in small print on the year review picture, so every share is a small advert. Add a "Spartopf empfehlen" row that shares the store link.
13. **Paid ads: not now.** On Apple's search ads a download in Germany costs about $1.34 on average over all categories (another report gives a median of $2.14), and finance is among the dearest categories. With Plus at 2 %, a download earns about 0.21 €. Ads would lose about a euro per download, or more. The one use: 30–50 € once, to see which search words bring people.

---

## 11. The store listings

Every listing text is in [STORE_LISTING.md](STORE_LISTING.md). This section only covers what money changes, and a few things I would improve before the launch.

### Price and products

| Field | App Store | Google Play |
|---|---|---|
| Price | **Free**, and it stays Free | **Free**, and it has to stay Free |
| Countries | All | All |
| In-app products at launch | None | None |
| In-app products later | `Spartopf Plus` as a non-consumable with Family Sharing; tips as consumables | The same, as one-time products |
| Category | Finance; secondary Productivity | Finance |

### What I would change in the texts now

1. **German subtitle (App Store).** "Haushaltsbuch ohne Konto" repeats a word that is already in the name, where Apple's search has it anyway. It can also be misread, because "Konto" is a bank account first. Suggestion: `Budget & Ausgaben im Blick` (26 of 30). Then take `budget` and `ausgaben` out of the keyword field and use the 16 free characters for words not covered yet, for example `haushaltsplan` or `kassenbuch`.
2. **German short description (Google Play).** The same "ohne Konto". Suggestion: `Haushaltsbuch ohne Anmeldung, Werbung und Abo. Alles bleibt auf deinem Handy.` (77 of 80).
3. **Captions on the screenshots.** ASO firms report that Apple has been reading the text in screenshots for search since June 2025. Each caption should carry words people type (Haushaltsbuch, Budget, Ausgaben, Fixkosten, Sparziel), not only a slogan. The first two screenshots decide.
4. **Custom product pages (App Store).** Up to 70, and since July 2025 they can appear in search for the keywords assigned to them. Three to start with: privacy ("ohne Anmeldung, ohne Tracking"), people coming from an Excel sheet, bank statements without a bank login.
5. **Google Play's full description is searched.** Use the words people type a few times in normal sentences: Haushaltsbuch, Budgetplaner, Ausgaben, Finanzplaner, Kassenbuch. Test the icon and the first screenshots with store listing experiments.
6. **Plan Apple's text changes with releases.** Name, subtitle, keywords, description and screenshots only change with a new version. The promotional text changes at any time: use it for news.
7. **Languages.** Every language a native speaker has read opens that country's store search. Turkish first, as planned.

### What changes on the day Plus ships

- **The promise.** "Kostenlos, ohne Werbung und ohne Abo" stays true. Add "Spartopf Plus: einmal kaufen, für immer." From then on never write "keine In-App-Käufe".
- **[STORE_LISTING.md](STORE_LISTING.md) §1:** the price row ("no in-app purchases").
- **The Play description** says "keine Google-Dienste". Purchases run through Google Play's billing library, so that line has to go or be reworded.
- **App Privacy and Data safety.** If the app only asks the store on the device whether Plus was bought, and sends nothing anywhere, "no data collected" should still hold. Read each form's own definitions again when you fill it in.
- **The privacy pages** (`store/privacy/`): a paragraph on purchases. Apple or Google handle the payment; the app only knows "Plus: yes or no".
- **The App Review note:** how the reviewer sees Plus.

---

## 12. Before the first euro (Germany)

Not legal or tax advice. This is the list to take to a Steuerberater, and what the stores themselves require. None of it is needed while the app is free and earns nothing.

1. **Trader status (EU Digital Services Act).** Both stores ask whether you are a "trader". The question turns on whether you offer the app as part of a business; the first in-app purchase settles it. Apple then shows an address (a P.O. box is accepted for individuals), a phone number and an email address on the app's page in EU countries. Google shows the full address of a personal account that earns money, and asks traders with a personal account for a public phone number. Google now requires every developer to declare the status, ahead of a change to its store model in the EEA and the UK on 1 March 2027; check the deadline shown in your Play Console. **Decide first which address and which number may be public:** a P.O. box, a business address you may lawfully use, a second phone number.
2. **Gewerbe.** Selling an app to make a profit is a trade. Register a Gewerbe (as a side business) with your town, then fill in the *Fragebogen zur steuerlichen Erfassung* in ELSTER.
3. **Kleinunternehmerregelung.** Since 2025 the limits are 25,000 € turnover in the year before and 100,000 € in the current year.
4. **VAT.** In the EU, Apple and Google sell to the customer in their own name and pay the VAT. Your invoice partner is the store's Irish company. How the payouts are booked, and whether they count towards the Kleinunternehmer limit, is the question for the Steuerberater. The sources I read do not agree in the details.
5. **Income tax.** The profit is added to your income and declared with a simple income statement (EÜR).
6. **Your employer.** Check the contract: side work usually has to be reported, and some contracts claim software written outside working hours.
7. **Benefits and insurance.** Side income can change income-tested benefits such as Elterngeld. Check before the first payout.
8. **Impressum.** A business needs one on the website, and it should be reachable from the app. It should name the same address as the store page.
9. **The name.** "Spartöpfe" is a feature of the Sparkasse app ([COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md), S5). Look up "Spartopf" in the DPMA and EUIPO trade mark registers before you earn money under the name. The DPMA does not check for older marks when it registers one, and I could not confirm either way.
10. **The fee programmes.** Enrol in Apple's Small Business Program. In the Play Console, check that the account is on the reduced fee tier.

---

## 13. Building it: notes for the code

For the day the decision is taken. Nothing here is built.

- **Our own plugins, no purchase SDK.** StoreKit 2 in `SpartopfShared.swift`, Google Play's billing library in `SpartopfSharedPlugin.java`. A third-party purchase service would send purchase data to its own servers. That breaks ground rule 1 and CLAUDE.md's rule that anything touching financial data gets our own native plugin.
- **Products:** `plus` (non-consumable, Family Sharing on) and three tips (consumable). Prices come from the store at run time, never from the code.
- **The entitlement** is asked from the store on the device (`Transaction.currentEntitlements`; `queryPurchasesAsync` on Android) and cached. It is not part of the book or its backups: a restored backup must not carry Plus to someone else's phone.
- **"Käufe wiederherstellen"** in *Optionen*. Apple expects a way to restore.
- **Early users** ([6.4](#64-early-users)): `AppTransaction.originalAppVersion` on iPhone. On Android a first-start date in the book file, written from the next release on, so that it already exists when Plus arrives.
- **The web app** has no store. Simplest rule: it stays the free app.
- **The paywall** is one sheet: what Plus adds, the price from the store, "Einmal kaufen, für immer". Plus features are visible with a small mark, never hidden, and never interrupt a free flow (ground rule 4).
- **Android permission:** `com.android.vending.BILLING`. The app itself still makes no network request.
- **Tests:** a StoreKit configuration file in Xcode; license testers in the Play Console. Purchase state is a new input for `docs/SECURITY.md`.
- **Documents to change in the same commit as the decision:** ground rules 1 and 3 and the "No paid tier" row in [plans/README.md](plans/README.md), [STORE_LISTING.md](STORE_LISTING.md), `store/listing.md`, `store/play-listing.md`, `store/privacy/`, [features.md](features.md), [SECURITY.md](SECURITY.md).

---

## 14. Decisions for Ahmad

| # | Decision | My recommendation |
|---|---|---|
| 1 | Reverse "no paid tier, ever"? | Yes, in this form: everything in the first public version stays free; new, larger features go into Plus |
| 2 | Hold anything back for Plus before the launch? | No |
| 3 | The model | One-time Plus. No ads. No subscription for the book |
| 4 | The reason to buy Plus | Sharing the book through the user's own cloud, if you accept reversing "no sync". Otherwise several books and reports. Ask users before building |
| 5 | Price | 14.99 €, with 9.99 € in the first four weeks |
| 6 | Early users get Plus for nothing? | Yes, and announce it at the launch |
| 7 | Tip jar before Plus? | Optional. Only in phase 2, because of the trader duties |
| 8 | Which address and phone number become public | Decide before the first in-app purchase |
| 9 | A subscription for the bank connection | Decide at the checkpoint in December 2027, with numbers |
| 10 | How much time until the checkpoint | Two to four hours a week, on the launch and on being found. No new features |

---

## 15. Sources

All read on 12 November 2026. Content is paraphrased.

### Store rules and fees
- Google Play Console Help, app prices (a free app can't become paid): https://support.google.com/googleplay/android-developer/answer/6334373
- Google Play Console Help, service fees: https://support.google.com/googleplay/android-developer/answer/112622
- PricePush on Google Play's fee split since 30 June 2026: https://pricepush.app/blog/google-play-subscription-fees-2026-real-math
- App Store Connect Help, app pricing and availability: https://developer.apple.com/help/app-store-connect/reference/app-pricing-and-availability/
- App Store Connect Help, price changes for apps: https://developer.apple.com/help/app-store-connect/manage-app-pricing/schedule-price-changes-for-apps
- App Store Connect Help, price changes for in-app purchases: https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/schedule-price-changes-for-in-app-purchases
- Apple Developer Forums, from free to freemium with the app transaction: https://developer.apple.com/forums/thread/748983
- Donny Wals, treating earlier users differently with `AppTransaction`: https://www.donnywals.com/migrating-an-ios-app-from-paid-up-front-to-freemium/
- Apple, changes for apps in the EU (18 Aug 2026): https://developer.apple.com/news/?id=gmws0jgp
- 9to5Mac on the EU terms: https://9to5mac.com/2026/08/18/apple-overhauls-app-store-fees-in-the-eu-with-new-unified-terms/
- EarnRoutes, what Apple and Google take: https://earnroutes.com/guides/app-store-google-play-developer-fees/
- App Store Review Guidelines 3.1.1 on tips, as reported by iClarified: https://www.iclarified.com/79555/apple-updates-app-store-review-guidelines-with-app-tracking-transparency-requirement-more

### Trader status
- App Store Connect Help, Digital Services Act trader requirements: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-compliance-information
- Play Console Help, trader status declaration: https://support.google.com/googleplay/android-developer/answer/17594752
- Auteur, what each store shows of a developer's address: https://useauteur.com/blog/app-store-trader-address

### Benchmarks
- RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/state-of-subscription-apps
- RevenueCat, the report in ten minutes: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- PPC Land on the report: https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/
- Fora Soft, how much an app can make (ad income per user): https://www.forasoft.com/blog/article/app-revenue-potential
- metaCTO, AdMob eCPM by format: https://www.metacto.com/blogs/admob-cost-guide-integration-setup-and-maintenance-expenses
- Braze, retention by category: https://www.braze.com/resources/articles/mobile-app-retention.md
- GetStream, app retention guide: https://getstream.io/blog/app-retention-guide
- Business of Apps, finance apps in the first quarter: https://www.businessofapps.com/?p=97981
- Apptopia, the start-of-year rise of personal finance apps: https://apptopia.com/en/?p=18748
- GetApp, German app users and paying for apps (2023): https://www.getapp.de/blog/4074/app-verwendung-verbraucher
- Statista, Android and iOS in Germany: https://de.statista.com/infografik/amp/5488/marktanteile-der-mobilen-betriebssysteme-in-deutschland

### Competitors' prices
- Finanztip, Haushaltsbuch (comparison table, October 2026): https://www.finanztip.de/haushaltsbuch/
- MoneyControl on the App Store: https://apps.apple.com/de/app/haushaltsbuch-moneycontrol/id465909912
- Cashew on the App Store: https://apps.apple.com/de/app/cashew-expense-budget-tracker/id6463662930
- mystipendium.de: https://www.mystipendium.de/geld/haushaltsbuch-apps
- finanzwissen.de: https://finanzwissen.de/vergleich/haushaltsbuch-apps/
- Handelsblatt: https://www.handelsblatt.com/vergleich/kostenlose-haushaltsbuch-apps-vergleich/
- WirtschaftsWoche: https://www.wiwo.de/vergleich/haushaltsbuch-app-vergleich/
- [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md) (7 Nov 2026), with its own source list

### Listings and advertising
- App Radar, ranking factors (screenshot text, custom product pages): https://appradar.com/app-store-ranking-factors/
- AppFollow, ASO tips for 2026: https://appfollow.io/blog/aso-tips
- ASOMobile, ASO in 2026: https://asomobile.net/en/blog/aso-in-2026-the-complete-guide-to-app-optimization/
- admiral.media, Google Play ASO: https://admiral.media/google-play-aso/
- Apple, getting featured: https://developer.apple.com/app-store/getting-featured
- App Store Connect Help, nominate your app for featuring: https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring
- Adapty, Apple Ads benchmarks 2026: https://adapty.io/blog/apple-ads-benchmarks-2026/
- AppTweak, Apple Ads benchmarks: https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks

### Germany: trade, tax, name
- Existenzgründungsportal (BMWK), an app developer asks about registering: https://www.existenzgruendungsportal.de/Redaktion/DE/BMWK-Infopool/Antworten/Steuern/Kleinunternehmer/App-entwickelt-Kleinunternehmen-anmelden
- gewerbeanmeldung.de, Kleinunternehmerregelung: https://www.gewerbeanmeldung.de/node/749
- Lexware, Kleinunternehmerregelung: https://www.lexware.de/wissen/buchhaltung-finanzen/kleinunternehmerregelung/
- yasers.de, Kleinunternehmerregelung for software and apps: https://yasers.de/rechner/kleinunternehmerregelung
- onlinebilanz.de, VAT for app store sales: https://onlinebilanz.de/umsatzsteuer-software-unternehmen-app-store-online-kurse-ausland/
- DPMA, trade mark FAQ: https://www.dpma.de/marken/faq/
