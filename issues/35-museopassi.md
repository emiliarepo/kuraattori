# 35 Museopassi (museum passport with postage-stamp design)
Status: done · Model: Opus 5.5 (low effort) · Blocked by: 30

A collection view of the museums the user has visited, designed as a sheet of **postage stamps** in a passport. The stamp design is the point of this ticket: get it right.

- Route `/my/passport` (tab "Museopassi" on Omat, after Käydyt). A museum is "stamped" when the user has at least one Käyty exhibition there (use `visited_at` for the stamp date).
- Summary: "38 / 249 museota" and per-region counts; sections per region (cities first, then the rest, `groupRegions()`), stamped museums first; unvisited museums shown as empty dashed outlines only in a collapsed "Vielä leimaamatta" list, not as a wall of empties.
- **Stamp design (SVG, generated per museum, no images):**
  - A postage stamp shape: perforated edge (scalloped / punched circles along all four sides, drawn as an SVG mask so it scales crisply), a thin inner frame, generous white margin inside the perforation.
  - Inside: the museum's initials or a short name in Newsreader italic, the city in small caps (Inter), and a denomination-style corner mark with the year of the first visit ("2026").
  - A deterministic colourway per museum from a small curated palette derived from the design tokens (rust, deep green, ink blue, ochre, plum): muted, printed-ink feel, AA contrast for the text on the stamp.
  - A **cancellation mark** overprinted when stamped: a circular postmark with the visit date (e.g. "27.IX.2026") and "KURAATTORI" around the ring, plus a few wavy cancellation lines, in `--fg` at partial opacity, slightly rotated (deterministic small angle per museum), so it reads as a real franked stamp.
  - Stamps sit slightly rotated (±2°, deterministic) on a subtle paper background; dark mode gets a dark album page with the same stamps (don't invert the stamps).
  - Tapping a stamp opens the museum page; the accessible name reads "Museopassi-leima: Kiasma, Helsinki, käyty 27.9.2026".
- Share: "Jaa passi" produces a PNG image of the stamp sheet (server-rendered with `next/og` / satori on Workers, at 1080×1350) with the counts; no public profile page.
- Prototype 2–3 stamp variants on `/dev/components` first, pick the best (document why in the ticket), then build.
- Tests: stamp colour/rotation determinism, counts; visual check at 390/1280 px in light and dark with 0, 1, 12 and 60 stamps.

**Design:** follow `docs/design.md`; add a "Stamp" entry describing the final stamp spec.

## Stamp prototype: three variants, "line" chosen

Prototyped on `/dev/components` with eight real museums, rendered at 1280 px on the album background:

- **Engraved:** an ink panel filling the frame, with the label, year and city reversed out in paper colour.
- **Line:** paper face with a double ink frame and an ink band for the city; the label and year are printed in ink.
- **Initial:** like engraved, plus a large faint italic initial behind a bottom-left label.

**Chosen: line.** On the two panel variants the postmark, in dark ink at partial opacity, sank into the ink panel and was barely visible at mobile size. That undoes the whole "franked stamp" idea. On line, the postmark sits on paper and reads the way a real cancellation does, and the white margin inside the perforation stays generous. The label is ink on paper, which clears AA with room to spare for all five inks. Initial also crowded its label into the postmark's corner, and on a 60-stamp sheet the watermark letters read as noise.

Found during the build:

- Initials make poor labels ("Nykytaiteen museo Kiasma" → "NK"). `stampLabel()` now prefers the proper name after a generic word ("Kiasma"), then an acronym ("HAM", "LUOMUS"), then the name wrapped onto two lines, then its first word. It was checked against all 249 local museums.
- The postmark uses a fixed near-black ink (`--stamp-postmark`, the light-mode `--fg`) rather than `--fg`. In dark mode `--fg` is cream, which would vanish on the stamp paper, and the ticket asks for stamps that don't invert.
