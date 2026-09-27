# 02 Museot.fi importer

Status: done · Model: Sonnet 5 · Blocked by: 01

Implement the Import section of `docs/design.md`: `ExhibitionSourceAdapter`, `MuseotFiAdapter` (HTML parsing with a light parser such as `node-html-parser`, Zod validation), normalization, and upserts with change detection via `source_payload_hash`, last_seen tracking and `import_runs` stats. Also region mapping (`src/domain/regions.ts`) and the `pnpm import:museot` script against local D1. Add a GitHub Actions workflow file (`.github/workflows/import.yml`) that uses the D1 HTTP API, with secrets named `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `D1_DATABASE_ID`. The remote isn't set up yet, so don't run it.

Tests from `fixtures/museot/`: listing parse (count, dates incl. open-ended "4.11.2021 –", HTML entities), detail parse (themes, Museum Card, museo_id), topic membership, and one malformed record not failing the run. Run a real import into local D1 once and report the counts.
