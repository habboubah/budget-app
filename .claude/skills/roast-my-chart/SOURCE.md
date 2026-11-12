# Source

Third-party skill, vendored unchanged.

| | |
|---|---|
| Upstream | [holtzy/dataviz-skills](https://github.com/holtzy/dataviz-skills) — `roast-my-chart/` (by Yan Holtz, Data to Viz) |
| Pinned commit | [`c335c533e3ee30b002c63ef19c84455fe1aff922`](https://github.com/holtzy/dataviz-skills/commit/c335c533e3ee30b002c63ef19c84455fe1aff922) (2026-11-05) |
| Fetched | 2026-11-07 |
| License | `SKILL.md` and `README.md`: MIT (`LICENSE-MIT`, the repository's root license). `references/caveats.md`: the [Data to Viz caveat flashcards](https://github.com/holtzy/dataviz-caveat-flashcards), **CC BY-NC 4.0** — non-commercial use with credit to [Data to Viz](https://www.data-to-viz.com) (see `LICENSE.txt`). |
| Scripts / network / installs | None. Markdown only. `caveats.md` links to card images on raw.githubusercontent.com and to articles on data-to-viz.com; the skill never fetches them on its own. |
| Vetted | All 538 lines of `caveats.md` scanned: 61 caveats in 8 sections, links only to data-to-viz.com, GitHub, Datawrapper, xkcd and archive.org; no commands, installs or instructions aimed at the agent. |

## Licence note

Haushaltsbuch Einfach is free (store/listing.md: *Price: Free*) and this file is a dev-time
reference that never ships in the app, which keeps it inside CC BY-NC. If the
app ever becomes paid, ask Data to Viz before keeping `caveats.md` here.

## Files

| sha256 | file | change |
|---|---|---|
| `017279269e9e6ebdab283359a31e86a243f3a32c45d381150eecf28849dddabe` | `SKILL.md` | none |
| `94497ecf499123a3194adb784534875d9c1fc4f34979ab50bea95bfbc7947da2` | `README.md` | none |
| `746453a02d9326e67bfdba12042d041d8cc6c9b3cc3a931b10bba3dda2c1ebe6` | `LICENSE.txt` | none |
| `7ccc47780952eb963fd291710e3716dd88d7cebb291c18e9661ee2fe97d39d04` | `references/caveats.md` | none |
| `ff8b8e403944b16a68198678e6320be9c1309726b82f3be733a9225b662e760d` | `LICENSE-MIT` | copy of the repo's root `LICENSE` |

## In this project

It stands in for the "dataviz skill" that CLAUDE.md, `src/index.css` and
`components/Charts.tsx` mention but that is not in the repo. The charts are
hand-written SVG in React (`components/Charts.tsx`), not ggplot2 / Matplotlib
/ D3: render them with the app (Playwright at iPhone width, light and dark)
and review the images. Chart colours stay tokens from `src/index.css`; after
changing one, `npm run audit:contrast` must pass.

## Updating

Download the files again at a newer commit, diff them against these, re-read
the diff for anything beyond design work, then update the commit and hashes
above.
