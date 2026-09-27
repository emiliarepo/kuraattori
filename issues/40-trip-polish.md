# 40 Matkalla polish: ending-soon first, walking legs between stops
Status: done · Model: Opus 5.5 · Blocked by: 36

Two follow-ups to ticket 36 (`/trip` and `/trip/day`).

## Ending soon first

On `/trip` and in the Museopäivä candidate lists, exhibitions that end soon come first and are highlighted.

- **Soon is relative to the trip:** the exhibition ends during the trip, or within the existing ending-soon window (14 days, `ENDING_SOON_DAYS`) counted from the trip's first day that is not in the past. For the day planner the "trip" is the planned day, extended to the trip's last day when the day sits inside a trip.
- **Explicit grouping, not a score boost.** The ordering from `trip.list` (relevance, then closing date) and `trip.day` (interested, then museum) stays as it is inside each group; `partitionEndingSoon()` in `src/domain/trip.ts` only splits it. Urgency still never outranks relevance in a score.
- **`/trip`:** when some exhibitions end soon, the list splits into two `Section`s, "Päättyy pian" and "Muut auki matkasi aikana". Ending-soon rows get the TimeBar's urgent state and a rust why-kicker: "Päättyy matkasi aikana", or "Päättyy pian matkan jälkeen, <date>" when it closes within the window after the trip.
- **Museopäivä:** within Kiinnostavat and within Lisää, ending-soon candidates come first and carry an `UrgencyLabel` with `urgencyLabelText()` counted from the planned day.

## Walking legs between stops

In the itinerary, "≈ 13 min kävellen" moved out of the stop's block into a connector leg between the two stops' divider lines: a `↓` in the numeral column, the walking time and a "Kävelyreitti" link (Apple/Google Maps, walking, from this stop to the next). The last stop has no leg.

## Tests

- Unit: `src/domain/trip.test.ts` (window edges, trip under way, stable grouping).
- E2E: `e2e/trip-polish.spec.ts` asserts the ending-soon group comes first and is highlighted on `/trip` and in the candidate list, and that the leg sits between stop blocks with none after the last stop.
