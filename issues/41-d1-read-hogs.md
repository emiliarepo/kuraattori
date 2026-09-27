# 41 D1 read hogs: sitemap, list index, trip, meta caches
Status: done · Model: Opus 5.5 · Blocked by: 39

Cut D1 rows read per request for the hot spots an audit found: the sitemap, `exhibition.list` ordering, deep browse pages, `trip.list`/`trip.day`, `meta.hasIneligibleExhibitions`, the correlated visibility subqueries, and the `import_run` count.

## Changes

- **Index** (`drizzle/0008`): `exhibition_kind_end_idx (kind, coalesce(endDate,'9999-12-31'), id)` and `exhibition_kind_start_idx (kind, startDate)`. Two `CREATE INDEX` statements, safe on live data; applied to a populated copy without issue. drizzle-kit 0.30 mangles expression indexes in the emitted SQL (the snapshot is right), so the SQL was fixed by hand before commit; `pnpm db:generate` reports no diff.
  - The expression alone is never chosen: without ANALYZE stats the planner prefers the `startDate` range. `(kind, …)` without `id` can't satisfy `ORDER BY …, id`. `(kind, startDate)` is needed as well, or `exhibition.new` switches to `kind=?` and scans everything.
  - List filters now use the same expression (`src/server/db/expressions.ts`): "current" is `coalesce(...) >= today`, not `endDate is null or ...`. All lower bounds on the end date (today, the cursor) fold into one `>=` so the index seeks straight to the cursor. With the old `or` form, page N read about N×limit rows.
  - `exhibition-plan.test.ts` pins the plans (index used, no temp B-tree, no correlated subquery); it fails on the old router.
- **Visibility**: `whereVisible` and `new`'s hidden/visited filter use uncorrelated `not in` subqueries, which SQLite evaluates once per statement. In-memory filtering like `similar` wouldn't work for a paginated `limit`, and binding the ids hits D1's 100-parameter limit.
- **withDetails** reads `(exhibitionId, categoryId)` pairs from the covering index and maps names via the KV-cached category list, or takes category ids straight from the pool.
- **Sitemap**: `meta.sitemapEntries`, one `slug, updatedAt` query each for exhibitions and museums, KV-cached for 6 h. One URL per group (the lowest id, which the detail page names as canonical). It lists exhibitions that are still running or ended within the last 365 days: the importer never deletes, so an unbounded sitemap would eventually pass 5 000 rows on every cold load. Ended pages stay reachable.
- **Trip**: `trip.list` and `trip.day` filter `getActiveExhibitionPool` in memory, with hidden exhibitions from `loadHiddenMatcher` (shared with `similar`). Exhibitions that ended before today are left out even when a range starts in the past.
- **meta.hasIneligibleExhibitions**: KV, 6 h.
- **recommendation.forYou**: `limit 1 offset 1` on succeeded import runs instead of `count(*)`; no index needed.
- **Deep browse**: MAX_PAGE stays at 20, since page=20 is under budget now.

## Measurements

Synthetic local D1: 5 250 exhibitions (1 958 active, 250 upcoming), 300 museums, 25 categories, ~8.6k category links, 400 import runs, one user with 135 statuses. No ANALYZE, like D1. Each procedure's drizzle statements were captured and re-run through the D1 binding for `meta.rows_read`, with no KV (so cold). The dev read-budget logger undercounts joined selects, because it logs `raw()` row counts, so its list-page numbers are lower bounds. It was used for the sitemap and trip pages (cold then warm) and in the E2E assertion.

| Procedure | Before | After |
|---|---:|---:|
| sitemap (old list loop → `meta.sitemapEntries`) | 1 105 074 | 3 319 cold, 0 warm |
| list current, page 1 | 8 537 | 172 |
| list current, 20 chained pages (`?page=20`) | 163 068 | 3 459 |
| list search | 6 928 | 1 343 |
| list category | 5 535 | 589 |
| list ending 14 d | 5 193 | 172 |
| list upcoming | 770 | 821 |
| list region | 530 | 852 |
| list current, signed in | 161 946 | 260 |
| new, signed in | 4 654 | 304 |
| trip.list all places | 16 560 | ~2 warm (11 014 cold pool) |
| trip.list region | 861 | ~2 warm |
| trip.day | 157 | ~2 warm |
| hasIneligibleExhibitions | 5 (worst case full scan) | 0 warm |
| forYou `import_run` statement | 400 | 2 |

"After" list numbers include 25 rows for the category list, which KV serves in production. Region and upcoming pages got slightly worse: the region filter sits on `museum`, so the ordered scan reads until it finds `limit` matches. That is bounded by the active set, not the table.

## Follow-ups

- The active pool's cold load reads ~11k rows (1 958 rows with museums, plus 3 381 category pairs), once per hour per day key. That predates this ticket. A joined category query didn't beat the batches. If it matters, the importer could write the pool to KV.
- E2E: with `read-budget.spec.ts`'s deep-browse test running in parallel, `trip-polish` (day planner) and once `region-selector` failed intermittently: React #418 hydration mismatch on first load, about 1 run in 3 or 4. The suite without that test passed 4/4, and the failing tests pass alone. The cause wasn't found; it looks like a load-dependent hydration race that more parallel load exposes, not a data difference.
