# Kuraattori — agent notes

Finnish-language exhibition tracker on Next.js + tRPC + Drizzle, running on Cloudflare Workers
(OpenNext) with D1, KV and R2. Product and design live in `docs/spec.md` and `docs/design.md`;
the README covers setup and scripts. Read `docs/design.md` before any UI work.

## Conventions

- **Language:** code, routes, file names and identifiers in English; every user-visible string
  in Finnish, from `src/i18n/fi.ts`. Slugs come from Finnish titles (they're data).
- **Design:** "Aikakauslehti" per `docs/design.md`: tokens only (no raw colours), the spacing
  steps and `btn` utilities it defines, existing components (`Section`, `Rail`, `ExhibitionCard`,
  `ExhibitionRow`). Rails keep the card line budget: every card in a rail has equal height and
  equal title/TimeBar positions.
- **Domain logic** stays pure in `src/domain/` with explicit `today` (Europe/Helsinki).
  Urgency breaks ties; it never outranks relevance.
- **Data:** the importer soft-tracks records (`last_seen_at`); nothing is deleted when it
  disappears from museot.fi.

## Workers gotchas

- Every page stays under **5 000 D1 rows read** (the dev logger warns). No correlated subqueries
  over whole tables; one such query once exhausted the daily D1 limit and took the site down.
- Public, non-personal lists go through the KV cache (`src/server/cache/`); per-user data never does.
- No `export const runtime = "edge"`: OpenNext runs everything in the Worker and the build fails.
- `next build` passing proves little; `opennextjs-cloudflare build` is the real gate.

## Database

- Schema changes: edit `src/server/db/schema.ts`, run `pnpm db:generate`, commit the new SQL.
  Never edit an existing migration. CI applies migrations to production before each deploy, so
  a migration must be safe on live data (nullable columns or defaults, backfill in the importer).
- Only one open branch adds a migration at a time.

## Done means

All of these pass: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`,
`SKIP_ENV_VALIDATION=1 pnpm opennextjs-cloudflare build`, `pnpm test:e2e`. UI changes are also
seen in the browser at 390 px and 1280 px, light and dark. Behaviour bugs get a Playwright assertion.

## Tickets and git

- Work items are `issues/NN-slug.md`. Line 2 is the status; finished work sets it to start with
  `Status: done`. `issues/PLAN.md` holds the run order.
- Commit as the repo-local identity; commits carry no model attribution or co-author trailers.
- Pushes to `main` deploy to production through `.github/workflows/deploy.yml`. Work on a branch;
  deploys and remote D1 changes go through CI, not a local shell.

## Local sign-in

`/sign-in` offers a dev-only credentials form in development and in the E2E server
(`E2E_TEST_AUTH`); production only offers Google.
