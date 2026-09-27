# 39 Cost guardrails: usage kill switch and CPU limit
Status: todo · Model: Sonnet 5 · Blocked by: 30

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
