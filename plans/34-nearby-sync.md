# 34 · Nearby sync and household sharing

- **Covers:**
  - F24 and F25, done locally.
  - YNAB, Monefy, Spendee, Wallet, Goodbudget and Bluecoins let couples share a budget, and YNAB reviewers praise budgeting together.
- **Depends on:** 33
- **Size:** XL
- **Native:** iOS and Android networking
- **Schema:** sync state per paired device

## What the user gets

Under *Optionen › Mit anderen Geräten teilen*:

- **Pair once:** one phone shows a QR code, the other scans it.
- **Sync by itself:** from then on, whenever both devices are on the same Wi-Fi with Spartopf open, they sync, e.g. "Mit Leas iPhone abgeglichen, gerade eben". **Jetzt abgleichen** starts a sync by hand.
- **Who:** the user's own iPhone and iPad, or a partner's phone. Up to 5 devices.
- **Trennen** removes a device. Its key is deleted on both sides the next time they meet.

## Keep it simple

One row in *Optionen* and two screens. Nothing changes for people who never pair a device.

## Privacy and security

- **No internet, no server.** Devices find each other on the local network (Bonjour / DNS-SD) and talk directly.
- **Keys.** Pairing exchanges keys through the QR code (ECDH P-256, via WebCrypto or natively).
- **Encryption.** Every message is encrypted and authenticated with the pair's key (AES-GCM), so other devices on the Wi-Fi learn nothing.
- **Permission.** iOS asks for local-network access (`NSLocalNetworkUsageDescription`, `NSBonjourServices` `_spartopf._tcp`), with a clear explanation in DE, EN and AR.

## Design

- **Spike first (1 week):**
  - iOS: `Network.framework` (`NWListener` / `NWBrowser`). Android: `NsdManager` plus sockets. Both as our own Capacitor plugins.
  - Measure discovery and transfer on a home Wi-Fi, iPhone ↔ Android.
  - Go on only if it's reliable in both directions.
- **Protocol:**
  1. Hello: device id, plus a watermark of the last change seen.
  2. Change sets since that watermark.
  3. `mergeData` from plan 33.
  4. Ack.

  The protocol is idempotent and resumes after a dropped connection.
- **Background:** iOS doesn't keep apps listening in the background, so syncing happens while the app is open and on resume. The UI says so.
- **Conflicts:** the newest edit wins. For a day, the entry's row shows who changed it, e.g. "geändert von Lea".

## Tests and checks

- The merge and protocol tests: dropped connection, double delivery, a device that was unpaired.
- Devices: two iPhones; iPhone + iPad; iPhone + Android. All of them with the router's internet connection unplugged.

## Done when

- [ ] Pairing, automatic sync, manual sync and unpairing all work with no internet connection, between:
  - two iPhones
  - an iPhone and an iPad
  - an iPhone and an Android phone
