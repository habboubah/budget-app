# Spartopf — plan for statistics and insights

Research and plan, written on **7 November 2026**. No app code was changed.

- **Status:** built in November 2026, phases 0–4 (plans 06a and 13). What was decided along the way, measured and not yet verified on a device is in the two plans' notes; the ticks in §11 say what is done.
- **In the roadmap:** phases 0–3 are plan 06a, phase 4 is plan 13. Decisions D1–D8 are taken (§14).
- **Builds on:**
  - The first redesign (REDESIGN.md, finished in plan 00 and since deleted — it is in the git history). Step 8 *Statistik* and step 9 *Planen* are commits `bd4b7bb` and `9d16ad9`.
  - Plan 01: the golden year, the old-data fixtures and the speed budgets that phase 0 extends.
  - Plans 11, 12, 28 and 29.
  - [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md).
- **Mockups:** `screenshots/insights-plan/out/sheet.png` (first screen of *Statistik*, *Kategorie*, *Planen*) and `sheet-full.png` (whole screens). They're HTML with the app's own CSS, rendered like REDESIGN's; `node screenshots/insights-plan/render.mjs` redraws them. The folder is gitignored.
- **Code facts** come from reading `src/insights.ts`, `src/budgets.ts`, `StatsView.tsx`, `InsightsView.tsx`, `Charts.tsx` (as of `9d16ad9`) and the step-8 captures. Where I couldn't reproduce something in the UI, I say so.

---

## 1. Summary

1. **Spartopf already computes more than most manual apps:** savings rate, 50/30/20, reserve, forecast, unusual spending, price changes, missing payments, budgets with pace. What holds it back is how it's shown:
   - *Planen* (formerly *Analyse*) is still a scroll of up to 13 cards with five different time scopes. Step 9 put Budgets and Abos & Verträge on top and left the rest as it was.
   - The hints sit in the middle, nothing ranks them, and nothing leads to an action.
   - Once a savings category is in use, two cards contradict each other about how much the user saves (§4, I1).
2. **The competition converges on eight patterns** (§3). Spartopf has two fully and four in part. The biggest gaps:
   - "Am I on track this month?"
   - Drilling down from a total to a category, a payee and its entries.
   - A forward view of the balance.
   - A monthly review.
3. **The plan gives each tab one job:**
   - **Statistik** answers *Wie lief es?*
   - **Planen** answers *Wie läuft es, was kommt, was tue ich?*
   - Plus one screen per category and one report per month.
4. **Five new things carry most of the value:**
   - **November bis heute:** everyday spending so far against a usual month, with a projection to month end.
   - **Das fällt auf:** at most three ranked hints, each with a next step.
   - **The category screen:** its months, its budget, where the money goes, its biggest entries.
   - **Ausblick:** the month-end balance for the next 12 months, with known yearly bills and an honest range.
   - **Finanz-Check:** three or four plain indicators in place of five separate cards.
5. **Numbers you can trust come first:**
   - one definition of *gespart*;
   - a "usual" that one car repair can't skew;
   - Statistik stops at the running month;
   - estimates are rounded;
   - every key figure can explain itself.
6. **No schema change beyond today's 10, no new dependency, no network request.** Five phases; phase 0 fixes the numbers under the new Statistik.
7. **Decisions D1–D8 are taken as recommended (§14).** Phases 0–3 are plan 06a, built right after the trust plans 02–06; phase 4 rewrites plan 13.

---

## 2. Who uses it, and what they ask

**The user:**
- A household that budgets by month, often coming from an Excel sheet; couples and families.
- Enters by hand or imports a bank CSV or a screenshot.
- Uses the app in German, English or Arabic, and cares about privacy.
- Isn't a finance expert: they want answers, not dashboards.

**Four moments, four kinds of question:**

| Moment | Questions | Today | This plan |
|---|---|---|---|
| **Before buying something** | Was kann ich noch ausgeben? | Balance card: *übrig*, *≈ pro Tag*; budgets | unchanged (month page) |
| **Mid-month check** | Liege ich im Plan? Wo geht es diesen Monat hin? | pace per budget only | *November bis heute* on top of *Planen* |
| **Month end or start** | Wie lief der Monat? Was hat sich verändert? Was ist noch offen? | hints in the middle of *Planen*, behind ‹ › | *Monatsbericht*, opened from the month-review card |
| **Planning** (quarterly, New Year, before a big purchase) | Reicht es bis März? Was kostet uns das Auto im Jahr? Sparen wir genug? Wofür geben wir mehr aus als früher? | a forecast as two numbers with cents; separate cards | *Ausblick*, the category screen, *Finanz-Check*, *Jahresrückblick* |

