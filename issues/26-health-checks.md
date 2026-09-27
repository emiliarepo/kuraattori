# 26 Production health checks and import sanity
Status: done · Model: GPT-6 Sol · Blocked by: 23

Today's outage (D1 read limit, 27.9.2026) was noticed by the user, not by us. Make GitHub tell us first.

- **Uptime workflow** (`.github/workflows/health.yml`): every 30 minutes and on manual dispatch, request `/`, `/exhibitions`, one exhibition page (pick a current slug from `/sitemap.xml`), `/api/auth/providers` and `/robots.txt` on `https://kuraattori.emialis.com`; fail the job if any is not 2xx/3xx or takes > 5 s. A failed scheduled run emails the repo owner by default; make the job summary list each URL, status and time.
- **D1 usage check** in the same workflow, once a day: query the D1 analytics API (GraphQL `d1AnalyticsAdaptiveGroups`, rows read today) with the existing `CLOUDFLARE_API_TOKEN` (document the extra permission if it needs "Account Analytics: Read") and fail if today's reads exceed 50 % of the free limit (2.5 M).
- **Import sanity** in `import.yml`: fail the run (after recording it in `import_runs`) when items fetched drop below 50 % of the previous successful run, or items failed exceed 5 %. The data is still written as today (soft-state), but the red run tells us museot.fi changed its markup.
- Keep secrets out of logs; no new services.
