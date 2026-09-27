# 13 Interest weights
Status: todo · Model: Sonnet 5 · Blocked by: 12

Three-level interests instead of on/off, stored in the existing `user_interests.weight` (no migration needed):

| Level | UI label | weight |
|---|---|---|
| none | (unselected) | no row |
| Kiinnostaa | Kiinnostaa | 1 |
| Erityisesti | Erityisesti | 2 |
| Ei kiinnosta | Ei kiinnosta | -1 |

- **Scoring** (`src/domain`): category points scale with weight (first match 40 × weight, extra matches 15 × weight, cap unchanged per weight-1 equivalent). An exhibition whose categories include any `-1` interest is excluded from Sinulle unless it also matches a weight-2 interest; it's never boosted by urgency. Reasons mark strong matches (e.g. "Nykytaide ★").
- **Profile and onboarding**: category chip cycles off → Kiinnostaa → Erityisesti → Ei kiinnosta → off. Each state is visually distinct and announced (`aria-pressed` is not enough for 4 states; use a labelled button whose name includes the state, or a radio group per category). Works on 390 px.
- `profile.updateInterests` accepts `{ categoryId, weight: -1 | 1 | 2 }[]`, validated.
- Tests: weight scaling, "Ei kiinnosta" exclusion and its weight-2 override, urgency still can't lift an excluded or zero-match exhibition.
