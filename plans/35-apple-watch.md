# 35 · Apple Watch

- **Covers:** F22. YNAB, Outbank, finanzblick and MoneyControl have Watch apps.
- **Depends on:** 14, 17, 09
- **Size:** L
- **Native:** watchOS (SwiftUI)
- **Schema:** no change

## What the user gets

- **Glance:** *Jetzt*, *Am Monatsende* and *pro Tag*.
- **Bills:** the next open bills, which can be ticked off.
- **Quick add:** with favourites, the Digital Crown or dictation.
- **Complications:** e.g. "72 €/Tag" and the paid ring.

## Keep it simple

The watch app shows the same few numbers as the widgets, and quick add only uses favourites, the Digital Crown or dictation. There's nothing to set up.

## Privacy and security

- **Source:** the data comes from the iPhone over WatchConnectivity, which is local and encrypted by watchOS.
- **On the watch:** only the snapshot is kept.
- **Complications:** follow the "no amounts" default.

## Design

- **App:** a watchOS target that reads the snapshot the iPhone app sends, in plan 14's format.
- **Actions:** sent back to the iPhone as inbox items.
- **Complications:** WidgetKit for watchOS, sharing code with plan 17.

## Tests and checks

- iPhone nearby: the watch shows the latest figures.
- iPhone out of range: the watch shows the last snapshot, with its time.
- Ticking off a bill on the watch.
- Quick add on the watch.
- Complications with amounts hidden and shown.

## Done when

- [ ] The watch app and its complications work with the iPhone nearby.
- [ ] Without the iPhone, they show the last snapshot.
