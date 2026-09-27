# Kuraattori

Kuraattori is a Finnish-language web app for finding museum exhibitions in Finland and keeping track of the ones you want to see. It shows what is on, what closes soon and what matches your interests, and it remembers where you have been.

Live at **https://kuraattori.emialis.com**.

## Features

- **Home:** a daily lead pick, then rails for exhibitions closing soon, recommendations ("Sinulle"), new openings, upcoming ones and followed museums.
- **Browse:** filters by region, city, museum, category and dates, with results and paging kept in the URL.
- **Personal state:** mark exhibitions *Kiinnostaa*, *Käyty* or *Piilota*, add a visit date and a private note, and sort the Omat lists.
- **Explainable recommendations:** a deterministic score from weighted interests (Kiinnostaa, Erityisesti, Ei kiinnosta), preferred regions and followed museums. Closing dates only break ties; they never push an unrelated exhibition to the top. Every recommendation shows its reasons.
- **Matkalla:** what is open in a given place over a date range, a museum day planner that orders the chosen exhibitions into a walking route (map link and `.ics`), and saved trips.
- **Museum pages:** addresses with a map link (Apple Maps on Apple devices, Google Maps elsewhere) and a follow button.
- **Museokortti savings and year in review:** admission prices you saved with the Museum Card, and a yearly summary of your visits.
- **Calendar feed:** a private `.ics` subscription with the closing dates of the exhibitions you are interested in.
- **Installable (PWA):** works offline for your saved list.
- **Accounts:** Google sign-in, data export as JSON and account deletion.

## Stack

