# 19 Similar exhibitions on the detail page
Status: done · Model: GPT-6 Luna · Blocked by: 12

"Samankaltaisia" section on `/exhibitions/[slug]`: up to 6 other current or upcoming exhibitions, scored deterministically: +10 per shared category, +5 same region, +3 same museum; ties by closing date. Exclude the exhibition itself, hidden ones for signed-in users, and ended ones. Render as a `Section` titled "Samankaltaisia" with a `Rail` of `ExhibitionCard`s, placed after the description. New `exhibition.similar({ slug })` procedure, one query (mind D1's 100-parameter limit). Tests for scoring and exclusions.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