**Why the way it's shown matters, from field studies:**
- **Easy access changes behaviour.** When an aggregation app came to phones, people logged in more often and cut discretionary spending; the effect was strongest for lower incomes and for people spending a lot relative to income ([Levi & Benartzi, *Journal of Finance*, forthcoming](https://www.leviyaron.com/)).
- **How it's framed matters.** In a randomised field experiment, the same wealth figure shown as a monthly amount, next to a salient comparison with the user's own past spending, reduced discretionary spending ([Levi, *JFQA* 2026](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/personal-financial-information-presentation-and-consumer-spending/FB3B05430DC8FFCEC2707C4161E83086)).
  - → Express things per month ("Kfz-Steuer = 25 € im Monat").
  - → Always compare with the user's own past.
- **Easier access means fewer overdraft fees:** 14–38 % fewer in the 12–24 months after an app launched ([Carlin, Olafsson & Pagel, *Review of Finance* 2023](https://revfin.org/mobile-apps-and-financial-decision-making)).
- **Goals raise the savings rate.** Users randomly given goal-setting saved more, without saving less elsewhere ([Gargano & Rossi, *Journal of Finance* 2024](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3579275)). → Plan 12, and the *Finanz-Check* link to it.
- **What a budget book can measure.** The Financial Health Network's indicators include:
  - spending less than income;
  - paying bills on time;
  - liquid savings for living expenses;
  - planning ahead.

  ([FinHealth Pulse 2026](https://finhealthnetwork.org/research/financial-health-pulse-2026-u-s-trends-report/), [BBVA summary](https://www.bbva.com/en/financial-health/financial-health-eight-indicators-measure/)). These four become *Finanz-Check*.

---

## 3. What the competition does with statistics

Statistics and insights only; COMPETITOR_ANALYSIS.md covers the rest. Content is paraphrased.

| App | What stands out | How it's shown | Take | Skip |
|---|---|---|---|---|
| [Copilot](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) | "Free to Spend", plus a spending line against an ideal pace. Recurring payments are left out of the line so rent doesn't spike it. Month-to-date compared with the same days last month ([Cash Flow](https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview)). | Home-screen line chart; tap for a value, double-tap for categories and transactions | pace without fixed costs; same-day comparison; drill-down | bank sync, US only |
| [Monarch](https://help.monarch.com/hc/en-us/articles/4402543752468-Monthly-Progress-Report) | A monthly review that walks through cash flow, plan progress, top categories, the last four months and net worth, and can be resumed. [Sankey](https://www.monarch.com/blog/visualize-your-cash-flow-like-never-before) cash flow; reports by category, group or merchant; [forecast scenarios](https://www.monarch.com/blog/june-product-update). | Dashboard card → paged review | the month review as a ritual | Sankey on a phone, scenario builder |
| [YNAB](https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0) | *Reflect* tab: spending breakdown by share, trends, [income vs. spending over six months](https://support.ynab.com/en_us/income-v-expense-Byu1BYWRq), net worth, age of money | one tab for looking back | looking back gets its own tab | age of money (needs envelopes) |
| [Monzo](https://monzo.com/blog/balance-in-trends) | What's left after bills until payday; a monthly [target](https://monzo.com/blog/targets-in-trends) with a live graph and a target suggested from past spending; a [yearly view](https://community.monzo.com/t/yearly-view-in-trends/129210) where holding a month shows its top three categories | *Trends*: Balance / Spending / Target | left after bills; suggestions from history | — |
| [Revolut](https://www.revolut.com/en-US/help/my-accounts/budgeting-and-analytics/how-does-the-analytics-graph-work) | Spending this cycle against the last, green or red; regular spending kept apart from [committed spending](https://www.revolut.com/en-DE/help/my-accounts/budgeting-and-analytics/how-does-the-analytics-feature-work) (scheduled payments, bills) | analytics graph | committed vs. everyday spending | red for "more" (we use amber) |
| [PocketGuard](https://pocketguard.com/help/leftover/), [Emma](https://emma-app.com/features/tracking/budgeting) | "Leftover" after bills, budgets, goals and debts, per month or per day. Emma suggests a budget from three months so one-offs don't skew it ([help](https://help.emma-app.com/en/article/set-up-your-budget-1s3q9wr/)). | one big number | already have it (*Am Monatsende*, *pro Tag*) | — |
| [Simplifi](https://support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan) | Spending plan; [projected balances](https://www.quicken.com/blog/how-project-balances-and-cash-flow/); [watchlists](https://support.simplifi.quicken.com/en/articles/3472367-using-watchlists-on-the-web-app) for a payee, tag or group | forward-looking balance graph | the forward balance | watchlists (tags first, plan 26) |
| [Wallet](https://help.budgetbakers.com/wallet/a/what-does-the-percentage-next-to-income-expenses-mean-36546774821778) | Every percentage is a change against the previous period of the same length; [expected balances](https://budgetbakers.com/en/products/wallet/features/cashflow-insights/) after planned payments | dashboard of meters | period-over-period changes | configurable dashboards |
| [Money Lover](https://moneylover.zendesk.com/hc/en-us/articles/34522203246745-Home-Screen) | Spending from the 1st to today against the average of the same days over three months | home-screen trend line | the exact pace comparison we want | — |
| [Money Manager](https://help.realbyteapps.com/hc/en-us/articles/360042842734-Stats-tab) | Category pie; tapping a budget bar shows that budget [month by month](https://help.realbyteapps.com/hc/en-us/articles/360042842974-How-to-set-up-modify-delete-a-budget); calendar view | Stats tab | budget → its history | pie charts |
| [Outbank](https://help.outbankapp.com/de/kb/articles/wie-kann-ich-die-auswertungder-app-nutzen) | Analysis cards: budgets, goals, assets; income and expenses with drill-down to subcategories and transactions; "Entwicklungen" (what's left at month end, averaged over four periods) | cards the user arranges | drill-down to transactions | user-arranged cards |
| [Finanzguru](https://finanzguru.de/) | Finds savings potential automatically; income free until payday (Plus). Its own [guide](https://finanzguru.de/finanzwissen/ausgaben-app) says a good app shows fixed costs against spontaneous spending at a glance. | analysis tab, AI | fixed vs. everyday | upselling, cloud AI |
| [Actual Budget](https://actualbudget.org/docs/reports/) | Spending analysis, calendar card, summary card; expense projections from a Hampel-filtered median (outliers removed); balance forecast (experimental) | report dashboard | robust baselines | Monte Carlo, custom reports |
| [Cashew](https://apps.apple.com/sg/app/cashew-expense-budget-tracker/id6463662930) | Compares periods; line, pie and bar charts; history of past budget periods | per-budget history | — | pies |
| Apple Health (pattern) | [*Highlights*](https://support.apple.com/en-nz/guide/iphone/iphe3d379c32/ios): one sentence plus a small comparison chart; *Trends* | Summary tab | the highlight card | — |

### The eight patterns, and where Spartopf stands

| # | Pattern | Who | Spartopf |
|---|---|---|---|
| 1 | What's left after what's promised | PocketGuard, Monzo, Copilot, Emma, Simplifi | ✅ *Am Monatsende*, *übrig ≈ pro Tag* |
| 2 | Pace against a baseline mid-month | Copilot, Money Lover, Monzo, Revolut | ◐ per budget only |
| 3 | Compare with your own past, on the same terms | Copilot, Wallet, Revolut, Cashew | ◐ hints only, not on charts or rows |
| 4 | Drill down: total → category → payee → entries | Outbank, Copilot, Money Manager, Monarch | ❌ |
| 5 | Month review as a ritual | Monarch, Monzo (year) | ❌ (plan 13 planned) |
| 6 | The balance in the coming months | Simplifi, Wallet, Monarch, MoneyControl, Outbank | ◐ two numbers, no yearly bills, no range |
| 7 | Committed vs. everyday spending | Revolut, Emma, Finanzguru, Copilot | ◐ "Feste Kosten" card, not used anywhere else |
| 8 | Suggestions from your own history | Monzo, Emma | ✅ budget suggestion (`suggestLimit`) |

**Also:** robust statistics (Actual) ❌, since every average is a mean. Apple's guidance applies too ([Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data), [Charts](https://developer.apple.com/design/human-interface-guidelines/charts)):
- titles that summarise;
- simple first, details on demand;
- the same style when a small chart opens into a large one;
- every chart accessible, including navigation by subsets.

### What we deliberately don't copy

- **A single "financial health score".** It's opaque and judgmental. *Finanz-Check* shows the indicators themselves, each with a next step.
- **An AI chat** (Monarch, Copilot, Finanzguru). A cloud model breaks the privacy promise, and a model can get numbers wrong. Insights are deterministic rules with translated templates, so they're testable.
- **Sankey diagrams on iPhone.** At 375 pt with 10+ categories they're hard to read.
- **User-arranged dashboards** (Outbank, Actual). Too much to set up (ground rule 4 in plans/README).
- **Pies and donuts.** Bars are more precise for ranking and just as good for part-to-whole ([Cleveland & McGill](https://info3312.infosci.cornell.edu/ae/graphical-perception-A.html); ["Are pie charts evil?", 2024](https://journals.sagepub.com/doi/10.1177/14738716241259432)).
- **Net worth and age of money.** One account today; net worth comes with plan 30.
- **Streaks and badges.** No pressure. At most a quiet "3 Monate in Folge im Plus".

---

## 4. Where Spartopf stands (from the code)

**Strengths:**
- All of it is pure and tested: `src/insights.ts`, `src/budgets.ts`, `src/due.ts`.
- Averages use finished months only.
- A hint only shows when it has something to say.
- Open entries count as planned spending.
- Accessible chart frame: every month's slot is a button, and a table holds every value.
- Locale axes, RTL-safe charts, legend chips that hide a series.

**Since the redesign:**
- **Step 8, *Statistik*** (`bd4b7bb`):
  - 6 / 12 / Alle as a segmented control;
  - KPI tiles from finished months;
  - one in-vs-out chart, with what each month kept written above it;
  - headlines like "rund ein Drittel" (`nearFraction`) and "Dein Konto wächst" (`balanceChange`);
  - *Wofür das Geld geht* with *Kategorien | Empfänger*.
- **Step 9, *Planen*** (`9d16ad9`):
  - the tab is renamed (its id stays `insights`);
  - Budgets first, then **Abos & Verträge** in place of *Feste Kosten*: `src/contracts.ts` builds contracts from the recurring series, with the next payment, the last price change within 12 months and notice deadlines (schema 10, `AppData.contracts`), plus a pushed `contracts` screen;
  - the savings-rate bars are `chart-in`;
  - everything below Abos & Verträge is unchanged.

This plan builds on both.

### Problems

| # | Problem | Where |
|---|---|---|
| **I1** | **Two meanings of "gespart" show different numbers.** `monthSeries`/`savings()` count a savings category (*Geldanlage*, `budget: 'save'`) as spending. `budgetSplit()` counts it as saved. With 3.000 € income, 2.100 € needs and wants and a 300 € ETF plan, *Sparquote* says 20 % while 50/30/20 says 30 % saved. The step-8 headline and "Ø gespart" inherit the first meaning. | `insights.ts`, `InsightsView.tsx`, `StatsView.tsx` |
| **I2** | *Planen* has five time scopes on one page: the running month (budgets), the latest month (contracts), 12 finished months (best/weakest), a month with ‹ › plus a period menu per card (hints), and up to 6 finished months (saving). The hints are in the middle, unranked. A price change now shows twice: on the contract row and in *Neuer Preis*. | `InsightsView.tsx` |
| **I3** | **Nothing answers "Am I on track?" for the whole month.** Pace exists per budget only. | `budgets.ts` (`ahead`) |
| **I4** | **No drill-down.** A category opens an inline chart (step 8); there's no screen with its payees, entries or budget history. Payee rows can't be tapped. | `StatsView.tsx` |
| **I5** | **"Usual" is a mean of up to six months, with fixed thresholds** (25 €, 20 %; trends 20 €, 15 %). One 600 € repair lifts a category's "usual" for six months. 25 € means something else to a student than to a family of five. | `unusual()`, `categoryTrends()` |
| **I6** | **Yearly bills look "unusual" every year,** and they bias the forecast depending on whether they fall in the six-month window. The forecast is one number with cents ("≈ 17.395,92 €"), which suggests a precision it doesn't have. | `unusual()`, `forecast()`, step-4 capture |
| **I7** | **The reserve overstates.** It divides today's balance (money for this month's open bills included) by all spending (ETF and yearly bills included), rather than what's left at month end by what the household needs. | `InsightsView.tsx` |
| **I8** | **Hints don't lead anywhere.** Only budgets and contracts have actions. "Fehlt noch: Rewe" can't be entered from there. | `InsightsView.tsx` |
| **I9** | **Statistik can show a future month as if it were real.** The next month starts when it's opened (App's auto-start). `points = all.slice(-6)` then includes it, and only the running month gets the "≈". *From reading the code; not reproduced.* | `StatsView.tsx`, `App.tsx` |
| **I10** | **German axis labels mix "4000" and "20.000".** Compact notation doesn't group four-digit numbers. | step-8 capture, `compact()` |
| **I11** | **A month that hasn't been kept up to date looks like a cheap month.** Nothing says "letzter Eintrag vor 9 Tagen", or that October still has open items. | — |
| **I12** | **Every card rescans all entries** (`monthBudgets` once per category, `budgetRule` once per month). Fine today; untested at 10 years. | `insights.ts`, `budgets.ts` |

---

## 5. Principles for showing money

1. **The title is the finding;** the chart is the evidence. Example: "Du sparst rund ein Drittel". The sub-line says what's measured and over which months ([HIG](https://developer.apple.com/design/human-interface-guidelines/charts)).
2. **Compare with the user's own past, on the same terms:**
   - the same days of the month ("bis zum 18.");
   - finished months only;
   - a robust "usual" ([Levi 2026](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/personal-financial-information-presentation-and-consumer-spending/FB3B05430DC8FFCEC2707C4161E83086), Copilot, Money Lover).
3. **Monthly units.** Yearly costs are also said per month; a forecast is said as a month-end balance.
4. **One scope per section.** Glance → card → detail screen, in the same chart style throughout ([HIG continuity](https://developer.apple.com/design/human-interface-guidelines/charting-data)).
5. **Few, ranked hints.** At most three per screen, silence when there's nothing to say, never the same category twice.
6. **Every insight has a next step:** *Budget festlegen*, *Eintragen*, *Ansehen*, *Abhaken*.
7. **Supportive tone.** Amber (`text-warn`) marks "watch" in hints and budgets, as it already does, always with an arrow or a word. Green means "better". Red only for a negative balance or something overdue (CLAUDE.md colour rules). No "zu viel", no shame.
8. **Honest numbers:**
   - "≈" and rounding for estimates; a range for forecasts;
   - the basis always named ("Ø Juni – Oktober");
   - no comparison from too little data;
   - "So berechnet" on every key figure.
9. **Common chart types.** Bars to compare and rank, lines for change over time, one stacked bar for part-of-whole. No pies, no Sankey on the phone.
10. **Accessible by construction:**
    - a summary as the label, and the values in a table;
    - big hit areas, with VoiceOver steps by week or month;
    - hatching and dashes, never colour alone;
    - Dynamic Type, RTL, reduced motion.
11. **Private by construction.** Computed on the device. Nothing in this plan sends anything anywhere.
12. **One set of definitions** (§6), used by every screen.

---

## 6. One set of definitions

| Term (DE) | Meaning (cents; paid and open unless noted) |
|---|---|
| **Einnahmen** | entries in income categories |
| **Ausgaben** | entries in expense categories counted as *Bedarf* or *Wünsche* (`budgetOf` = need / want) |
| **Angelegt** | entries in expense categories counted as *Sparen* (`budget: 'save'`, e.g. *Geldanlage*) |
| **Gespart** | Einnahmen − Ausgaben. **Includes Angelegt** (D1). |
| **Kontoplus** | Einnahmen − Ausgaben − Angelegt: what the balance moves by in a month (without an opening override). The month page's *Diesen Monat übrig* stays as it is. |
| **Sparquote** | Gespart ÷ Einnahmen over the months shown; none without Einnahmen |
| **Feste Kosten** | Ausgaben and Angelegt that repeat monthly, plus yearly ones ÷ 12 |
| **Alltagsausgaben** | Ausgaben with `repeat: 'none'` |
| **Jährliche Kosten** | entries with `repeat: 'yearly'` |
| **Grundbedarf** | Ø per month of *Bedarf* spending without yearly entries, plus *Bedarf* yearly entries of the last 12 months ÷ 12 |
| **Abgeschlossen** | started months before today's month. Averages, "üblich", trends and records use only these. |
| **Üblich** | for a category: the **median** of the up to six finished months before, when it had spending in at least four of them; otherwise the **mean**. Two months: the mean. Fewer: no comparison. Yearly entries left out. |
| **Offen** | not yet paid or received; counts as planned in month totals (as today). Open entries in finished months are flagged (H7). |

**Why median and mean:**
- **Median for categories that come every month.** A one-off party in *Lebensmittel* doesn't move it.
- **Mean for lumpy categories.** A median of mostly empty months would be 0, and any small spend would look unusual.
- The rule is tested with both shapes (§12).

---

## 7. Where everything goes

### The tabs

**Monat** (unchanged, except for two additions):
- the month-review card at the start of a month (plan 13), which opens the *Monatsbericht*;
- "⋯ → Monatsbericht".

**Planen: *Wie läuft es, was kommt, was tue ich?*** In this order:
1. **November bis heute.** Pace of everyday spending and where it goes this month (H1). It gives value with no setup, so it comes before budgets, which most new users don't have yet.
2. **Budgets** (exists).
3. **Ausblick.** Month-end balance for the next 12 months (P2).
4. **Abos & Verträge.** REDESIGN #6, plus price changes, new subscriptions and missing payments.
5. *Rücklage für jährliche Kosten* (plan 11), *Spartöpfe* (plan 12), *Schulden* (plan 31): slots, unchanged.
6. **Finanz-Check** (P6).

**Statistik: *Wie lief es?*** In this order:
1. *Jahresrückblick* card, seasonal: 15 Dec – 31 Jan.
2. **Das fällt auf.** Top three recent hints (H2).
3. Section **Verlauf**, with the 6 / 12 / Alle control (later + years, plan 29) in its header. Inside:
   - KPI tiles;
   - Einnahmen und Ausgaben;
   - Kontostand;
   - Wofür das Geld geht;
   - Tabelle.

### Pushed screens and sheets

Navigation stays one level deep (CLAUDE.md: one pushed screen per tab).

| Screen | Opened from | Kind |
|---|---|---|
| **Kategorie** | *Wofür* rows, highlights, the budget sheet's *Verlauf* | pushed, on the tab it's opened from |
| **Monatsbericht** | month-review card, month "⋯", *November bis heute*, Statistik table rows | pushed, on the tab it's opened from |
| **Jahresrückblick** | seasonal card on Statistik | pushed |
| **Abos & Verträge**, *Spartöpfe* | their cards on *Planen* | pushed (REDESIGN, plan 12) |
| **Empfänger** | payee rows | sheet (a second level would need a navigation stack) |
| **So berechnet** | ⓘ on a key figure | sheet |

### What moves where

| Today | New home |
|---|---|
| *Planen › Budgets* (first since step 9) | second, after *November bis heute* |
| *Feste Kosten* | *Abos & Verträge* (done in step 9) |
| *Bester und schwächster Monat* | a highlight ("Bester Monat seit Juni: August"); the saved labels in the chart already show every month |
| *Hinweise zum Monat* with ‹ › and a period per card | Recent ones → *Statistik › Das fällt auf*. Any month → its *Monatsbericht*. *Fehlt noch* → *Abos & Verträge*. *Neuer Preis* goes: the contract rows already show it. |
| *Trend der letzten 3 Monate* | highlight, and the headline of the category screen |
| *Sparquote*, *50/30/20*, *Notgroschen* | *Finanz-Check* rows and their details |
| *Prognose* (two numbers) | *Planen › Ausblick* (chart with a range) |
| Statistik › category bar with an inline chart (step 8) | row → *Kategorie* screen, whose first chart is that same chart |

---

## 8. Insight catalogue

### Planen

| # | Insight | Shows when | Rule | Example (DE) | Next step |
|---|---|---|---|---|---|
| **H1** | **November bis heute**, pace of Alltagsausgaben | running month has any; comparison from day 3, with ≥ 1 finished month | §9.1 | "70 € weniger als sonst bis zum 18." | *Monatsbericht*; budgets |
| P1 | Budgets | exists | `monthBudgets` | "3 von 4 im Rahmen · ≈ 18 € pro Tag" | budget sheet |
| **P2** | **Ausblick** | ≥ 3 finished months (range from 4) | §9.5 | "Bis Oktober 2027 ≈ 28.800 € auf dem Konto" · "Im März wird es knapp: ≈ 380 €" | yearly bill → plan 11 |
| P3 | Price change of a fixed cost | on the contract row since step 9 (`contractItems`) | last change within 12 months; add the yearly effect | "Strom · 95,00 € mtl. · +12,00 € seit Oktober (+144 € im Jahr)" | contract sheet |
| P4 | New subscription | name never seen before and `repeat: monthly` | `newNames` ∩ monthly | "Neu seit Oktober: Disney+ 9,99 € im Monat" | *Ansehen* |
| P5 | Missing payment | `missingRegulars` | in each of the 3 months before, not yet in this one | "Vodafone fehlt noch – sonst 19,99 €" | **Eintragen** (prefilled, open) |
| **P6** | **Finanz-Check** | ≥ 1 finished month | §9.6 | "Ø 33 % gespart · 5 von 5 Monaten im Plus" | row details |

### Statistik

| # | Insight | Shows when | Rule | Example (DE) | Next step |
|---|---|---|---|---|---|
| **H2** | **Das fällt auf** (container) | ≥ 1 candidate | ranked, at most 3 (§10.3) | — | — |
| H3 | Unusual category | `unusual` with the robust "üblich" | §6; while the month is running, only "more" counts | "Kleidung: schon 186 € – sonst Ø 64 € im ganzen Monat" | *Kategorie*; *Budget festlegen* |
| H4 | Trend | `categoryTrends`, 6 finished months | last 3 vs. the 3 before | "Lebensmittel seit August teurer: Ø +84 € im Monat" | *Kategorie* |
| H5 | Better or worse month | last finished month vs. usual saved | ≥ materiality (§10.4) | "Oktober: 180 € mehr gespart als üblich" | *Monatsbericht* |
| H6 | Record | `bestWorst` over 12 finished months | the latest finished month is best or weakest | "Bester Monat seit Juni: August, +1.382 €" | *Monatsbericht* |
| H7 | Check the data | open entries in a finished month, or no entry for ≥ 7 days in the running month | trust first | "Oktober hat noch 4 offene Posten (312 €) – erledigt?" | *Monat öffnen* |
| H8 | One big expense | `biggestExpenses`, share ≥ 25 % | — | "Waschmaschine 649 € – ein Viertel der Oktober-Ausgaben" | *Ansehen* |

### Statistik, beyond the hints

| # | Insight | Shows when | Rule | Example (DE) | Next step |
|---|---|---|---|---|---|
| S1 | KPI tiles | step 8 | D1 | "Ø gespart +1.270 € · davon Ø 150 € angelegt" | ⓘ |
| S2 | Einnahmen und Ausgaben | step 8 | D1: Ausgaben without Angelegt | "Du sparst rund ein Drittel" | table |
| S3 | Kontostand | step 8 | — | "Dein Konto wächst: +6.672 € seit Juni" | — |
| S4 | Wofür das Geld geht | step 8 | + share, change, budget tick (§9.3) | "Lebensmittel · Ø 603 € · 24 % · ↑ 12 %" | *Kategorie* |
| **S5** | **Kategorie screen** | any category with money | §9.4 | "Ø 603 € im Monat – 24 % deiner Ausgaben" | budget, entries |
| S6 | Payee sheet | payee rows | `topNames` + per-month totals | "Rewe · 38× seit Juni · Ø 37 € pro Einkauf" | *Alle Einträge* (search) |
| S7 | Years and comparison | plan 29 | unchanged | "+8 % Ausgaben ggü. 2025" | — |

### Monat

| # | Insight | Shows when | Rule | Example (DE) | Next step |
|---|---|---|---|---|---|
| **M1** | **Monatsbericht** | any started month | §9.7 | "Oktober: 1.140 € gespart – 160 € weniger als üblich" | sections |
| M2 | Month-review card (plan 13) | first visit to a new month, from the 2nd finished month | plan 13 | "Oktober im Rückblick · 1.140 € gespart" | opens M1 |
| M3 | Jahresrückblick | 15 Dec – 31 Jan, ≥ 6 months in the year | §9.7 | "2026: ≈ 15.200 € gespart – rund ein Drittel deines Einkommens" | *Für 2027* box |

---

## 9. How each one is shown

### 9.1 November bis heute (H1)

**Layout:**
- **Eyebrow:** "November bis heute".
- **Title:** the headline.
- **Sub-line:** "Alltagsausgaben ohne feste Kosten · sonst = Ø Juni – Oktober".
- **Chart.**
- **Footer:** a thin stacked share bar, one line under it ("Lebensmittel 38 % · Kleidung 29 % · Restaurants 14 %"), and **Monatsbericht ›** (44 pt).

**The chart:**
- **x-axis:** days 1 to the month's last, LTR, ticks weekly.
- **y-axis:** cumulative €, from 0.
- **This month:** solid `chart-out` (the expense colour everywhere), up to today. Dot and direct label at today ("640 €"). Dashed, in the same colour, to month end ("≈ 980 €").
- **Usual:** a thin `fg-mute` line with a light band (25th–75th percentile, from 4 months on), labelled "sonst ≈ 1.050 €".
- **Today:** a hairline at today.
- **Legend:** `LegendToggles` (November / Sonst), as CLAUDE.md requires for two series.
- **Shared frame:** generalise `ChartFrame` from month slots to any slots, so days and months share it.

**The rules** (pure `pace(book, today)`):
- **Counts:** Alltagsausgaben (D3). Fixed costs are left out, as Copilot does, so rent on the 1st doesn't make every month look early.
- **Which day an entry counts on:** its `date`, else `paidAt` within the month, else `createdAt` within the month.
- **This month:** entries dated up to today. Later-dated entries are plans; they don't count yet.
- **Usual, by day** (method *byDay*): when at least 80 % of the history's amount is dated:
  - per basis month (up to six finished months with everyday spending), the running total for each day;
  - undated amounts spread evenly over that month's days;
  - then the median across months (the mean with fewer than three);
  - day 31 of a 30-day month = its last day.
- **Usual, linear** (method *linear*): otherwise, the usual month total × day ÷ days, which is Copilot's "ideal pace".
- **Projection:** spent so far + (usual at month end − usual today), never less than spent so far.

**The headline:**

| Situation | Headline | Tone |
|---|---|---|
| Within ± max(25 €, 5 % of usual-today) | "Du liegst im üblichen Rahmen" | neutral |
| Below | "{x} weniger als sonst bis zum {Tag}." | pos |
| Above | "{x} mehr als sonst bis zum {Tag}." | warn |
| Days 1–2 | "Bisher {x} – zu früh für einen Vergleich" | neutral |
| No finished month yet | Only this month's line, plus "Ab Dezember siehst du hier, ob du schneller oder langsamer ausgibst als sonst." | — |
| No entry for ≥ 7 days (from day 8) | "Seit {n} Tagen nichts eingetragen" in place of a verdict; the chart stays | neutral |

**Accessibility:**
- The figure's label is the headline plus "Bis heute 640 €, sonst bis zum 18. 710 €, voraussichtlich ≈ 980 €".
- VoiceOver steps through **weeks** (5 targets), as HIG suggests for large series.
- Touch scrubs across the whole plot, using pointer capture rather than 30 tiny buttons.
- *Als Tabelle* lists values by week.

### 9.2 Das fällt auf (H2–H8)

**Each row:**
- the category's picture (`ui/Picture`);
- the finding in one sentence (`text-label font-semibold`);
- the basis (`text-caption text-fg-mute`, e.g. "Ø Mai – Oktober");
- an action as a 44 pt text button;
- "⋯" → *Ausblenden* (undo toast).

**Mini chart:** two short bars in the category's hue (Health *Highlights* style):
- **H3, H4, H5:** "Nov. bis heute" solid, "Ø Monat" at 35 % opacity, values at the ends.
- **H4:** "Aug – Okt" / "Mai – Juli".
- **P3:** "83 → 95 €", as text.

**Tone:**
- amber for "more" (with an arrow);
- green for "less" or "better";
- muted for new things and records;
- never red.

**The card:** "Das fällt auf", hidden when empty. No period control: each row names its own months.

### 9.3 Wofür das Geld geht (S4)

- **Row:** emoji · name · Ø amount (`rounded-num`) · share ("24 %") · change chip.
- **Change chip:**
  - only when it moved by ≥ 15 % **and** ≥ 20 € a month against as many finished months just before;
  - "↑ 12 %" amber, "↓ 18 %" green;
  - the caption under the list says what it's compared with.
- **Bar:** in the category's hue, with a 2 px `fg` tick at the budget when one is set. The scale is max(Ø, budget) over all rows, so a tick never falls off the end.
- **More rows:** after eight, "Alle 14 Kategorien".
- **Tap:** pushes the *Kategorie* screen.
- **VoiceOver label:** "Lebensmittel und Drogerie, Ø 603 € im Monat, 24 % der Ausgaben, 12 % mehr als davor, Budget 650 €".

### 9.4 Kategorie screen (S5)

1. **Header:**
   - large title, the category's name (`wrap-compound`), with its picture;
   - eyebrow "Bedarf · Juni – November 2026", following Statistik's period.
2. **Headline:** the trend if there is one ("Seit August teurer: Ø +84 € im Monat"), otherwise "Ø 603 € im Monat – 24 % deiner Ausgaben".
3. **Chart:**
   - `CategoryTrendChart` (the same chart as step 8's inline one, for continuity);
   - a dashed Ø line (`fg-mute`) and a dashed budget line, each labelled at the end;
   - the open part of the running month hatched.
4. **Three tiles:** *November bis heute* · *Ø Monat* · *2026 bisher*. From 13 months on, a caption compares with the same months last year.
5. **Budget row:**
   - with a budget: "Budget 650 € · in 4 von 5 Monaten eingehalten" · *Ändern*;
   - without: "Budget festlegen · Vorschlag 650 €". Both open the existing `BudgetSheet`.
6. **Wo das Geld hingeht:** this category's payees: name · count · Ø per entry · total. Top 8, then *Alle (n)*.
7. **Größte Einträge:** five, with date. A tap opens the entry sheet.
8. **Feste Kosten hier:** the recurring entries in this category → *Abos & Verträge*.

With one month of data: no Ø line and no change. Empty sections are hidden.

### 9.5 Ausblick (P2)

**Headline:**
- **Normal:** "Bis Oktober 2027 ≈ 28.800 € auf dem Konto".
- **Warn:** "Im März wird es knapp: ≈ 380 € am Monatsende", when the projected month-end balance falls below one month of *Grundbedarf*.
- **Neg:** "Im März könnte das Konto ins Minus rutschen", when it falls below 0.

**Sub-line:** "Feste Einnahmen und Kosten wie bisher, Alltag wie Ø Juni – Oktober", and under the chart "Band: ruhige bis teure Monate, 27.200 – 30.200 €".

**Chart:**
- this month's end and 12 months, as a **dashed** line (dashed already means projected in `BalanceChart`);
- a band from calm to pricey months;
- a dot on each month with a yearly bill;
- the zero line, with red below zero (`BalanceChart`'s convention).

**List below it, "Große Posten":** yearly bills and planned entries in coming months, e.g. "Kfz-Versicherung · März · 651 €". With plan 11, each gets "lege 54 € im Monat zurück".

**The model** (pure `outlook(book, data, today, 12)`, account-based, so Kontoplus):
- **Start:** the running month's projected end (`balance.end`).
- **Per future month f:**
  - + monthly series still running (in the latest started month up to today);
  - + yearly series that occurred in f − 12;
  - a month already started uses its own entries instead.
- **Plus everyday net:** the median of the last up to 12 finished months' one-off income − one-off outflow (yearly entries excluded).
- **Band:** the same with the 25th and 75th percentiles, accumulated. That's deliberately conservative, and explained as "ruhige bis teure Monate".
- **Not included:** salary changes, inflation, new contracts. The explainer says so.
- **Rounding:** amounts go through `formatMoneyEstimate` (§11, phase 0.5).

### 9.6 Finanz-Check (P6)

One card. Each row has:
- a status glyph (✓ `text-pos`, ! `text-warn`; `text-neg` only for overdue);
- a name, one sentence, a basis caption;
- a chevron that opens its detail inline.

**No overall score.**

| Row | Sentence | ✓ when | Detail |
|---|---|---|---|
| **Mehr rein als raus** | "Ø 33 % gespart · 5 von 5 Monaten im Plus" | Sparquote ≥ 0 and ≥ ⅔ of months in the plus | savings-rate columns in `chart-in` with the 20 % line (REDESIGN's colour fix); the 50/30/20 card |
| **Rechnungen pünktlich** | "Nichts überfällig" / "2 Posten überfällig · 310 €" | nothing overdue | → *Demnächst fällig* |
| **Notgroschen** | "7,6 Monate Grundbedarf · empfohlen 3 bis 6" | ≥ 3 | `ReserveMeter` (exists). Basis: projected month-end balance ÷ *Grundbedarf* (D5). |
| **Vorausgeplant** (with plans 11 and 12) | "Jährliche Kosten 1.830 € – noch keine Rücklage" · "Mit 153 € im Monat ist jede Jahresrechnung gedeckt." | reserve or goal on track | *Rücklage anlegen* → plan 11 card; *Spartöpfe* |

The 3–6 months are a rule of thumb ([Finanzfluss](https://www.finanzfluss.de/geldanlage/notgroschen/)); the Verbraucherzentrale suggests a buffer of two to three monthly salaries ([Verbraucherzentrale](https://www.verbraucherzentrale.de/laura-zieht-aus/sparen)). The right amount depends on the household, so the explainer calls it a guideline, not advice.

### 9.7 Monatsbericht and Jahresrückblick (M1–M3)

**Monatsbericht**, one scroll, for any month (a running month says "läuft noch"):
1. **Result:** "Oktober: 1.140 € gespart – 160 € weniger als üblich", with two bars (Okt / Ø).
2. **Tiles:** Einnahmen · Ausgaben · Gespart · Sparquote.
3. **Budgets:** "3 von 4 eingehalten", with the over-budget ones named.
4. **Was sich verändert hat:** up to five hints for that month (H3, H4, H8, P3, P4).
5. **Wohin das Geld ging:** share bar and categories with "vs. üblich".
6. **Noch offen:** count and sum → *Abhaken*.
7. **Ausblick auf Dezember:** fixed costs coming, yearly bills that month.

**Jahresrückblick**, from 15 Dec to 31 Jan:
- **The year in three numbers**, then:
  - the months chart;
  - top five categories against last year;
  - top payees;
  - the biggest expense;
  - the best month.
- **Für 2027:**
  - fixed costs per month;
  - yearly bills → a monthly reserve;
  - budgets suggested from the 12-month average, with **Als Budgets übernehmen** (one undoable action).
- **Share as an image:** only when tapped, and **amounts hidden by default** (*Beträge zeigen* switch), as ground rule 2 asks for anything that leaves the screen. Plan 28 renders the same report model as a PDF.

### 9.8 So berechnet

An ⓘ (44 pt, label "So berechnet: Sparquote") on the KPI tiles, *November bis heute*, *Ausblick*, *Notgroschen* and *Sparquote*, plus "Wie berechnet?" in a hint's ⋯ menu. The sheet holds:
- the definition in two sentences;
- the user's own numbers as one line ("1.270 € gespart ÷ 3.800 € Einnahmen = 33 %");
- the months used;
- what isn't included.

Competitors rarely show their maths; for an app whose promise is correct maths, this is cheap trust.

### 9.9 Marks and colours

| Meaning | Mark | Token |
|---|---|---|
| Einnahmen | column, line | `chart-in` |
| Ausgaben | column, line | `chart-out` |
| Gespart | written above the columns; savings-rate columns | `fg`, `chart-in` (no amber, REDESIGN) |
| A category | bar, column | `bg-hue-chart` under `data-hue` |
| Open, expected | hatching in the series colour | pattern (exists) |
| Projected, estimated | dashed line, hollow end point, "≈" | series colour |
| Usual, baseline | thin line, light band | `fg-mute`; band `fg` at about 7 % |
| Budget, target | dashed line or 2 px tick, labelled | `fg` / `fg-mute` |
| Below zero, overdue | — | `neg` |
| More than usual / better | text and arrow | `warn` / `pos` |

In charts, amber (`chart-save`) goes away, so nothing drawn can be mistaken for "open" (REDESIGN). In text, `text-warn` keeps the two uses it has today: *offen* on the month page, and "watch" in hints and budgets, always with an arrow or a word. Any new fill (the band) goes through `npm run audit:contrast`.

### 9.10 Copy rules

**General:**
- Titles state the finding; sub-lines say what and which months.
- Round in sentences: "≈", no cents from 10 €. Exact amounts stay in tooltips, tables and on the month page.
- Say yearly amounts per month too.
- Use "mehr als üblich" and "etwas schneller als geplant", never "zu viel", "schlecht" or "Warnung". One idea per sentence.

**German:** long compounds get `wrap-compound`; titles ideally ≤ 60 characters.

**Arabic:**
- no count-dependent plurals ("البنود: {n}");
- amounts in sentences use `tabular-nums`, not `num`;
- percentages through `formatPercent`;
- fractions ("rund ein Drittel") as phrases;
- a native reader reviews the new strings before release.

### 9.11 What appears as data grows

| History | Statistik | Planen |
|---|---|---|
| Running month only | charts for one month; "Ab Dezember vergleichen wir mit deinem November" | *November bis heute* (line only), budgets without suggestions, *Abos & Verträge* |
| 1 finished month | KPI tiles, *Monatsbericht* without "üblich" | pace by day (caption "Basis: 1 Monat"); *Finanz-Check* rows 1–2 |
| 2 | hints H3, H7, H8 | — |
| 3 | median "üblich" | *Ausblick*, *Notgroschen*, P5 (missing payments) |
| 4 | — | ranges (pace, *Ausblick*) |
| 6 | trends (H4), full basis | — |
| 13+ | year comparison (plan 29), *Jahresrückblick* against last year | — |

---

## 10. Engine and code

### 10.1 Layout

`src/insights.ts` becomes a folder. `index.ts` re-exports, so `import … from './insights'` keeps working.

| File | Contents |
|---|---|
| `src/insights/index.ts` | re-exports |
| `book.ts` | `buildBook(data)`: one pass over the entries |
| `baseline.ts` | `usual()`, `materiality()`, quantiles |
| `series.ts` | `monthSeries`, `finishedMonths`, `savings`, … (moved) |
| `rules.ts` | `budgetSplit`, `budgetRule` (moved) |
| `hints.ts` | `unusual`, `priceChanges`, `missingRegulars`, `newNames`, `categoryTrends`, `biggestExpenses`, `bestWorst` (moved) |
| `pace.ts`, `outlook.ts`, `health.ts` | new |
| `highlights.ts` | `Insight`, `highlights()` |
| `detail.ts` | `categoryDetail()`, `payeeDetail()` |
| `review.ts` | `monthReview()`, `yearReview()` |

Test data stays in `src/fixtures/` (plan 01).

- Move first, in its own commit without behaviour changes, at a moment when no other work on these files is open (the redesign is still running).
- `budgets.ts` and `due.ts` stay where they are.
- CLAUDE.md's "Statistics and Insights" rule gets rewritten.

### 10.2 The book

`buildBook(data)` makes one O(n) pass, built once per data change (`useMemo` in `App`, passed down). It holds, per month:
- totals by kind and bucket (need / want / save), paid and open, recurring / one-off / yearly;
- per category, the same split;
- everyday spending per day (undated amounts kept separately);
- per normalised name: months, count, total, last category.

New functions read the book. Existing ones keep their signatures and tests and can move over later.

### 10.3 Insights as data, text in the view

```ts
interface Insight {
  id: string;                 // kind:subject:period — stable, for dismissing and deduping
  kind: 'unusual' | 'trend' | 'betterMonth' | 'record' | 'dataCheck' | 'bigExpense'
      | 'priceChange' | 'newRecurring' | 'missing';
  home: 'statistik' | 'planen' | 'report';
  months: MonthKey[];         // what it's about
  categoryId?: string;
  name?: string;
  tone: 'pos' | 'neutral' | 'warn';
  impact: number;             // cents per month at stake, for ranking
  confidence: number;         // 0–1: basis months, running month, sparse category
  values: Record<string, number>;  // for the template, in cents or %
  action?: { kind: 'category' | 'budget' | 'month' | 'report' | 'add' | 'contracts'; target: string };
}
```

**Ranking:** score = impact × confidence × kind weight.
- **Weights to start with:** dataCheck 1.2, unusual 1.0, priceChange 1.0, newRecurring 1.0, trend 0.9, betterMonth 0.8, missing 0.8, record 0.5, bigExpense 0.4.
- **Dedupe:** one insight per category, keeping the best score.
- **Caps:** 3 on Statistik, 5 in the Monatsbericht.
- Ranking scenarios are tests ("a 120 € grocery jump outranks a 9 € new name").

**Dismissing:** ids go into a view preference, `spartopf-hints-hidden`:
- not in backups (like `accent` and plan 13's `spartopf-reviews-seen`);
- no amounts;
- capped at the last 200.

**Text:** one translation key per kind and variant, numbers formatted by the view. Logic never builds sentences.

### 10.4 Thresholds (named constants, documented, tested)

| Constant | Value | Used for |
|---|---|---|
| `MATERIAL` | max(25 € × months, 1.5 % of the usual monthly Ausgaben × months) | every "more / less than usual" |
| `UNUSUAL_SHARE` | 20 % of usual | H3 |
| `TREND` | 15 % and 20 € a month | H4, change chips |
| `PRICE` | 3 % and 1 € | P3 |
| `PACE_RANGE` | max(25 €, 5 % of usual-today) | H1 |
| `EARLY_DAYS` / `STALE_DAYS` | 3 / 7 | H1, H7 |
| `DATED_SHARE` | 80 % | H1 method |

For a household spending 2.500 € a month, `MATERIAL` is 37,50 €; at 5.000 € it's 75 €.

### 10.5 Other rules

- **Time:** every function takes `today`; nothing reads the clock inside the logic (existing pattern).
- **Navigation:**
  - `PushedId` gains `category` and `monthReport`; their parameter lives in `App` state, one per pushed screen (CLAUDE.md).
  - `PARENT` becomes "the tab it was pushed on", so opening the report from *Planen* doesn't jump to *Monat*.
  - Back, edge swipe and scroll reset are unchanged.
- **Performance:** a synthetic 10-year book (≈ 18.000 entries) builds the book and runs every Statistik and Planen computation in < 50 ms in vitest. On an iPhone SE, switching to either tab causes no long task > 50 ms (Web Inspector).
- **Privacy:** no network, no logging. The dismissed ids hold no amounts. The share image is made only on tap, without amounts unless switched on.
- **Schema:** none. Everything new is computed, or a view preference.

---

## 11. Delivery plan

Sizes as in COMPETITOR_ANALYSIS.md: S ≤ 2 days, M 3–10 days, L 2–6 weeks.

| Phase | Goal | Size | Needs | Plan in [plans/README.md](plans/README.md) |
|---|---|---|---|---|
| **0** | Numbers you can trust | M | plan 01 (golden year, speed budgets) | **06a**, after plan 06 |
| **1** | Two clear tabs | M | 0 | **06a** |
| **2** | Looking ahead | M | 1 | **06a** |
| **3** | Drill-down | M | 0 (in parallel with 2) | **06a** |
| **4** | Rituals | M | 2, 3; plan 12 for the goal line | **13**, rewritten; before plan 29 |
| 5 | Later | — | native plans | plans 15, 17, 22, 26, 30, 31, 32 |

### Phase 0 — Numbers you can trust (M)

1. **Before captures.** From the current `main`: `ui-review --only stats,stats-full,insights,insights-full` (4 sizes × DE/AR × light/dark, plus `--text 2`) into `before/`.
2. **Statistik ends at the running month** (I9). Started future months only feed *Ausblick*. Test.
3. **D1, "gespart" includes Angelegt** (I1).
   - `MonthPoint` gets `invested`, `spending` and `kept`; `saved` and `rate` take the new meaning.
   - KPI caption: "davon Ø 150 € angelegt" when there is some.
   - The Ausgaben column leaves Angelegt out; the tooltip shows it.
   - The table gets an *Angelegt* column when any month has some.
   - `forecast()` uses `kept`; the reserve divides by Ausgaben.
   - Tests:
     - Sparquote = the 50/30/20 save share;
     - `kept` = the change in month-end balance (no override);
     - **a book without savings categories gives exactly today's numbers.**
4. **Robust "üblich"** (I5, I6).
   - `usual()` per §6; `MATERIAL`; yearly entries left out of `unusual()`.
   - Tests: one spike, a lumpy category, a yearly-bill month.
5. **Rounded estimates and axes** (I6, I10).
   - `formatMoneyEstimate()`: from 10.000 € to 100 €, from 1.000 € to 10 €, otherwise whole euros. For every "≈".
   - Axis labels with `useGrouping: 'always'` ("4.000"). Check on iOS WebKit; fall back to standard notation below 1 Mio.
6. **Book and folder** (I12): §10.1 and §10.2, plus a budget in plan 01's `scripts/perf-check.mjs` for switching to Statistik and to Planen.
7. **Golden data:** extend plan 01's golden year (`src/fixtures/demo-year.json`, `golden.json`, `src/golden.test.ts`) with:
   - an ETF plan, yearly bills and undated entries;
   - an opening override;
   - a month with leftover open entries;
   - a lumpy category.

   Every KPI is recorded. D1 changes recorded values on purpose: re-record with `npx vitest run src/golden.test.ts -u` and say why in the commit.

**Done when:**
- [x] Before and after captures are saved.
- [x] For the same month, the month page, Statistik and Planen agree: the same Einnahmen; the month page's expenses = Ausgaben + Angelegt; its result = Kontoplus.
- [x] A book without savings categories is unchanged.
- [x] Performance budget met.

### Phase 1 — Two clear tabs (M, a second pass over *Planen*)

Step 9 already renamed the tab (file and id stay `InsightsView.tsx` / `insights`; keep them) and built Abos & Verträge.

1. **Planen order** per §7, with empty slots for *November bis heute* and *Ausblick* (phase 2) and for plans 11 and 12.
2. **Abos & Verträge** gains P4 and P5. *Eintragen* opens the entry sheet prefilled (name, category, usual amount, open). P3 is already on its rows; add the yearly effect.
3. ***Finanz-Check*** (D4, D5): `financeCheck(book, today)`, rows 1–3.
   - The savings-rate chart (already `chart-in`) and the 50/30/20 card become row 1's detail.
   - `ReserveMeter` is row 3's.
4. **Highlights engine** (§10.3):
   - candidates from the existing hint functions (H6 from `bestWorst`), plus the new H5 and H7;
   - ranking, dedupe, caps, dismissing;
   - strings in de/en/ar;
   - a test that renders every kind in every language with no placeholder left.
5. ***Statistik › Das fällt auf*** (D2): top three above *Verlauf*.
   - Rows with mini bars and actions.
   - *Kategorie* opens the *Wofür* row until phase 3 brings the screen.
6. **Remove:**
   - *Hinweise zum Monat* (‹ › and the per-card periods), including *Neuer Preis*;
   - *Trend der letzten 3 Monate* (now a highlight);
   - *Bester und schwächster Monat*.

   *Prognose* stays, rounded, until *Ausblick* replaces it.
7. **CLAUDE.md:** the Statistics/Insights bullet rewritten.

**Done when:**
- [x] *Planen* has one scope per card.
- [x] Every former hint has a home (§7 table).
- [x] No more than three highlights.
- [x] Each highlight has an action or a reason not to.
- [x] ui-review is clean on `stats`, `stats-full`, `insights`, `insights-full`, `contracts`.

### Phase 2 — Looking ahead (M)

1. `pace(book, today)` with tests (§9.1), and `PaceChart` on the generalised frame. Week targets for VoiceOver, scrubbing for touch.
2. ***November bis heute*** on top of *Planen*: headline rules, the freshness line, the early-month rule, the share line. It links to the month page until phase 4.
3. `outlook(book, data, today)` with tests (§9.5): `OutlookChart`, the headline rules and *Große Posten*. **Replaces *Prognose*.**
4. **`ExplainSheet`** (*So berechnet*) for the five key figures.
5. **Plan 11 hook:** `yearlyReserve()` uses `outlook()` for its shortfall.

**Done when:**
- [x] Pace is right on the fixtures for both methods, the early-month rule and a stale month.
- [x] *Ausblick*'s range collapses when every month is the same.
- [x] A yearly bill lands in its month.
- [x] roast-my-chart: no 🔴, every 🟠 fixed or justified in the notes.

### Phase 3 — Drill-down (M; can run alongside phase 2)

1. **Navigation** (§10.5) for parameterised pushed screens.
2. `categoryDetail(book, id, months, today)` with tests.
3. **`CategoryView.tsx`** per §9.4. It reuses `CategoryTrendChart`, `BudgetSheet` and the entry sheet.
4. ***Wofür* rows** per §9.3. A row pushes the screen; the inline chart goes.
5. **`PayeeSheet`** (`payeeDetail`). *Alle Einträge* runs the existing all-months search with the name.

**Done when:**
- [ ] The VoiceOver path is complete: Statistik → category → entry → back. *(on the iPhone; not done yet)*
- [ ] Edge swipe works in DE and AR. *(on the iPhone; the pushed screens use the existing swipe, not tried on a device yet)*
- [x] No overflow at `--text 2`.

### Phase 4 — Rituals (M)

1. `monthReview(book, month, today)` with tests. It keeps plan 13's original rules: not in the first month, not for an empty month, once per month.
2. **`MonthReportView`** with its four entry points (§7). The month-review card opens it, not *Planen*.
3. `yearReview(book, year, today)` and **`YearReviewView`**:
   - the seasonal card;
   - *Als Budgets übernehmen* (undoable);
   - the share image via `@capacitor/share` (already a dependency), amounts hidden by default.
4. **Align plan 29** (years, comparison) and **plan 28** (PDF) with `yearReview` / `monthReview`.

**Done when:**
- [x] The report's figures equal Statistik's for the same month.
- [x] The share image never shows amounts unless switched on.

### Phase 5 — Later

- **Notifications,** opt-in and without amounts, through plan 00's reminder scheduler:
  - "Dein Oktober im Rückblick";
  - "Restaurants: Budget zu 80 % verbraucht";
  - "Im März wird es knapp".
- **Tags** (26) in *Wofür*; **accounts** (30) bring net worth; **debts** (31) in *Ausblick*.
- **Payday month** (32): pace and *Ausblick* go through the month helpers only, never `Date` arithmetic, so plan 32 can redefine a month.

---

## 12. Production gates

Every phase:

1. **Checks:** `npm run check` (plan 01: lint, tests including the compat and golden ones, build, privacy, speed budgets, contrast).
2. **Correctness:**
   - unit tests for every new function, with the edge cases below;
   - fixtures from §11 phase 0.7.
3. **Invariants**, on books from a seeded generator inside the test (no new dependency):
   - category shares add up to 100 % (± rounding);
   - the pace curve never goes down;
   - Gespart = Einnahmen − Ausgaben = Kontoplus + Angelegt;
   - the month-end balance changes by Kontoplus between consecutive months without an override;
   - *Ausblick* with zero variance has an empty range;
   - no category appears twice among the highlights;
   - every action's target exists.
4. **Consistency:** one test reads the same month through `monthTotals`, `monthSeries`, `monthReview` and `categoryDetail`, and compares.
5. **Edge cases:**
   - months without income;
   - every month negative;
   - an opening override mid-history;
   - yearly-only categories;
   - undated history (linear pace);
   - a deleted category (orphans in *Sonstiges*);
   - a bucket changed from need to want (50/30/20 recomputed);
   - a started future month;
   - one huge entry (a down payment);
   - a running month with one entry;
   - 31-day vs. 28-day months;
   - Arabic digits in input.
6. **Performance:** §10.5, measured, with the numbers written into plan 06a's notes next to plan 01's baselines.
7. **UI review:**
   - `node scripts/ui-review.mjs --only stats,stats-full,insights,insights-full,<new screens>`;
   - new screens added to the script: `category`, `month-report`, `year-review`, `payee-sheet`, `explain-sheet`;
   - SE / 16 / 17 Pro / 17 Pro Max × DE / AR × light / dark, `--text 2`, desktop;
   - no small targets, overflow or truncation.
8. **Charts:** a roast-my-chart pass on every new chart; 🔴 fixed, 🟠 fixed or justified.
9. **VoiceOver on the device** (script):
   - Statistik top to bottom;
   - a highlight's action;
   - the pace chart by week;
   - the category screen and back;
   - *Ausblick*'s summary;
   - *Finanz-Check* rows;
   - the explainer.
10. **Languages:** every key in de, en and ar (a parity test); a native Arabic reader for new sentences; German compounds wrap.
11. **Old data:** plan 01's fixtures (`src/fixtures/`, `compat.test.ts`) still load, and give finite numbers in every new figure (no `NaN` or `Infinity` anywhere in the book).
12. **Copy review** against §9.10.
13. **Usability check.** There's no analytics, by design, so test with five people (one Arabic speaker, one over 60) on six tasks:
    - "Wie viel hast du diesen Monat schon für den Alltag ausgegeben – mehr oder weniger als sonst?"
    - "Was hat das Auto dieses Jahr gekostet?"
    - "Reicht das Geld bis März?"
    - "Wofür gibst du mehr aus als früher?"
    - "Wie viel sparst du im Monat?"
    - "Was ist im Oktober anders gelaufen?"

    **Pass:** 4 of 5 solve each task in under a minute without help. Confusions are fixed before release. TestFlight and plan 15's feedback mail cover the rest.
14. **Docs:**
    - CLAUDE.md rules;
    - README features;
    - the What's New line in `store/listing.md`;
    - a note in REDESIGN §10 that this plan refines steps 8 and 9.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| More content makes the app feel heavier | Caps (3 highlights), cards that hide when empty, the §9.11 unlock order, plan 37's checklist after phase 4 |
| A wrong number in a headline destroys trust | Fixtures, invariants, the consistency test, *So berechnet* |
| A forecast is read as a promise | Dashed line, "≈", a range, the basis in the sub-line, hidden below 3 months, explainer |
| A month not kept up to date looks cheap | Freshness line (H1), data-check hint (H7) |
| D1 changes visible numbers for users with a savings category | What's New line; KPI caption "davon angelegt"; unchanged for everyone else (regression test) |
| Other plans run in parallel on the same files | Start each phase from a clean tree; the folder move gets its own commit when nothing else is open |
| Old iPhones | One book per data change, memoised views, the performance test |
| Judgmental wording | Copy rules, tone tokens, native-speaker review |

---

## 14. Decisions

Taken on 7 November 2026, all as recommended. To change one, change it here and in [plans/README.md](plans/README.md#decisions-already-taken) before plan 06a starts.

| # | Question | Decision | Not chosen |
|---|---|---|---|
| **D1** | What "gespart" means | Money put into a savings category counts as saved, everywhere in the statistics. The month page keeps the account view (every outflow) and *Ausblick* uses *Kontoplus*; Statistik shows *Angelegt* separately, so the two reconcile on screen. | Keep the account meaning and rename 50/30/20's third part. That contradicts the rule's own definition. |
| **D2** | Where hints live | Recent → *Statistik › Das fällt auf*; forward → *Planen*; any month → *Monatsbericht*. The *Hinweise zum Monat* block and its ‹ › go. This changes REDESIGN §4's "hints unchanged". | Keep the block at the bottom of *Planen* |
| **D3** | What the pace counts | Everyday spending only (fixed costs out, as Copilot does) | All spending, which spikes on the 1st |
| **D4** | *Sparen und Reserve* | *Finanz-Check*: 3–4 rows, no score | Keep the four cards |
| **D5** | *Notgroschen* basis | Projected month-end balance ÷ *Grundbedarf* | Today's balance ÷ all spending (today's rule, which overstates) |
| **D6** | *Planen* order, *Prognose* | §7 order; *Ausblick* replaces *Prognose* | REDESIGN order with *Prognose* at the bottom |
| D7 | Year review sharing | Image only on tap, amounts hidden by default | No sharing |
| D8 | `src/insights/` folder | Yes, in its own commit | Keep one file of ~1.500 lines |

plans/README.md (plan 06a, plan 13 and the decisions table) and CLAUDE.md point here.

---

## 15. Sources

All checked on 7 November 2026. Product descriptions and studies are paraphrased; content was rephrased for compliance with licensing restrictions.

**Apps**
- Copilot: [Dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) · [Cash Flow](https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview) · [Optional budgeting](https://help.copilot.money/en/articles/6282850-optional-budgeting)
- Monarch: [Monthly review](https://help.monarch.com/hc/en-us/articles/4402543752468-Monthly-Progress-Report) · [Sankey](https://www.monarch.com/blog/visualize-your-cash-flow-like-never-before) · [Cash Flow](https://help.monarchmoney.com/hc/en-us/articles/20504904768020-Cash-Flow) · [Mobile reports, forecasting](https://www.monarch.com/blog/june-product-update)
- YNAB: [Spending Breakdown](https://support.ynab.com/en_us/spending-breakdown-H1H7YxmD0) · [Income v Expense](https://support.ynab.com/en_us/income-v-expense-Byu1BYWRq) · [Age of Money](https://support.ynab.com/en_us/age-of-money-H1ZS84W1s)
- Monzo: [Balance in Trends](https://monzo.com/blog/balance-in-trends) · [Targets](https://monzo.com/blog/targets-in-trends) · [Yearly view](https://community.monzo.com/t/yearly-view-in-trends/129210)
- Revolut: [Analytics graph](https://www.revolut.com/en-US/help/my-accounts/budgeting-and-analytics/how-does-the-analytics-graph-work) · [Analytics feature](https://www.revolut.com/en-DE/help/my-accounts/budgeting-and-analytics/how-does-the-analytics-feature-work)
- PocketGuard: [Leftover](https://pocketguard.com/help/leftover/)
- Emma: [Budgeting](https://emma-app.com/features/tracking/budgeting) · [Budget set-up](https://help.emma-app.com/en/article/set-up-your-budget-1s3q9wr/)
- Simplifi: [Spending Plan](https://support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan) · [Watchlists](https://support.simplifi.quicken.com/en/articles/3472367-using-watchlists-on-the-web-app) · [Projected balances](https://www.quicken.com/blog/how-project-balances-and-cash-flow/)
- Wallet: [Percentages](https://help.budgetbakers.com/wallet/a/what-does-the-percentage-next-to-income-expenses-mean-36546774821778) · [Cash flow insights](https://budgetbakers.com/en/products/wallet/features/cashflow-insights/)
- Money Lover: [Home screen](https://moneylover.zendesk.com/hc/en-us/articles/34522203246745-Home-Screen)
- Money Manager: [Stats tab](https://help.realbyteapps.com/hc/en-us/articles/360042842734-Stats-tab) · [Budgets](https://help.realbyteapps.com/hc/en-us/articles/360042842974-How-to-set-up-modify-delete-a-budget)
- Outbank: [Auswertungen](https://help.outbankapp.com/de/kb/articles/wie-kann-ich-die-auswertungder-app-nutzen)
- Finanzguru: [Ausgaben-App](https://finanzguru.de/finanzwissen/ausgaben-app) · [Homepage](https://finanzguru.de/)
- Actual Budget: [Reports](https://actualbudget.org/docs/reports/)
- Cashew: [App Store](https://apps.apple.com/sg/app/cashew-expense-budget-tracker/id6463662930)

**Design**
- Apple HIG: [Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data) · [Charts](https://developer.apple.com/design/human-interface-guidelines/charts)
- Apple Health: [Highlights and Trends](https://support.apple.com/en-nz/guide/iphone/iphe3d379c32/ios)
- Graphical perception: [Cleveland & McGill](https://info3312.infosci.cornell.edu/ae/graphical-perception-A.html) · [Are pie charts evil? (2024)](https://journals.sagepub.com/doi/10.1177/14738716241259432)

**Research**
- Levi & Benartzi, *Mind the App* (Journal of Finance, forthcoming): [author page](https://www.leviyaron.com/)
- Levi, *Personal Financial Information Presentation and Consumer Spending* (JFQA 2026): [Cambridge](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/personal-financial-information-presentation-and-consumer-spending/FB3B05430DC8FFCEC2707C4161E83086)
- Carlin, Olafsson & Pagel, *Mobile Apps and Financial Decision Making* (Review of Finance 2023): [summary](https://revfin.org/mobile-apps-and-financial-decision-making)
- Gargano & Rossi, *Goal Setting and Saving in the FinTech Era* (Journal of Finance 2024): [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3579275)
- Financial Health Network: [Pulse 2026](https://finhealthnetwork.org/research/financial-health-pulse-2026-u-s-trends-report/) · [BBVA on the eight indicators](https://www.bbva.com/en/financial-health/financial-health-eight-indicators-measure/)
- Notgroschen: [Finanzfluss](https://www.finanzfluss.de/geldanlage/notgroschen/) · [Verbraucherzentrale](https://www.verbraucherzentrale.de/laura-zieht-aus/sparen)
