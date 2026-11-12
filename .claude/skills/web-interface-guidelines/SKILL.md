---
name: web-interface-guidelines
description: Review UI code against Vercel's Web Interface Guidelines (accessibility, focus, forms, touch, safe areas, animation, typography, i18n), pinned locally and adjusted to Haushaltsbuch Einfach's native-iOS rules. Use when asked to review UI code, check accessibility or touch behaviour, audit a component or screen, or before calling a UI change done.
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines (pinned, Haushaltsbuch Einfach edition)

The rules are in [reference/command.md](reference/command.md): Vercel's
guidelines, copied unchanged at a pinned commit (see SOURCE.md). Never fetch
them from the network; this copy is the one to use.

## How to review

1. Read `reference/command.md` in full.
2. Read the files named in the argument (or ask which files; for a whole
   screen, include its `src/ui/` primitives).
3. Check every rule, with the overrides below applied first.
4. Report in the `file:line` format `command.md` describes, grouped by file,
   terse. `✓ pass` for a clean file.

Precedence: **CLAUDE.md, then the overrides below, then `command.md`.**

## Overrides for this app

Haushaltsbuch Einfach is a client-only React app inside an iOS web view (Capacitor), with
no router, no server and native-iOS styling rules. These rules from
`command.md` change or don't apply:

| Rule in command.md | Here |
|---|---|
| Buttons/links need a `hover:` state | **No `hover:` styles** — they stick after a tap on touch (CLAUDE.md). Feedback comes from `active:` states, haptics and motion. Flag any `hover:` you find. |
| Title Case for headings/buttons | **Sentence case** in every language (iOS convention; German capitalises nouns by grammar anyway). |
| URL reflects state / deep-link all stateful UI / `<a>` for navigation | **Doesn't apply.** No router by design: `App.tsx` holds the tab and the `pushed` stack. Tabs and rows are `<button>`s. |
| Hydration safety | Doesn't apply (no server rendering). |
| `autoFocus` sparingly, avoid on mobile | **One deliberate exception:** the entry sheet focuses the name field first (CLAUDE.md, "Entry sheet order"). Flag any other autofocus. |
| Preconnect for CDN domains, preload critical fonts | Doesn't apply: the bundle may load nothing from a third party (CI fails the build if it does). |
| Detect language via `Accept-Language` / `navigator.languages` | First run follows the device language; later it's the user's choice in Settings. Fine as is. |
| Curly quotes `“ ”` | Per language: German „…“, English “…”, Arabic «…». |
| `&` over "and" where space-constrained | English only; never in German or Arabic copy. |
| Large lists (> 50 items): virtualize | A month page stays well under that. Flag only lists that can grow without bound (e.g. search across all months). |

Everything else applies as written — especially focus states, form inputs
(`inputmode`, labels, `autocomplete="off"` on non-auth fields),
`overscroll-behavior: contain` in sheets, `touch-action: manipulation`,
safe-area insets, `prefers-reduced-motion`, `transform`/`opacity`-only
animation, `Intl.*` for numbers and dates, and gesture-only actions needing
a tap and keyboard alternative.

Also check, from CLAUDE.md: logical properties only (`ms-`/`me-`/`start-`/
`end-`, never `left`/`right`), `num` / `rounded-num` only on pure amounts,
colours only from tokens, touch targets in px (`h-tap`, `min-h-control`).
