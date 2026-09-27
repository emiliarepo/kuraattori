# 39 Cost guardrails: usage kill switch and CPU limit
Status: done · Model: Sonnet 5 · Blocked by: 30

Cloudflare has no hard spending cap on the Workers paid plan. Bound the worst case to about one day of overuse.

**Already in place / by the user:** a WAF rate-limiting rule on the zone (60 requests / 10 s per IP, static assets and `/img/` excluded, block 10 s). Billing alerts are the user's to set in the dashboard.

## Kill switch

- **Measure the baseline first:** from the Cloudflare GraphQL Analytics API, read the last 14 days of daily usage for Worker requests and CPU time (`workersInvocationsAdaptive`), D1 rows read/written (`d1AnalyticsAdaptiveGroups`), KV reads/writes and R2 class A/B operations (check current dataset names in the docs, don't guess). Record the table in this ticket.
- **Budgets:** default each daily budget to 5× the 14-day p95 (with a sensible floor so a quiet week doesn't make the budget tiny), stored as GitHub repository variables (`BUDGET_WORKER_REQUESTS`, `BUDGET_WORKER_CPU_MS`, `BUDGET_D1_ROWS_READ`, `BUDGET_D1_ROWS_WRITTEN`, `BUDGET_KV_READS`, `BUDGET_KV_WRITES`, `BUDGET_R2_CLASS_A`, `BUDGET_R2_CLASS_B`) so they can be changed without a deploy. Document them in the README.
- **Check:** extend `.github/workflows/health.yml` (every 30 min) to query today's usage since 00:00 UTC and compare against the budgets; the job summary shows usage vs budget per metric.
- **Trip:** when any metric exceeds its budget, set a maintenance flag in KV (`maintenance` key with the reason and an expiry at the next 00:00 UTC), and fail the run so GitHub emails the owner. The Worker checks the flag first on every request (one KV read, cached in the isolate for 60 s) and, when set, serves a static Finnish maintenance page ("Kuraattori on hetken tauolla. Palaamme pian.") with HTTP 503 and `Retry-After`, without touching D1, R2 or any other binding. Static assets still serve. The flag expires on its own; add `scripts/maintenance.ts on|off` for manual control.
- Make sure the maintenance check itself can't become the cost problem (the isolate cache keeps KV reads to about one per isolate per minute) and that `/api/auth/*` and the calendar feed also return 503.
- Tests: budget comparison, flag expiry, the Worker path short-circuits before any DB access.

## CPU limit

- Set `limits.cpu_ms` in `wrangler.jsonc` to a value comfortably above the slowest real request: measure p99 CPU time per request from analytics first and set about 3× that (minimum 50 ms), and record the choice here.

**Token:** the analytics queries need "Account Analytics: Read" (already granted); writing the KV flag from the Action needs "Workers KV Storage: Edit" on `CLOUDFLARE_API_TOKEN`. Document the exact permission.

## Baseline, budgets and CPU limit (measured 2026-09-27)

No real 14-day baseline exists: the Worker's first production deploy was today at 08:40 UTC. The numbers below are the account's usage from 00:00 to 10:17 UTC on deploy day, queried with the local `wrangler login` OAuth token against `workersInvocationsAdaptive`, `d1AnalyticsAdaptiveGroups`, `kvOperationsAdaptiveGroups` and `r2OperationsAdaptiveGroups` (dataset and field names confirmed against Cloudflare's docs, not guessed). Budgets are 5× this partial day, per the formula above, with a floor where the measured number is too small or not real app traffic. **Revisit every number here once two real weeks of production data exist** — a single partial day, on the day of a known D1 incident, is a weak basis for a 5× multiplier.

| Metric | Measured (00:00–10:17 UTC) | Budget (repository variable) |
|---|---:|---:|
| Worker requests | 7,438 | 37,000 (`BUDGET_WORKER_REQUESTS`) |
| Worker CPU (median × requests, ms) | ~199,000 | 1,000,000 (`BUDGET_WORKER_CPU_MS`) |
| D1 rows read | 34,179,591 | 170,000,000 (`BUDGET_D1_ROWS_READ`) |
| D1 rows written | 47,785 | 240,000 (`BUDGET_D1_ROWS_WRITTEN`) |
| KV reads | 637 | 3,200 (`BUDGET_KV_READS`) |
| KV writes | 11 | 200 (`BUDGET_KV_WRITES`, floor) |
| R2 Class A ops | 5 | 500 (`BUDGET_R2_CLASS_A`, floor) |
| R2 Class B ops | 0 | 5,000 (`BUDGET_R2_CLASS_B`, floor) |

Worker CPU time has no daily-total field in the Analytics API, only per-request quantiles, so the measured column is an estimate (requests × `cpuTimeP50`), not a real sum; it likely undercounts, since the true mean sits above the median on a right-skewed distribution. Treat the CPU budget as the roughest of the eight.

The D1 rows-read number is the odd one out and worth flagging rather than quietly normalizing into a budget: 34 million rows in under 11 hours is the same D1 read-limit incident logged in `issues/26-health-checks.md` ("Today's outage (D1 read limit, 27.9.2026)"), not steady-state traffic. `src/app/sitemap.ts` paginates the full exhibitions table on every request with no caching, unlike the other public reads in `src/server/cache/active-pool.ts`; a patient crawler hitting `/sitemap.xml` repeatedly would produce exactly this shape of read volume, and `issues/23`'s D1 read-budget guard never runs in production (`src/server/db/read-budget.ts`, dev-only by design). Fixing that is out of this ticket's scope (no schema changes, and it isn't one of ticket 39's files), but it's a likely next fast follow: caching `/sitemap.xml` the same way the active exhibition pool is cached. The 5× budget here is still financially harmless either way (D1's included allowance is 25 billion rows read per month on the paid plan), but it means the kill switch's D1 read budget won't catch a recurrence of today's incident at its current size — only something bigger.

R2 Class A/B activity today (`ListBuckets` ×4, `PutBucket` ×1) is `wrangler` tooling noise from this session, not the app: `open-next.config.ts` has R2 caching commented out, so the Worker makes zero R2 calls. Both R2 budgets are floors, chosen small on purpose so any real R2 usage the app starts generating gets noticed immediately.

**CPU limit:** measured p99 CPU time per request is 358.1 ms (p50: 26.7 ms), both from `workersInvocationsAdaptive`'s quantiles (microseconds in the raw response, converted here). 3× p99 ≈ 1,075 ms; `wrangler.jsonc` sets `limits.cpu_ms` to `1100`.

**Repository variables to set** (values above; the orchestrator sets these, not this session): `BUDGET_WORKER_REQUESTS`, `BUDGET_WORKER_CPU_MS`, `BUDGET_D1_ROWS_READ`, `BUDGET_D1_ROWS_WRITTEN`, `BUDGET_KV_READS`, `BUDGET_KV_WRITES`, `BUDGET_R2_CLASS_A`, `BUDGET_R2_CLASS_B`.

**Not verified end to end:** the KV write from `check-usage-budgets.mjs`/`scripts/maintenance.ts` against the real Cloudflare KV REST API (`PUT .../storage/kv/namespaces/{id}/values/maintenance`) per this session's instructions not to touch production or remote KV. It's implemented per Cloudflare's documented API contract and exercised locally against `wrangler`'s local KV (via `getPlatformProxy`) in `e2e/maintenance.spec.ts`, but the real REST call itself has not been dry-run. Worth a manual `scripts/maintenance.ts on "test"` / `off` once the repository variables and the extra token scope are in place.
