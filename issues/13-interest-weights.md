# 13 Interest weights

Status: done · Model: Sonnet 5 · Blocked by: 12

Three-level interests instead of on/off, stored in the existing `user_interests.weight` (no migration needed):

| Level        | UI label     | weight |
| ------------ | ------------ | ------ |
| none         | (unselected) | no row |
| Kiinnostaa   | Kiinnostaa   | 1      |
| Erityisesti  | Erityisesti  | 2      |
| Ei kiinnosta | Ei kiinnosta | -1     |

- **Scoring** (`src/domain`): category points scale with weight (first match 40 × weight, extra matches 15 × weight, cap unchanged per weight-1 equivalent). An exhibition whose categories include any `-1` interest is excluded from Sinulle unless it also matches a weight-2 interest; it's never boosted by urgency. Reasons mark strong matches (e.g. "Nykytaide ★").
- **Profile and onboarding**: each category is a row (serif name) with a compact segmented control in the StatusActions style: `–` / Kiinnostaa / Erityisesti / Ei kiinnosta. Implement as a radio group per category (`role=radiogroup`, labelled by the category name) so screen readers announce the state; the selected option uses `--signal`. At 390 px the four options may shorten to icons plus visually hidden labels only if text doesn't fit.
- `profile.updateInterests` accepts `{ categoryId, weight: -1 | 1 | 2 }[]`, validated.
- Tests: weight scaling, "Ei kiinnosta" exclusion and its weight-2 override, urgency still can't lift an excluded or zero-match exhibition.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
