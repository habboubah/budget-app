# Tech stack

- React 19 + TypeScript ~5.8: `strict`, `noUnusedLocals`, `noUnusedParameters`, `moduleResolution: bundler`, no emit.
- Vite 6 (`vite.config.ts`): React plugin, `@tailwindcss/vite`, `vite-plugin-pwa` (autoUpdate, offline), and a plugin that runs `scripts/copy-ocr.mjs` on every dev start and build. `__APP_VERSION__` comes from `package.json`.
- Tailwind CSS 4 with no config file: design tokens and custom utilities (`@utility`) live in `src/index.css`.
- `motion` 12 (`motion/react`), wrapped in `MotionConfig reducedMotion="user"`; `lucide-react` icons.
- Capacitor 8, iOS only (`ios/`, Swift Package Manager, UIScene lifecycle). Plugins: app, filesystem, haptics, share, status-bar, local-notifications, `@aparajita/capacitor-biometric-auth`.
- `fflate` unzips .xlsx (no spreadsheet library); `tesseract.js` 7 with `@tesseract.js-data/deu` does on-device OCR.
- Vitest 4 for unit tests (no separate config; runs through Vite). Playwright (Chromium) drives the built app in `scripts/`.
- npm only. CI (`.github/workflows/ci.yml`): Node 22, `npm ci`, Playwright Chromium, `npm run check`.
- No backend and no network calls: data lives in a file (iOS app) or `localStorage` (web), see `structure.md`.

## Commands
| Task | Command |
|---|---|
| Dev server, port 3002, reachable on the LAN (long-running) | `npm run dev` |
| Type-check (the only "lint"; there is no ESLint/Prettier) | `npm run lint` |
| Unit tests, single run | `npm test` |
| One test file | `npx vitest run src/logic.test.ts` |
| All gates: before calling a change done, in CI, before release | `npm run check` |
| Privacy check / performance budgets alone | `npm run check:privacy` / `npm run check:perf` |
| Contrast audit (after any colour change) | `npm run audit:contrast` |
| Re-record the golden year (a money rule changed on purpose) | `npx vitest run src/golden.test.ts -u` |
| Web build to `dist/` / preview it | `npm run build:web` / `npm run preview` |
| Build, sync and open Xcode (Mac only) | `npm run build:ios` |
| Refresh the native project after a plugin change (works on Windows) | `npx cap update ios` |
| UI captures before and after a screen change | `node scripts/ui-review.mjs --only month,stats` |
| App Store screenshots / icons and splash | `npm run screenshots` / `npm run assets:generate` |
| Upload to App Store Connect (only when explicitly asked) | `npm run release` (`release:dry` to preview) |

- `npm run check` runs, in order: `lint` → `test` (includes `compat.test.ts` and `golden.test.ts`) → `vite build` → `check:privacy` → `check:perf` → `audit:contrast`.
- The Playwright scripts need Chromium once per machine: `npx playwright install chromium`.
- `npm run clean` uses `rm -rf` and fails on Windows; use `Remove-Item -Recurse -Force dist`.

## Code style
No formatter is configured, so match the surrounding code:
- 2-space indent, single quotes, semicolons, trailing commas in multi-line lists. Long lines (~150 chars) are fine.
- Single-parameter arrows without parentheses (`e => …`); one-line `try { … } catch { … }` for tolerant reads.
- Named exports everywhere (`export function MonthView`); only `App` and the `translations` object are default exports. Props as `interface Props` above the component; small helper components may type props inline.
- Relative imports (`../logic`, `../ui/Button`), mostly without file extensions. The `@/` alias exists but is unused.
- String-literal unions and `as const` arrays (`HUES`, `REPEATS`, `ACCENTS`) instead of enums.
- Comments in English: `/** … */` on types, fields and exported functions, saying why (an iOS quirk, VoiceOver, a money rule), not what.
- Tailwind classes inline; conditional classes with `[…].join(' ')` or template strings. No classnames library.
- Tests: co-located `src/*.test.ts` covering pure modules only (no component tests). Use `describe` / `it` / `expect`, small local factories, amounts in cents, and build any .xlsx / CSV in memory.

## Styling rules (native iOS look)
- Every colour comes from a token in `src/index.css` (`bg-bg`, `bg-surface`, `text-fg`, `text-fg-mute`, `text-accent`, `bg-hue-bg` / `text-hue-ink` under `data-hue`, …). Never a hex literal in a component.
- Money colours mean one thing each: `text-pos` income / plus, `text-neg` negative balance or overdue, `text-warn` open. Expenses stay plain `text-fg`.
- RTL-safe layout: logical utilities only (`ms-` / `me-` / `ps-` / `pe-` / `start-` / `end-`, `text-start` / `text-end`, `rtl:rotate-180` on chevrons), never `left` / `right`. Pure amounts get `num` or `rounded-num` (LTR, tabular); text that contains words gets `tabular-nums`.
- Cards are `rounded-md bg-surface card-edge` (no border, no shadow). Emoji through the `emoji` utility or `ui/Picture`. Long German compounds get `wrap-compound`, never `truncate`.
- No `hover:` styles. `backdrop-filter` only on floating chrome, through `glass-chrome` / `glass-menu`; never on scrolling content.
- Type in rem (follows Dynamic Type); touch targets and layout margins in px (`min-h-control`, `h-tap`, `w-tap`, `px-[16px]`). Anything fixed to the bottom pads with `safe-bottom`.
- Accessibility: every `IconButton` gets a `label` naming its row (`${t.markPaid} — ${name}`); state in words, never colour alone; text 4.5:1, icons 3:1; motion collapses under reduced motion.
- Read `.claude/skills/apple-design/SKILL.md` before changing interaction or motion, and `.claude/skills/roast-my-chart/SKILL.md` before changing a chart.

## Dependencies and native
- Pin new dependencies to an exact version; vet maintenance, licence and code, and note it in the plan file. Anything touching secrets or financial data gets a small own native plugin, not a third-party one.
- Nothing that phones home: no analytics, CDNs or remote fonts. Every URL in `dist/` must be on the allowlist in `scripts/privacy-check.mjs`, with its reason.
- Keep `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` on the same version (≥ 8.5). After adding a native plugin, run `npx cap update ios` and commit `ios/App/CapApp-SPM/Package.swift`.
- Never remove the UIScene lifecycle (`SceneDelegate.swift`, `UIApplicationSceneManifest` in `Info.plist`, the hook in `AppDelegate.swift`); the app is killed at launch without it and `scripts/release.js` refuses to ship.
- Native-only features check `isNative()` (`src/platform.ts`); `localStorage['spartopf-dev-native'] = '1'` shows their settings in a dev build on the web.
