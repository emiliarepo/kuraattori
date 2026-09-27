# 49 Nightly import time budget
Status: done · Model: Opus 5.5 (low) · Blocked by: 38, 43 (migration order: after 34)

The manual import on 27.9.2026 (run 36320009784) hit the job's 30-minute `timeout-minutes`. The data phase finished (translationsUpdated 642, translationRequests 708, hoursUnparsed []). The rest of the time went to the first full R2 image backfill (ticket 38), where downloads failed with `fetch failed … SocketError: other side closed`, which means the image host was throttling us. That run also fetched every museum page (ticket 43).

- **Image archiving:** only images with no archived copy, oldest exhibitions (lowest id) first. Per run it starts at most 150 downloads and none after 10 minutes, so a backlog drains over several nights. One download every 550 ms (≤ 2 req/s), each with a 30 s timeout. 429, 503 and a dropped connection count as throttles: back off exponentially from 5 s, never sooner than `Retry-After`. The run stops archiving after 3 consecutive throttles, or when the requested wait is over 2 minutes. Failures never fail the import. The summary reports `archivedThisRun`, `remaining`, `throttled`, `failed` and `stoppedBy` (`done`, `cap`, `budget`, `throttled`).
- **Museum pages:** new `museum.pageFetchedAt` (migration `0014`, nullable, set by the importer after a successful fetch and write). A run fetches museums that were never fetched or have a changed listing, plus the stalest pages older than 7 days, capped at ⌈museums / 7⌉ per night. The first run after the migration fetches every museum once, as today; after that, refreshes spread out to about 36 a night within two weeks.
- **Summary:** `runImport` reports `museumPagesFetched`, `museumCount` and `phaseMs` (exhibitions, museum pages, total). The script prints a `budget` block with request counts (museot.fi total, museum pages, translations, geocoder, images) and durations per phase.
- **`timeout-minutes`** stays at 30. The estimates below don't justify raising it. Look again once real `budget` numbers exist.

## Estimate (≈ 250 museums, ≈ 640 exhibitions; museot.fi paced at 550 ms/request)

Fixed requests every run: the listing, 2 translated listings, 29 topic listings and ~19 region listings, ≈ 51 requests.

| Night | Before | After |
|---|---|---|
| Ordinary night (~15 changed details, a few translations, ~10 new images) | 51 + 15 + 5 + **250 museum pages** + 10 ≈ **330 requests, ~3 min** of pacing | 51 + 15 + 5 + **~36 museum pages** + 10 ≈ **120 requests, ~1 min** |
| 27.9.2026 run (708 translations, 642-image backfill) | 51 + 708 + 250 + 642 ≈ **1 650 requests, ~15 min of pacing alone**. Throttled downloads with no timeout used the rest of the 30 min | Data phase unchanged, ≈ 1 000 requests, ~9 min. Images stop at 150 or 10 min: **≤ ~20 min total**, and the backlog drains in ~5 nights |

The minutes cover request pacing only. D1 HTTP writes and resizing add to them, and the new `budget` block measures both.

## Verification

- Unit tests: selection order, cap, budget, pacing, exponential backoff with `Retry-After`, stop after consecutive throttles, stop on an over-long `Retry-After`. Downloader: 429 → throttle with `Retry-After`, socket reset → throttle, 404 → ordinary failure, timeout signal passed.
- Checked against a local HTTP server: undici's real `other side closed` error is classified as a throttle, a 429 carries `Retry-After: 7` → 7 000 ms, and a hung response is aborted by the timeout.
- `runImport` integration test with a fake adapter: new and changed museums are fetched immediately, unchanged ones only after 7 days.
- Not run against production. The first nightly run after deploy is the real check: read the `budget` and `imageArchive` blocks.
