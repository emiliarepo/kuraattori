# 15 Visit date and note
Status: done · Implemented visit date and private note tracking.
Model: GPT-6 Luna · Blocked by: 12

When marking Käyty, record when and optionally a short private note.

- `user_exhibitions.visited_at` already exists; add `note` (text, ≤ 500 chars) via migration.
- Marking Käyty sets `visited_at` to today (Europe/Helsinki). The detail page and Käydyt list show "Käyty 27.9.2026" (as a `text-kicker` status line in ExhibitionRow and next to StatusActions on the detail page) and let the user edit the date (native date input, not in the future, not before the exhibition started) and the note.
- Käydyt is ordered by visit date, newest first.
- `userExhibition.updateVisit({ exhibitionId, visitedOn, note })`, protected, validated.
- Changing status away from visited clears date and note (confirm first if a note exists).
- Tests: validation bounds, ordering, clearing on status change.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
