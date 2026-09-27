# 45 Quick rating after a visit
Status: done · Model: Opus 5.5 (low) · Blocked by: 44 (migration order)

When an exhibition is marked Käyty, offer 👍 / 👎 inline, next to the visit date and note. It's optional, one tap, and can be changed or cleared.

- Store it on the user's exhibition row (nullable). Show it in Käydyt and include it in the data export.
- **Recommendations:** don't change the scoring yet. Record the signal and add a documented, pure function in `src/domain/` that proposes category weight nudges from ratings (unit-tested), unused by ranking for now. The goal is data for tuning later, not a behaviour change today.
- Year in review may show "N 👍" if it fits the design; skip it if it doesn't.
- Tests: unit tests for the nudge function; E2E for rating and clearing on the detail page and in Käydyt.
