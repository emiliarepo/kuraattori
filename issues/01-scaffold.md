# 01 Scaffold: T3 app on Cloudflare Workers + D1 schema

Status: done · Model: Sonnet 5 · Blocked by: none

Create the app with create-t3-app (Next.js App Router, TypeScript, Tailwind, tRPC, Drizzle, NextAuth) in the repo root, using pnpm. Make it run on Cloudflare Workers through `@opennextjs/cloudflare` with a D1 binding (`DB`), and use `wrangler dev` / `pnpm preview` with local D1.

- Drizzle SQLite/D1 schema for every table in `docs/design.md` and the spec §8: museums, exhibitions (title/description fi/en/sv), categories, exhibition_categories, user_interests, user_regions, user_followed_museums, user_exhibitions (status enum), data_sources, import_runs, plus the Auth.js tables. Add migrations (drizzle-kit) applied to local D1.
- Vitest configured (`pnpm test`), plus a trivial passing test.
- `src/styles/tokens.css` with the light/dark tokens from design.md, wired into Tailwind as theme colours.
- `src/i18n/fi.ts` skeleton and a typed accessor.
- Measure the built Worker size (`wrangler deploy --dry-run --outdir`) and record the compressed size in this ticket. The free plan limit is 3 MB.
- Don't configure Google credentials; leave `AUTH_GOOGLE_ID/SECRET` in `.env.example`.

Done when `pnpm build`, `pnpm test` and `pnpm preview` work and a page reads from local D1.

## Result

Worker size (`wrangler deploy --dry-run --outdir`): **1061.96 KiB gzip** (5180.09
KiB raw), against the 3 MB free-plan limit. Static assets are uploaded and
served separately and don't count against that budget.

`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm preview` all
pass; the homepage renders a museum count read live from local D1 through
tRPC, and `auth()` resolves (no session, since Google isn't configured yet).
