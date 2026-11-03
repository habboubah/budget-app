# Device frames

**There are no frame images here on purpose.** The bezel, corner radius, Dynamic
Island and punch-hole are drawn in CSS in `templates/slide.css`.

## Why

- **Licensing.** Apple's and Google's official device art is licensed for use with
  their own platforms and is not redistributable inside a third-party tool. Most
  "free iPhone mockup PSD" downloads are unlicensed reposts of exactly that art, so
  vendoring one would put an unclear licence into this repo.
- **Resolution independence.** A CSS frame is exact at 1080 px and at 2868 px. A PNG
  frame has one native size and resamples at every other one.
- **Determinism.** No decode, no resample, no colour-profile surprises.

## Trade-off

A CSS frame is flat: no glass reflection, no photographic shadow. If you want that
look, drop a PNG in this folder and swap `.device` in `templates/slide.css` for an
absolutely positioned `<img>` with the screen box sized to the frame's screen
aperture. Record the file's licence in this README when you do — that is the whole
point of this note.

## Geometry

Frame proportions live in `config/theme.json` under `device`. The screen box takes
its aspect ratio from the raw capture itself (`--screen-aspect`), so app pixels are
placed at their own ratio and are never stretched to fit a frame.
