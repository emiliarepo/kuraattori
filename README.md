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
failed step stops the run before the migration or deploy. Pull requests run
the same checks via `.github/workflows/ci.yml` without touching D1 or the
Worker. Both share a `d1-remote` concurrency group with the nightly importer
(`import.yml`) so a migration never runs alongside another migration, a
deploy, or an import.

`CLOUDFLARE_API_TOKEN` (a repo secret) needs:

- **Workers Scripts: Edit** — upload the Worker bundle.
- **D1: Edit** — apply migrations.
- **Workers Routes: Edit** on zone `emialis.com` — keep the
  `kuraattori.emialis.com` custom domain route attached.
- **Account Settings: Read** — `wrangler` reads this on every command.

`AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set directly on
the Worker (`wrangler secret put`) and are never read or written by CI; the
typecheck/lint/build steps run with `SKIP_ENV_VALIDATION=1` instead, since
they only need `src/env.js`'s schema satisfied, not the real values.

## Notes

- `wrangler.jsonc`'s `database_id` is a placeholder for local-only development.
  Replace it with a real one from `wrangler d1 create` before any remote
  deploy, and see `docs/design.md` for why the importer isn't a Workers cron.
- Google OAuth isn't configured (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are
  empty in `.env.example`); sign-in wiring is a later ticket.
