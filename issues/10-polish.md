# 10 Polish from the end-to-end walk
Status: done · Model: Sonnet 5 · Blocked by: none

Found while walking the MVP flow on 27.9.2026 against the real import:

1. **Päättyy pian** shows "0 / päivää" for exhibitions ending today. It should read "Päättyy tänään" (DaysNumeral caption or replacing the numeral), per design.md.
2. **Uudet näyttelyt** lists 2010-era permanent exhibitions: every exhibition was first seen on the first import, so "first seen within 14 days" is meaningless for the initial dataset. Define "new" as opened recently: `start_date` within the last 30 days and not upcoming, newest first. Keep `firstSeenAt` for the relevance bonus only if it isn't the initial import. It should also respect active regions (ticket 07 noted `exhibition.new` has no region filter).
3. **Sinulle** rows don't show the "why recommended" reasons (e.g. "Nykytaide · Pääkaupunkiseutu") in `--signal`, which design.md requires. `recommendation.forYou` already computes reasons.
4. **Exhibition detail on desktop**: long descriptions push the meta grid, TimeBar and StatusActions far below the fold. Put meta, TimeBar and StatusActions directly under the title (sticky info column is fine) and the description after them. Also consider collapsing descriptions longer than ~600 characters behind "Näytä lisää".
5. **Profile → header region selector** doesn't update in the same view after editing regions on /profile (ticket 06 known gap).
6. **Browse filter sheet**: museum and category checkbox lists are hundreds of entries. Add a filter-within-list text input for museums.

Verify each in the browser at 390 px and 1280 px, light and dark. Add focused tests only where logic changes (item 2).
