# 21 Year in review ("Vuotesi museoissa")
Status: done · Model: Sonnet 5 · Blocked by: 15, 20

A personal, non-indexed page (moved to `/profile/year/[yyyy]`, a new "Vuosikatsaus" profile tab, per direction during implementation) summarising visits by `visited_at`: number of exhibitions and museums, cities, top categories, first and latest visit, busiest month, Museum Card savings (from ticket 20). Editorial layout in the Aikakauslehti style (masthead-like title "Vuotesi museoissa 2026", large serif numerals, `Section`s with rules), no charts library; one simple typographic bar or small multiples at most. Linked from Käydyt when the year has ≥ 1 visit. Empty and single-visit states read well. Tests for the aggregation.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
