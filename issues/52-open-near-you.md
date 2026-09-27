# 52 Avoinna nyt lähelläsi (open now near you)

Status: done · Model: Opus 5.5 (low) · No migration

Museums open right now within walking distance, from the browser's location or a chosen city.

## Decisions

- **Page, not modal:** `/nearby`. Back navigation works, `?city=` and `?km=` make a city view shareable, and the result list is long enough on mobile that a modal would be a page anyway.
- **Entry:** a one-line banner row at the top of Koti ("Avoinna nyt lähelläsi →", serif italic, with a sans hint on desktop), sharing the row with the edition link above a `--rule-soft` line. Desktop keeps one row; at 390 px the two links stack, which costs one 44 px row.
- **When the location is asked:** only after a tap. The banner's click sets an in-memory flag that `/nearby` consumes on arrival, so the tap goes straight to locating. A direct load, reload or shared link shows "Käytä sijaintiani" and never prompts (E2E-checked by counting `getCurrentPosition` calls).
- **Privacy:** the browser rounds to 3 decimals (about 110 m north–south, 55 m east–west) and the server rounds again. The request is a tRPC mutation, so the coordinates travel in the POST body; GET queries would put them in the URL, which Workers Logs record. The timing and error-logging middleware log only the path and error message. Nothing is stored. The privacy page (version 4) has a Sijainti section and a line under Käsiteltävät tiedot.
- **Fallback:** denied, unavailable and timeout each get their own message, above a city select grouped by region (`groupRegions` order). A city's origin is the mean of its located museums.
- **Data:** `nearby.museums` reads the KV-cached museum list (`listMuseums`, now shared with `museum.list`) and the KV exhibition pool, filters to 10 km in memory and drops the user's hidden exhibitions (one indexed query when signed in). No table scans.
- **Open-now in the browser:** the server returns every museum within 10 km with its weekly hours; the browser applies open-now, the 2/5/10 km radius and "current" with its own Helsinki clock (`src/domain/nearby.ts`). Widening needs no second request, and Playwright's frozen clock drives the whole result.
- **Rules:** open when `open ≤ now < close`; a closing time at or before the opening time runs past midnight and counts on the previous day's hours. "Sulkeutuu pian" in the last 45 minutes, in rust. Walking minutes reuse the day planner's `walkingMinutes` (5 km/h straight line). Exhibitions are sorted by end date and ending-soon ones carry the rust TimeBar label; two are shown, then "+N" to the museum page. The empty state names the soonest opening within the radius ("Seuraavaksi avautuu: Kiasma, tiistai klo 10").

## Verification

- Unit: `src/domain/nearby.test.ts`: Helsinki clock around midnight and DST, closed day, unknown hours, past-midnight hours, 45-minute mark, next opening, distance and rounding, radius filtering.
- E2E: `e2e/nearby.spec.ts`: granted geolocation at Kiasma with a frozen clock (open until, distance, map link), closing soon, nothing open with next opening, no prompt on plain load, widening 2 → 5 km, denied location falling back to Helsinki.
- Seen in the browser at 390 and 1280 px, light and dark: home banner, idle, results.
- Not seen: the `+N` overflow. The E2E seed has at most one current exhibition per museum.
