# 48 Day planner speed

Status: blocked · slowness not reproduced; needs a signed-in production timing or a HAR from the report

"Järjestä reitti" on `/trip/day` was reported as really slow with 5–6 stops. Measure first,
then fix the dominant cost.

## What the request does

No request-time geocoding, routing or per-pair lookups exist. Coordinates come from the
importer (`src/server/import/geocode.ts`), and legs are haversine × 5 km/h
(`src/domain/day-plan.ts`). One click on "Järjestä reitti" is one client-side `router.push`
(`PendingGetForm`), which fetches one RSC payload. It is not a full-page GET.

Server work per render: `auth()`, `museum.list` (KV), `trip.day` (KV pool + hidden and
interested reads, per user), `trip.saved` in the layout (per user), `orderStops`,
`scheduleVisits`.

## Measurements (27.9.2026)

Solver alone (`orderStops`, tsx, random Helsinki points, mean of 20 000 runs):

| stops | time   |
| ----- | ------ |
| 2     | 0.3 µs |
| 4     | 5.4 µs |
| 6     | 45 µs  |

Production, anonymous, read-only GETs of `/trip/day?city=Helsinki&date=2026-09-29&ids=…`
(5 samples each, from Helsinki):

| stops | HTML TTFB   | RSC TTFB (`RSC: 1`) |
| ----- | ----------- | ------------------- |
| 2     | 0.21–0.40 s | 0.11–0.18 s         |
| 4     | 0.23–0.32 s | 0.13–0.14 s         |
| 6     | 0.18–0.25 s | 0.11–0.15 s         |

Production, anonymous, Chromium, from the click until `#itinerary` is visible: 318 ms (2
stops), 313 ms (4), 309 ms (6). The only other requests are the footer's `/terms` and `/privacy`
RSC prefetches (40–80 ms, not blocking). One cold outlier took 1.48 s TTFB on `/trip/day`
without a plan. That is a cold isolate or a daily KV miss for `active-pool:<day>`, and it
doesn't depend on the stop count.

Local, signed in (dev credentials), Worker build via `opennextjs-cloudflare` + wrangler, with
temporary timing logs:

| part                                      | time       |
| ----------------------------------------- | ---------- |
| i18n + auth                               | 2–3 ms     |
| museum.list (KV)                          | 1–2 ms     |
| trip.day: pool KV get (36 kB, 16 entries) | 1–2 ms     |
| trip.day: hidden + interested reads       | 1–3 ms     |
| orderStops + scheduleVisits               | < 1 ms     |
| page total before render                  | 7 ms       |
| click until itinerary visible             | 107–108 ms |

The local seed has only 3 Helsinki candidates, so locally n ≤ 3.

## Conclusion

The cost doesn't scale with the number of stops, and none of the parts above dominates. The
ordering is microseconds, and the whole request is one RSC round trip at production latency.
Nothing is left to fix on the evidence. Changing the solver, adding KV caches or parallelising
lookups would optimise code that isn't slow.

Not measured: a signed-in production request. Production sign-in is Google-only. The
signed-in path adds per-user D1 reads (session, locale, hidden, interested, saved trips), and
some of them run one after another. That path, or a cold isolate, is the remaining suspect.
To continue, capture one slow click in DevTools (HAR, or the `/trip/day?...&_rsc=` request's
timing) while signed in.

## Follow-up (orchestrator, 27.9.2026)

Likely cause of the reported slowness: the zone WAF rate limit (60 requests / 10 s per IP, 10 s block) combined with Next.js viewport prefetching of every list link. A blocked `_rsc` request looks like a very slow click. Prefetching now happens on intent only (commit "Prefetch list links on intent"), and the owner is raising the rule to 200 / 10 s. Reopen with a signed-in timing capture if it is still slow after both.
