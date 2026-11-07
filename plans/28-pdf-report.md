# 28 · PDF report

- **Covers:** F15. MoneyControl sells it as a paid add-on; Outbank and Bluecoins include it.
- **Depends on:** 14
- **Size:** S–M
- **Native:** iOS (`WKWebView.createPDF` in the bridge) and Android (print to PDF)
- **Schema:** no change

## What the user gets

*Statistik › ⋯ › Bericht teilen* creates a PDF of a month or a year, to share or print. It contains:
- totals
- categories with their budgets
- open items
- every entry, if the user wants that

## Keep it simple

The report is one menu item. It has a single choice, month or year, and a switch for including all entries.

## Design

- **The report** is a screen built from the app's own components, with a print stylesheet (`@media print` in `src/index.css`): white background, no chrome, page breaks between sections.
- **iOS:** the bridge renders the report in an off-screen web view, returns a PDF (`createPDF`) and opens the share sheet.
- **Web:** `window.print()`.
- **Android:** `PrintManager`.
- **Amounts** always show in the PDF, because it's an export the user asked for. *Beträge verbergen* doesn't apply.
- **Footer:** "Erstellt mit Spartopf am …".

## Tests and checks

- Month and year reports in DE, EN and AR (RTL), printed on paper and viewed on screen.
- A long year with page breaks.

## Done when

- [ ] Month and year reports look right on paper and on screen in all three languages.
