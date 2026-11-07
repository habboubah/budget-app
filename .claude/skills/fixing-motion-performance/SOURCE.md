# Source

Third-party skill, vendored unchanged.

| | |
|---|---|
| Upstream | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) — `skills/fixing-motion-performance/` |
| Pinned commit | [`97dea9e747ea94d5671ef1468cbb8f9bd5f32542`](https://github.com/ibelick/ui-skills/commit/97dea9e747ea94d5671ef1468cbb8f9bd5f32542) (2026-11-07) |
| Fetched | 2026-11-07 |
| License | MIT (`LICENSE`, copied from the repository root at the same commit) |
| Scripts / network / installs | None. One Markdown file. |

## Files

| sha256 | file | change |
|---|---|---|
| `0a2d654902bc04263ce68c8c02967ef03f17b482e855360a5463211d99d7baa9` | `SKILL.md` | none |
| `c615621c4cc1676ccde194e7a01b6469ba477780251bd71e007fc473a49c2c2b` | `LICENSE` | none |

## In this project

CLAUDE.md wins where they differ. Notably: `motion` is the animation library
here (don't migrate), there is no `backdrop-filter` and no `filter: blur` on
scrolling content, and everything collapses under reduced motion.

## Updating

Download the files again at a newer commit, diff them against these, re-read
the diff for anything beyond design work, then update the commit and hashes
above.