- [Next.js](https://nextjs.org) App Router, TypeScript, Tailwind CSS, [tRPC](https://trpc.io), [Drizzle ORM](https://orm.drizzle.team) and [Auth.js](https://authjs.dev), started from [create-t3-app](https://create.t3.gg).
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with **D1** for the database and **KV** for caching public data.
- GitHub Actions for deploys, the nightly import and health checks.
- Vitest for unit and integration tests, Playwright and axe for end-to-end and accessibility tests.

## How it fits together

```
museot.fi ──(nightly GitHub Action: scripts/import-museot.ts)──▶ D1
                                                                 │
browser ◀── Next.js on a Cloudflare Worker (tRPC, Auth.js) ◀─────┤
                                                                 │
                                    KV cache for public lists ◀──┘
```

- **Import:** a GitHub Action runs every night at 01:00 UTC and writes to D1 through the HTTP API. It isn't a Workers cron because parsing the listing needs more CPU time than a cron invocation gets. The importer reads museot.fi's server-rendered exhibition calendar at about 2 requests a second with an identifying User-Agent. It only fetches detail pages for new or changed exhibitions. Records are matched by source ID and never deleted when they go missing, and every run is logged in `import_run`.
- **Images:** after each import, the importer downloads every exhibition image it hasn't archived yet (same rate limit), resizes it to 1200 px WebP with `sharp`, and stores it in the R2 bucket `kuraattori-images` under `exhibitions/<id>/<sha1 of source URL>.webp`. The Worker serves those copies from `/img/<key>`. Current and upcoming exhibitions show the museot.fi image and fall back to the copy; ended exhibitions use the copy directly, since museot.fi drops their images. To remove an image on request, run `pnpm exec tsx scripts/remove-image.ts <exhibition id>` with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `D1_DATABASE_ID` set; the importer won't archive it again.
- **Cache:** regions, museums, categories and the current exhibition pool are cached in KV for an hour. Personal data is never cached.
- **Design:** documented in [`docs/design.md`](docs/design.md). The original product spec is in [`docs/spec.md`](docs/spec.md).

## Project layout

```
src/app/            routes (Finnish UI, English paths) and components
src/domain/         pure logic: dates, urgency, relevance, ranking, savings, …
src/server/api/     tRPC routers
src/server/import/  museot.fi adapter, parsers, upserts
src/server/db/      Drizzle schema
src/i18n/fi.ts      every user-visible string
drizzle/            SQL migrations
e2e/                Playwright suite
fixtures/museot/    museot.fi HTML snapshots used by parser tests and the E2E seed
scripts/            importer CLI, E2E seed and health checks
issues/             the ticket files the app was built from
```

## Local development

Requirements: Node 22+, [pnpm](https://pnpm.io) and a free Cloudflare account. The account is only needed for deploying; local development runs on Wrangler's local D1 and KV.

```sh
pnpm install
cp .env.example .env               # set AUTH_SECRET: `openssl rand -base64 32`
cp .dev.vars.example .dev.vars     # local vars for `pnpm preview` (wrangler)
pnpm db:migrate:local              # create the local D1 database
pnpm import:museot                 # fill it from museot.fi (about 6 minutes, polite rate limit)
pnpm dev                           # http://localhost:3000
```

In development, `/sign-in` offers a "Kirjaudu kehityskäyttäjänä" form, so you don't need Google credentials. It only exists when `NODE_ENV=development`, or when the test server sets `E2E_TEST_AUTH`. To sign in with Google locally, create an OAuth client with `http://localhost:3000/api/auth/callback/google` as a redirect URI and put its ID and secret in `.env`.

`pnpm dev` runs the Next.js dev server with the Cloudflare bindings proxied in. `pnpm preview` builds the real Worker bundle and serves it through `wrangler dev`, which catches code that works in Node but not on Workers.

### Useful scripts

| Command | What it does |
|---|---|
| `pnpm test` | Vitest unit and integration tests (routers run against the real migrations) |
| `pnpm test:e2e` | builds the Worker, seeds a local D1 from `fixtures/` without network access, runs Playwright; run `pnpm exec playwright install chromium` once first |
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | static checks |
| `pnpm db:generate` | generate a migration from `src/server/db/schema.ts` |
| `pnpm cf-typegen` | regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` (runs on install) |
| `pnpm preview` / `pnpm deploy` | build and run, or deploy, the Worker |

In development, D1 statements are logged with their row counts, with a warning when a request reads more than 5,000 rows. Keep pages under that.

## Deployment

A push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): typecheck, lint, unit tests, the end-to-end suite, D1 migrations against production, then `pnpm run deploy`. Any failure stops the run before the database or the Worker is touched. Deploys, migrations and the importer share a concurrency group, so they never overlap.

To run your own copy:

1. Create a D1 database (`wrangler d1 create kuraattori`), a KV namespace (`wrangler kv namespace create CACHE`) and an R2 bucket (`wrangler r2 bucket create kuraattori-images`). Put their IDs in `wrangler.jsonc`, and change the custom domain route to yours.
2. Set the Worker secrets: `wrangler secret put AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Use a Google OAuth web client with `https://<your-domain>/api/auth/callback/google` as the redirect URI.
3. Set `NEXT_PUBLIC_SITE_URL` in `.env.production`.
4. Add the repository secrets `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID` and `CLOUDFLARE_API_TOKEN`. The token needs Workers Scripts: Edit, D1: Edit, Workers Routes: Edit on your zone, Account Settings: Read, Account Analytics: Read (for the usage check) Workers KV Storage: Edit (for the cost guardrail's kill switch, below) and Workers R2 Storage: Edit (the importer uploads archived images with it).
5. Add the repository variables listed under [Cost guardrails](#cost-guardrails) below, so the kill switch has budgets to compare against.

## Monitoring

[`.github/workflows/health.yml`](.github/workflows/health.yml) requests the main public routes every 30 minutes and fails if any of them is slow or returns an error. The import fails loudly when museot.fi suddenly returns far fewer exhibitions than the previous run, because that usually means the markup changed. Failed scheduled runs notify the repository owner through GitHub.

Server errors are logged with context (route, tRPC procedure, D1 error code) to Workers Logs. Users see a Finnish error page, and one failing section no longer takes down the whole page.

### Cost guardrails

Cloudflare has no hard spending cap on the Workers paid plan, so `health.yml` also bounds the worst case: every 30 minutes, [`scripts/check-usage-budgets.mjs`](scripts/check-usage-budgets.mjs) reads today's usage (since 00:00 UTC) from the Cloudflare GraphQL Analytics API and compares it against a daily budget per metric, each a repository variable so it can be changed without a deploy:

| Repository variable | Metric |
|---|---|
| `BUDGET_WORKER_REQUESTS` | Worker requests |
| `BUDGET_WORKER_CPU_MS` | Worker CPU time (ms; requests × median CPU time per request — the Analytics API has no daily-total field) |
| `BUDGET_D1_ROWS_READ` | D1 rows read |
| `BUDGET_D1_ROWS_WRITTEN` | D1 rows written |
| `BUDGET_KV_READS` | KV read operations |
| `BUDGET_KV_WRITES` | KV write operations |
| `BUDGET_R2_CLASS_A` | R2 Class A (write-like) operations |
| `BUDGET_R2_CLASS_B` | R2 Class B (read-like) operations |

The job summary shows usage vs. budget for every metric on every run. If any metric is over budget, the script writes a `maintenance` key to the `CACHE` KV namespace (reason plus an expiry at the next 00:00 UTC) and fails the run, which makes GitHub email the repository owner. [`src/middleware.ts`](src/middleware.ts) checks that key on every request — one KV read, cached in the isolate for 60 seconds so the check itself can't become the cost problem it's guarding against — and while it's set, every route (including `/api/auth/*` and the calendar feed) returns the Finnish maintenance page with HTTP 503 and `Retry-After`, without touching D1, R2 or any other binding. Static assets are served by Cloudflare directly and are unaffected. The flag expires on its own at the recorded time; for manual control (e.g. planned maintenance), run `pnpm exec tsx scripts/maintenance.ts on "<reason>"` or `... off` with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` set.

`wrangler.jsonc`'s `limits.cpu_ms` caps CPU time per request well above any real request, so one runaway invocation can't itself become a cost incident; see [issues/39-cost-guardrails.md](issues/39-cost-guardrails.md) for the baseline measurements behind both the budgets and this limit, and how they were derived.

## Data and privacy

Exhibition data comes from [museot.fi](https://www.museot.fi) and belongs to them and the museums. Kuraattori links back to the source for every exhibition. What the app stores about users, and why, is described on the [privacy page](https://kuraattori.emialis.com/privacy). The short version: your Google name and email, your preferences and statuses. There is no analytics or advertising.

## License

Code: [MIT](LICENSE). The terms of use text in `src/app/terms` is adapted from Automattic's [Legalmattic](https://github.com/Automattic/legalmattic) under CC BY-SA 4.0. Exhibition data belongs to museot.fi and the museums.
