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

## Notes

- `wrangler.jsonc`'s `database_id` is a placeholder for local-only development.
  Replace it with a real one from `wrangler d1 create` before any remote
  deploy, and see `docs/design.md` for why the importer isn't a Workers cron.
- Google OAuth isn't configured (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are
  empty in `.env.example`); sign-in wiring is a later ticket.
