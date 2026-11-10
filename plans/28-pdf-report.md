# 28 · PDF report

- **Covers:** F15. MoneyControl sells it as a paid add-on; Outbank and Bluecoins include it.
- **Depends on:** 13, 14
- **Size:** S–M
- **Native:** iOS (`WKWebView.createPDF` in the bridge) and Android (print to PDF)
- **Schema:** no change

## What the user gets

*Bericht teilen*, in plan 13's *Monatsbericht* and *Jahresrückblick*, creates a PDF of that month or year, to share or print. It contains:
- totals
- categories with their budgets
- open items
- every entry, if the user wants that

## Keep it simple

The report is one menu item. It has a single choice, month or year, and a switch for including all entries.

## Design

- **The report** is plan 13's report screen (`monthReview` / `yearReview`), with a print stylesheet (`@media print` in `src/index.css`): white background, no chrome, page breaks between sections.
- **iOS:** the bridge renders the report in an off-screen web view, returns a PDF (`createPDF`) and opens the share sheet.
- **Web:** `window.print()`.
- **Android:** `PrintManager`.
- **Amounts** always show in the PDF, because it's an export the user asked for. *Beträge verbergen* doesn't apply.
- **Footer:** "Erstellt mit Spartopf am …".

## Tests and checks

- Month and year reports in DE, EN and AR (RTL), printed on paper and viewed on screen.
- A long year with page breaks.

## Done when

- [ ] Month and year reports look right on paper and on screen in all three languages. (Checked with Chromium's print-to-PDF in DE light, AR dark and a DE year with 496 entries; the iPhone's PDF and a paper print are still to do.)

## Notes (built)

- **The flow:** *Bericht teilen* (a secondary button at the end of both reports) opens `ReportPdfSheet` with its one choice, every entry or not. The month or the year is the report you are on.
  - `PrintReport` draws the report again as a portal on `<body>`; the print stylesheet prints only that.
  - iOS: `SpartopfShared.makePdf` renders the web view's print layout with `UIPrintPageRenderer` (A4, 40 pt margins) into a temporary PDF, opens the share sheet, and deletes the file when it closes.
  - Web: `window.print()`, where "Save as PDF" is the browser's.
- **Shared bodies:** the screens' bodies became `MonthReportBody` and `YearReviewBody`, used by the screen and the print alike. Interactive bits (the "Zum Monat" link, *Budgets übernehmen*) are optional props, left out in print.
- **Light, always:** the copy carries `data-theme="light"`. Tailwind resolves the `--color-*` tokens at the root, so `.print-root` declares them again, and `src/index.test.ts` fails if the list falls out of step with `@theme`. Backgrounds print inside the report (`print-color-adjust: exact`), so the year's hero and the share bars keep their colour. The page itself stays white.
- **Amounts:** they always show in the PDF, as planned. An `AmountsShown` pair around the print copy lifts *Beträge verbergen* for it alone, so the screen behind the share sheet keeps hiding them.
- **The entries table:** date, name, category, amount with its sign, and *offen*. One table per month, after a page break; the column titles come from the CSV header in each language.
- **Strings:** in all 14 languages. The bundle is at 312.9 kB gzip, within budget.
- **Still to do on an iPhone:** *Bericht teilen* in DE and AR → the share sheet → the PDF looks right (margins, page breaks, a long year), and a printed page.
