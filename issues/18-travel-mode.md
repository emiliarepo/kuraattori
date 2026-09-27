# 18 Travel mode ("Matkalla")
Status: todo · Model: Sonnet 5 · Blocked by: 12, 13

Plan a trip: pick a place (region or city) and a date range, see what is open during those days.

- Entry: a "Matkalla" action on home and browse; page `/trip?place=…&from=YYYY-MM-DD&to=YYYY-MM-DD` (URL state, shareable).
- An exhibition qualifies if it overlaps the range (`start ≤ to` and `end ≥ from` or no end). Sort by relevance for signed-in users (reuse ranking), then by closing date; render results as `ExhibitionRow`s; mark "Päättyy matkasi aikana" (rust `text-kicker`, the row's why-slot) when it ends inside the range, and "Avautuu <date>" when it opens during it.
- Does not change the user's saved regions.
- Finnish date range picker usable at 390 px (native date inputs are fine). Tests for the overlap rule and the two labels.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
