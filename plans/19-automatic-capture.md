# 19 · Apple Pay, bank notifications and "Teilen an Spartopf"

- **Covers:**
  - F8.
  - Competitors: Spendee logs Apple Pay payments automatically from iOS 27; Wallet and MoneyCoach import them through Shortcuts.
  - A Monefy reviewer's request to read bank messages.
  - The privacy-safe answer to bank sync from COMPETITOR_ANALYSIS.md.
- **Depends on:** 14, 18
- **Size:** M–L
- **Native:** iOS (App Intents, a share extension)
- **Schema:** no change

## Why

Card payments are most of what people type in. Apple's FinanceKit isn't available in Germany (only in the US and UK), but two Shortcuts triggers are:

- **Transaction:** runs after an Apple Pay or Wallet payment (iOS 17+).
- **Notification:** runs when an app posts a notification (iOS 27).

Both run on the phone, with no bank login.

## What the user gets

1. **Setup guide** under *Optionen › Automatisch erfassen*: a short guide with pictures for setting up each automation once, plus a link to a ready-made shortcut.
2. **Automatic entries.** After setup, an Apple Pay payment or a push from the banking app ("Kartenzahlung 12,40 € bei REWE") becomes an entry:
   - the user's own name for that payee, as in the CSV import;
   - the right category;
   - booked as paid.
3. **Teilen an Spartopf.** Share a banking screenshot from Photos, or a CSV from Files or Mail, to Spartopf. It opens the existing import review.
4. **Mode switch:**
   - **Gleich buchen** (default): one undo toast.
   - **Erst prüfen**: a *Neu* row on the month page lists the new payments, one tap each.

## Keep it simple

Nothing happens until the user sets up an automation. The guide is one screen with numbered steps.

## Privacy and security

- **No credentials, no network.** No bank login, no network use.
- **Notification texts** are parsed once and thrown away; only the entry is kept.
- **Only chosen apps.** Spartopf only sees notifications from the apps the user picks in their own automation.
- **No duplicates.** Each item gets a fingerprint (`Entry.ref`), so a later CSV import of the same payment shows it as already entered.
- **The ready-made shortcut link** opens Apple's shortcut page in Safari; the app sends nothing. The guide also explains how to build the shortcut by hand.

## Design

- **`ImportWalletTransactionIntent`:** `card: String`, `merchant: String`, `amount: IntentCurrencyAmount`, `name: String`. It creates an inbox item with `source: 'wallet'`.
- **`ImportNotificationIntent`:** `app: String`, `title: String`, `body: String`. It creates an inbox item with `source: 'notification'` and `text`.
- **`parseNotificationText(text, locale)`** in `src/statementImport.ts`: reads the amount, the payee, debit or credit, and the date if there is one.
  - It's built from real notification texts of the common German banks and payment apps: Sparkasse, Volksbank, ING, DKB, Commerzbank, N26, Revolut, PayPal, C24, Trade Republic.
  - Collect anonymized texts, starting with Ahmad's own. The tests use only rewritten samples, never real names.
- **`inboxToEntries`** (plan 14) sends both sources through `planStatement()`.
- **Share extension `SpartopfShare`** (images and CSV):
  1. Copies the file into the App Group.
  2. Opens `spartopf://import?file=…`.
  3. The app runs the existing `parseStatementText` / `parseBankCsv` path.
- **Review mode:** a *Neu (3)* row at the top of the month page, using `StatementImportSheet` for the list.

## Steps

1. The Wallet intent end to end, with the guide.
2. The notification intent, with the parser and the samples.
3. The share extension.
4. Review mode.

## Tests and checks

- **Parser:** one test per bank sample.
- **Duplicates:** a later CSV import of the same payment.
- **On a device**, in DE and AR:
  - a real Apple Pay payment (a small amount) with the automation;
  - a test notification from the banking app;
  - sharing a screenshot and a CSV.

## Done when

- [ ] Apple Pay payments and bank notifications become entries without typing, with undo or review.
- [ ] Sharing a screenshot or a CSV to Spartopf opens the import.
