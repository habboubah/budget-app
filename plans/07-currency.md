# 07 · Currency

- **Covers:** F26; a reviewer asking for CHF (Finanzfluss Copilot); Arabic- and English-speaking users outside the euro area
- **Depends on:** 00
- **Size:** S–M
- **Native:** none
- **Schema:** bump (optional `AppData.currency`)

## Why

- Every formatter in `src/logic.ts` hard-codes `currency: 'EUR'`: `moneyFormat`, `formatMoneyShort` and `formatMoneyApprox`.
- `parseAmount()` only strips `€`.
- The app speaks Arabic and English, but someone in Riyadh, Zürich or London can't use it with their own money.

## What the user gets

- The right currency from the start, picked from the phone's region: de-CH → CHF, en-GB → GBP, ar-SA → SAR, and so on.
- *Optionen › Darstellung › Währung* to change it (a menu row).

## Keep it simple

No first-run question; most people never see the setting. Changing the currency relabels the amounts but doesn't convert them, and the confirmation says so.

## Design

- **Supported currencies:** only those with two minor digits, because amounts are integer cents. That means EUR, CHF, GBP, USD, CAD, AUD, SEK, NOK, DKK, PLN, CZK, TRY, SAR, AED, QAR, EGP, MAD and others that pass this check: `new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits === 2`. Leave out JPY, KWD, BHD and anything else with 0 or 3 digits.
- **Data:** `AppData.currency?: string` (ISO 4217). It's part of backups. Unset means EUR, so all existing data stays as it is.
- **Default:**
  1. Get the region from `new Intl.Locale(navigator.language).maximize().region`.
  2. Map it through a small table to a supported currency.
  3. Fall back to EUR.
- **Formatting:**
  - The formatters take a currency.
  - To avoid touching every call site at once, `logic.ts` keeps a module-level active currency, set by the store (`setActiveCurrency()`).
  - Tests pass the currency explicitly.
- **Parsing:**
  - `parseAmount()` strips any currency symbol (`\p{Sc}`) and three-letter codes.
  - It accepts `’` and `'` as thousands separators (de-CH formats "1’050.50").
  - `searchTerms()` ignores lone symbols the same way.
- **Bank import:** CSV rows whose currency column (`Waehrung`, `Währung` or `Currency`) differs from the book's show "andere Währung" and start unticked.
- **CSV export:** a `Währung` column at the end, so the column order Excel users rely on stays the same.
- **Later:** the widget snapshot (plan 14) carries the currency.

## Steps

1. Currency list, region map and tests.
2. Formatters and parser.
3. The setting row, the store field, backups and `normalizeState`.
4. The import and export changes.
5. ui-review with CHF, GBP and SAR (with the Arabic UI).

## Tests and checks

- Formatting per currency and locale.
- In the Arabic UI with SAR, amounts stay LTR.
- Parsing with symbols, codes and Swiss grouping.
- Old backups without `currency` load as EUR.

## Done when

- [ ] New installs get the regional currency, and existing users keep EUR.
- [ ] The setting relabels everything: cards, charts, CSV and import.

## Not in this plan

Several currencies in one book, or exchange rates. That could come later, together with accounts (30).
