# CLAUDE.md

Steering file for AI assistants working in this repository. See `PLAN.md` for
the product concept and the money rules, `README.md` for running and installing.

## What this app is
Spartopf: a client-only React + Capacitor household budget book, modelled on
Ahmad's monthly Excel sheet. One month per page, entries per category, each
entry paid or still open, recurring entries carried into the next month, and
two balances: *Jetzt auf dem Konto* and *Am Monatsende*. One bank account.
**No backend, no account — everything is `localStorage`.**

## Stack
- React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `lucide-react`, `motion`.
- Capacitor 8 wraps `dist/` into the `ios/` native project. `vite-plugin-pwa`
  makes the web build installable and offline.
- npm only.

## Architecture rules (mirrors pizza-driver-log and shopping-list)
- **No router.** `App.tsx` holds the active tab plus one state per pushed
  screen. The `pushed` array is the nav's single source of truth (back
  gesture, scroll reset) and must match the render ternary.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`, mirrored to `localStorage` (`spartopf-*` keys) via
  `useEffect`. Immutable updates only.
- **Screens** live in `src/components/XxxView.tsx`; forms shown in a bottom
  sheet are `XxxSheet.tsx`. Named exports, `Props` interface above.
- **Shared primitives** live in `src/ui/` (`Screen`, `Sheet`, `Button`,
  `IconButton`, `Field`, `Segmented`, `Toast`, `TabBar`, `haptics`…).
  Compose them instead of hand-rolling markup.
- **Pure logic** goes in `src/logic.ts` (money, months, balances, carry-over,
  statistics, storage validation) and is tested in `src/logic.test.ts`.
  Components never do balance arithmetic themselves.
- **Money is integer cents** everywhere (`Entry.amount`). Convert only at the
  edges: `parseAmount()` for input, `formatMoney()` for display.
- **Months are `YYYY-MM` strings** (`MonthKey`); use `addMonths()` /
  `monthKeyOf()` from `logic.ts`, never `Date` arithmetic in components.
- **Default categories** live in `src/data/defaults.ts` (names in every
  language, emoji, hue, default repeat, name suggestions). Add there, not in
  components.
- Data from storage or a backup goes through `normalizeState()` first. Add new
  fields as optional; bump `SCHEMA_VERSION` and migrate in `normalizeState`
  when a shape changes.
- IDs are generated with `uid()` from `logic.ts` by callers, never by the store.
- Destructive actions are **undoable** (toast with *Rückgängig*); a `Confirm`
  dialog only where undo is impossible (delete all data, import a backup) or
  where a lot goes at once (a category with entries).

## i18n
- `src/translations.ts`: one flat object per language (`de`, `en`). Default
  `de`; first run follows the device language. Add every key to every block.
- Access via `const t = translations[language]`. Never inline
  `language === 'de' ? …`.
- Built-in categories carry a name per language (`names`); user-created ones
  carry only the name typed, and `displayName()` falls back sensibly.
- Money and dates are formatted with `t.locale` (`de-DE` → `1.050,00 €`).
- Long German compounds get `wrap-compound`, never `truncate`.

## Styling
- Tailwind utilities inline. **All colours come from tokens in
  `src/index.css`** — never a literal hex in a component.
- Surfaces `bg-bg` / `bg-surface` / `bg-surface-2`, text `text-fg` /
  `text-fg-mute` / `text-fg-faint`, action `text-accent` / `bg-accent-fill`
  + `text-accent-fill-ink`. The balance card is `bg-hero` with
  `text-hero-ink` / `text-hero-mute`.
- Money colours mean one thing each: `text-pos` income / plus, `text-neg`
  a negative balance or overdue, `text-warn` (+ `bg-warn-dim`) *open*. Expenses
  themselves are plain `text-fg` — a bill is not an error.
- A category's colour: `data-hue={category.hue}` on an element, then paint
  with `bg-hue-bg` / `text-hue-ink`. Its hue is identity (the emoji tile, the
  bar in the statistics), cards stay `bg-surface` + `card-edge`.
- Amounts use the `num` utility (tabular, LTR); big amounts the `display` face.
- Type scale in rem (follows Dynamic Type); touch targets in px
  (`min-h-control`, `h-tap`, `w-tap`).
- Emoji always through the `emoji` utility (or `ui/Picture`).
- No `hover:` styles (sticky on touch), no `backdrop-filter`, no
  `filter: blur` on scrolling content.
- Anything fixed to the bottom pads with `safe-bottom`; the tab bar is fixed,
  so tab screens use `<Screen tabbed>`.

## Native iOS
- The app uses the **UIScene lifecycle** (`ios/App/App/SceneDelegate.swift` +
  `UIApplicationSceneManifest` in `Info.plist` + the scene hook in
  `AppDelegate.swift`), copied from shopping-list. Built with the iOS 27 SDK,
  an app without it is killed at launch. Never remove it; `scripts/release.js`
  refuses to ship without it.
- Keep `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` on the same
  version, ≥ 8.5.

## Accessibility
- Text 4.5:1, icons 3:1. `text-fg-faint` only for placeholders.
- Every icon button has a label naming its row: `${t.markPaid} — ${name}`.
- The paid toggle is a real checkbox for VoiceOver (`role="checkbox"`,
  `aria-checked`), never colour alone: open entries also say *offen*.
- Pinch-zoom stays enabled. Motion respects reduced motion (`MotionConfig`).

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:3002 |
| Type-check | `npm run lint` |
| Unit tests | `npm test` |
| Web build | `npm run build:web` |
| Build + open Xcode | `npm run build:ios` |
| Regenerate icons/splash | `npm run assets:generate` |
| App Store screenshots (DE + EN, 1290×2796) | `npm run screenshots` |
| Upload to App Store Connect / TestFlight | `npm run release` (first time: `npm run release:first`; preview: `npm run release:dry`) |

## Releasing (only when explicitly asked)
Same pipeline as pizza-driver-log and shopping-list: `scripts/release.js`
gates on lint + tests, bumps `package.json` and the Xcode project's
`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` together, builds,
`cap sync ios`, archives and uploads via `ios/App/ExportOptions.plist`, then
commits and tags. Credentials live in the gitignored `.env.release` — never
print or commit them. Submitting for review is manual. Full checklist:
`APP_STORE_RELEASE.md`; skill: `.claude/skills/app-store-release`.

## Before calling a change done
1. `npm run lint` and `npm test`.
2. `npm run dev` and exercise the change at iPhone width (375–430px) and on desktop.
3. If the data shape changed: old `localStorage` payloads still load.

## Commit style
Short, imperative, feature-focused summaries, no conventional-commit prefixes
(same as pizza-driver-log and shopping-list).
