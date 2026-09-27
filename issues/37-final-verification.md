# 37 Final verification
Status: todo · Model: Opus 5.5 (low effort) · Blocked by: 22, 34, 35, 36, 38, 39

A second full pass of ticket 30 after all remaining features land: repeat ticket 30's checklist and focus areas (spacing, consistency, first-click behaviour) across every screen, now including /edition, /my/passport, /trip/day and all three locales. Fix what's off, add E2E assertions for any behavioural bug, and finish with a short list of anything deliberately left as is.

**Carried over from ticket 30 (fix these, don't just note them):**
- Browse with two or more masthead regions only ever shows the first page: no cursor across regions (`list-across-regions.ts`). "Näytä lisää" must work for any number of regions.
- Interest weight controls fill the neutral "–" option with rust, so /profile and /welcome read as a wall of rust. The neutral state should look neutral (`--fg`/`--rule`), with rust only for the chosen non-neutral levels.

## Carried over (27.9.2026)

- Intermittent React #418 hydration mismatch on first load under parallel E2E load (see issues/41 notes): find the cause.
- The dev sign-in form only appears with `E2E_TEST_AUTH`, but README and AGENTS.md say it appears in development: align the code or the docs.
- Intermittent failure of `opening-hours.spec.ts` "exhibition page says whether the museum is open today" under full parallel load (1 in about 4 runs, passes alone): likely the same load-dependent race as the #418 flake.
