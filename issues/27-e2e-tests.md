# 27 End-to-end tests in the deploy pipeline

Status: done · Model: Sonnet 5 · Blocked by: 23

Two production breakages today (signed-in home crash, D1 limit) would have been caught by a browser test of the real flow. Add a small, fast Playwright suite and run it in `deploy.yml` before the deploy step.

- Run against the real Worker locally in CI: `opennextjs-cloudflare build`, then `wrangler dev`/`preview` with a local D1 seeded from `fixtures/museot/` through the real importer code (no network), and the dev credentials provider enabled for the test run only (never in the deployed build).
- Flows (keep it to these, each < 30 s): anonymous home renders all rails; browse with a category filter updates results without reload; exhibition page shows TimeBar and Samankaltaisia; dev sign-in → set an interest and a region on /profile → home shows Sinulle with reasons; heart an exhibition from a rail → it appears in /my/interested → mark Käyty on the detail page → it moves to /my/visited; back navigation returns to the same scroll position on browse.
- Per page, assert no console errors and a D1 rows-read total under the ticket 23 budget (read it from the dev guard ticket 23 adds).
- Run `@axe-core/playwright` on home, browse, detail and /profile at 390 px, light and dark; fail on serious/critical violations.
- Artifacts: traces and screenshots on failure. Total CI time for the suite < 4 min.
