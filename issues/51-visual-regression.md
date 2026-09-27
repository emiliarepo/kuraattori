# 51 Visual regression tests

Status: done · Model: Opus 5.5 (low) · Baselines: pending the first Linux run (no Docker on the authoring machine)

Playwright screenshot tests for the key pages at 390 and 1280 px, light and dark, in Finnish, compared in CI before every deploy.

- **Coverage:** home signed in and out, `/exhibitions`, an exhibition page (Oliver Beer, the real detail fixture), the Kiasma museum page, `/my/interested`, `/my/visited`, `/my/passport` with two stamps, `/my/year/2026`, `/trip` for Helsinki, a planned `/trip/day`, `/settings/interests` and the region selector open. 13 shots × 4 projects.
- **Deterministic:** frozen at 2026-09-27 12:00 Helsinki, the fixture snapshot's date. The browser uses `page.clock`; the visual Worker gets `E2E_FROZEN_NOW`, which `src/instrumentation.ts` turns into a pinned `Date` (`src/server/frozen-clock.ts`). No other server sets it. `visual:prepare` builds a fresh D1 from the fixtures and `scripts/visual-seed-user.ts` writes the user's rows directly; clicking through the UI toggled statuses back off now and then. Animations are disabled, fonts and images awaited, external images replaced with one placeholder (running exhibitions hot-link museot.fi) and other external requests aborted. The one mask is "Tiedot päivitetty", which comes from the seed's real clock. Full-page shots grow the viewport to the document height, since `fullPage` stitches the fixed mobile tab bar into the middle of the page.
- **Platform:** baselines only come from `mcr.microsoft.com/playwright:v1.63.0-noble`. `pnpm test:visual` and `pnpm test:visual:update` run it through `scripts/visual-docker.sh`, which reads the version from `pnpm-lock.yaml`. Docker isn't available on the machine this was written on, so no Linux baselines are committed yet. The Deploy workflow's `update_baselines` dispatch input produces them as the `visual-baselines` artifact and skips the deploy.
- **CI:** a `visual` job in the same image; `deploy` needs it. A diff fails the run and uploads `visual-diffs`. `maxDiffPixels` is 20 (a ratio let a changed heading pass on a tall desktop page: 0.001 of 1280×1683 is about 2 150 px), retries 0. The job checks its image tag against the lockfile.
- **Verification:** 5 consecutive compare runs with no diffs, but on macOS (`__screenshots__/darwin`, git-ignored), not in the Linux image. The first CI run is the real check. The Done-means gate passed; `edition.spec.ts` failed once in the first e2e run and passed on rerun and in a second full run.

## Before merging

Push the branch, run Deploy by hand on it with `update_baselines` ticked, unzip `visual-baselines` into `e2e/visual/__screenshots__/linux/` and commit. Without that, the first push to `main` fails the `visual` job for missing snapshots. After merging 52 and 53, re-baseline the same way (or `pnpm test:visual:update` where Docker exists).
