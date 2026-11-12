# 36 · On-device bank connection (FinTS)

- **Covers:** F11, route b. Bank connection is the main reason the top German apps lead (Finanzguru, Outbank, finanzblick), and Stiftung Warentest rated apps with a bank connection higher.
- **Depends on:** 05, 06, 10, 20, 30
- **Size:** XL
- **Native:** iOS and Android (native HTTP, Keychain/Keystore)
- **Schema:** bump (`AppData.connections?`)

## Why

Most people expect to link their bank. Spartopf can offer that without breaking its promise:
- Like Outbank, the app talks directly to the user's own bank over FinTS.
- The data stays on the phone.
- No aggregator, no server of our own.

## What the user gets

*Optionen › Bank verbinden (Beta)*:

1. Pick the bank, by name or BLZ.
2. Enter the online-banking login.
3. Confirm in the bank's app (pushTAN).

After that:
- **Umsätze abrufen** fetches new transactions into the import review, or books them directly using the rules from plan 20.
- The bank's balance fills in *Mit Bank abgleichen* (plan 10).

## Keep it simple

It's hidden behind one row and marked Beta. CSV import, screenshot import and Apple Pay capture stay there for everyone else.

## Privacy and security

- **Connections:** only to the bank's own FinTS server, over HTTPS.
- **Store declarations:** the privacy label stays "Data Not Collected". The App Review note explains the bank connection.
- **PIN:** asked for at every sync by default. Saving it is optional; it then goes into the Keychain/Keystore, protected by biometrics.
- **Imported transactions** go through the same `planStatement()` checks and limits (05) as a CSV.

## Phase A: feasibility (go/no-go)

1. **Registration.** Apply for the FinTS product registration with Die Deutsche Kreditwirtschaft. It's free, and the number usually arrives within 10–15 working days. Ahmad applies, and the number goes into the gitignored release config.
2. **Library.** Compare two options:
   - a TypeScript FinTS client, e.g. the `fints` package, checked for maintenance, licence and code quality;
   - a small implementation of our own, covering just the parts we need: dialog init, HKTAN (pushTAN/decoupled), HKSAL (balance) and HKKAZ/HKCAZ (transactions).
3. **Networking.** Use native HTTP (CapacitorHttp) for the bank endpoints; a web view's `fetch` will probably be blocked by CORS.
4. **Real test.** Try Ahmad's Sparkasse account and one other bank group (Volksbank or ING). Real accounts for testing only, and no data committed.
5. **Decision.** Write it into this plan: go ahead, or stop and keep the other capture paths.

## Phase B: build (only after "go")

- **Bank directory:** from the institute list that comes with the registration.
- **Strong authentication:** pushTAN first, then manual TAN entry.
- **Errors:** a message in the user's language for each FinTS return code.
- **Reconnecting:** after the bank's periodic re-authentication.
- **Parsing:** camt or MT940 → `Found[]` → the existing import review. Duplicates are caught by `Entry.ref`.
- **When to fetch:** only on request, or once a day when the app opens if the user turns that on. Never in the background without the user.

## Tests and checks

- Parsing camt and MT940 samples (rewritten, no real data).
- Each FinTS error code shows the right message.
- Device:
  - two bank groups end to end, with pushTAN, balance and transactions;
  - the bank refusing: wrong PIN, a locked account, a timeout.

## Done when

- [ ] The phase A decision is written down.
- [ ] If it's a go: two bank groups work end to end on a device, and every bank refusal fails gracefully.
