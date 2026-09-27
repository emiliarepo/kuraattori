# Kuraattori

Finnish-language exhibition discovery and visit tracking. See `docs/spec.md` and
`docs/design.md` for product and design decisions, and `issues/` for the ticket
breakdown.

## Stack

Next.js (App Router) + tRPC + Drizzle, deployed to Cloudflare Workers via
`@opennextjs/cloudflare`, with Cloudflare D1 as the database and Auth.js
(Google, not configured yet) for sign-in.

## Local development

```sh
pnpm install
pnpm db:generate       # regenerate drizzle/ SQL from src/server/db/schema.ts
pnpm db:migrate:local  # apply drizzle/ migrations to the local D1 database
pnpm dev               # next dev, with Cloudflare bindings proxied in
```

`pnpm dev` runs the Next.js dev server directly; `pnpm preview` builds the
actual Worker bundle and serves it through `wrangler dev` for a closer-to-prod
check. Both read from the same local D1 database under `.wrangler/state`.

## Getting a database handle

- **In tRPC / server components**: `getDb()` from `~/server/db` (async — the D1
  binding only exists once a request reaches the Worker, so it can't be a
  module-level singleton). `ctx.db` in tRPC procedures is already this.
- **In a standalone Node script** (e.g. the importer): there is no Worker
  request to piggyback on, so use `getPlatformProxy()` from the `wrangler`
  package to get `{ env: { DB } }` against the same local D1 database, or the
  D1 HTTP API for a remote run.

## Other scripts

- `pnpm test` — Vitest.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` / `format:write`.
- `pnpm cf-typegen` — regenerate `cloudflare-env.d.ts` from `wrangler.jsonc`
  (runs automatically on `pnpm install` via `postinstall`).
- `pnpm build` — plain Next.js build (fast feedback while coding).
- `pnpm preview` / `pnpm deploy` — build and run/deploy the actual Worker.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: install, typecheck, lint,
test, apply `drizzle/` migrations to the remote D1 database
(`wrangler d1 migrations apply DB --remote`), then `pnpm run deploy`. Any
failed step stops the run before the migration or deploy. It shares a
`d1-remote` concurrency group with the nightly importer
(`import.yml`) so a migration never runs alongside another migration, a
deploy, or an import.

`CLOUDFLARE_API_TOKEN` (a repo secret) needs:

- **Workers Scripts: Edit** — upload the Worker bundle.
- **D1: Edit** — apply migrations.
- **Workers Routes: Edit** on zone `emialis.com` — keep the
  `kuraattori.emialis.com` custom domain route attached.
- **Account Settings: Read** — `wrangler` reads this on every command.
- **Account Analytics: Read** — the daily D1 read check queries GraphQL
  analytics.

`AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set directly on
the Worker (`wrangler secret put`) and are never read or written by CI; the
typecheck/lint/build steps run with `SKIP_ENV_VALIDATION=1` instead, since
they only need `src/env.js`'s schema satisfied, not the real values.

## Health checks

`.github/workflows/health.yml` checks the public site every 30 minutes and on
manual dispatch. It requests the home page, exhibition list, an exhibition
linked from `/sitemap.xml`, Auth.js providers, and `robots.txt`. Each request
must return HTTP 2xx or 3xx within five seconds; the workflow summary shows
each URL, status, and response time. GitHub emails the repository owner for
failed scheduled runs when Actions notifications are enabled.

At 02:15 UTC each day, the same workflow also checks account-wide D1 rows read
since 00:00 UTC. It fails above 2,500,000 rows, half the Workers Free daily
limit. Manual dispatch runs both checks. The existing `CLOUDFLARE_API_TOKEN`
repository secret needs **Account Analytics: Read** on the account for this
check. Run `node scripts/check-health.mjs` locally to test the public route
checks without credentials.

The nightly importer records fetched and failed counts in `import_run`. It
marks a run failed after writing the fetched data if its fetched count falls
below half the last successful run or failures exceed 5% of all attempted
items. The GitHub run then fails so the source change is visible without
discarding the imported data.

## Notes

- `wrangler.jsonc`'s `database_id` is a placeholder for local-only development.
  Replace it with a real one from `wrangler d1 create` before any remote
  deploy, and see `docs/design.md` for why the importer isn't a Workers cron.
- Google OAuth isn't configured (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are
  empty in `.env.example`); sign-in wiring is a later ticket.
