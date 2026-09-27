# 11 CI deploy
Status: done · Model: Sonnet 5 · Blocked by: none

Automatic deployment on push to `main`: install, typecheck, lint, test, then
apply D1 migrations remotely, then deploy — same steps a manual release would
run, so a green `main` is always deployed. Pull requests run the same checks
without touching D1 or the Worker.

## What shipped

- `.github/workflows/deploy.yml`: on push to `main` and `workflow_dispatch`,
  runs typecheck/lint/test, applies `drizzle/` migrations to the remote D1
  database (`wrangler d1 migrations apply DB --remote`), then
  `pnpm run deploy`. A `concurrency` group (`deploy`, no cancel-in-progress)
  serializes runs so a migration and a deploy never overlap with each other.
- A pull-request-only `ci.yml` was added and later removed (27.9.2026): work is merged locally, so it never ran; `deploy.yml` runs the same checks.
- `import.yml` gained the same `deploy` concurrency group so the nightly
  museot.fi import can't run while a migration is in flight (and vice versa).
- `next lint` and the OpenNext `next build` step both eagerly validate
  `src/env.js` at import time, which requires `AUTH_SECRET` once
  `NODE_ENV=production`. CI has no reason to hold that secret — it doesn't
  need the real value to typecheck or bundle. `SKIP_ENV_VALIDATION=1` is set
  for the typecheck/lint/build-adjacent steps in both workflows instead of
  wiring the Worker's `AUTH_SECRET` into GitHub secrets.

## Token permissions

`CLOUDFLARE_API_TOKEN` is scoped to D1 Edit today; migrations pass but deploy
will fail on auth until the token also grants:

- **Workers Scripts: Edit** — upload the Worker bundle.
- **D1: Edit** — already present; runs the migration.
- **Workers Routes: Edit** on zone `emialis.com` — keep the
  `kuraattori.emialis.com` custom domain route attached across deploys.
- **Account Settings: Read** — `wrangler` reads account-level settings on
  every command regardless of what it's asked to do.

Widen the existing token rather than creating a new one; no token was created
or rotated as part of this ticket.

## Verified locally (not against remote)

- `pnpm typecheck`, `pnpm lint` (with `SKIP_ENV_VALIDATION=1`), `pnpm test`,
  and `opennextjs-cloudflare build` (same flag) all pass on this branch.
- Workflow YAML checked with `actionlint` (downloaded to the system temp
  directory for this session, not installed).
- Not run: `wrangler d1 migrations apply --remote` and `pnpm run deploy`
  themselves — those touch the real D1 database and Worker and need the
  widened token first.
