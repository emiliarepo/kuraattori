# 46 Intermittent React #418 hydration mismatch
Status: done · Model: Opus 5.5 (low)

Under the parallel E2E run, about 1 run in 3 or 4 failed with "Minified React error #418" (`args[]=HTML`) on a first page load. It hit the home, day planner, region selector, opening-hours and detail tests, never alone. Production runs the same build.

## Root cause

A React bug in the canary Next 15.5.26 vendors for the app router (`next/dist/compiled/react-dom`, `19.2.0-canary-0bdb9206-20250818`). It is not in the app code.

Next hydrates inside `startTransition`, so hydration is time-sliced. When a host element's children suspend on a thenable (here, a lazy RSC chunk that hasn't streamed in yet) and the thenable settles in the microtask gap, React replays that host fiber's begin phase (`replayBeginWork`, case 5). By then the hydration cursor already points at the element's first child. The replay tries to claim the element again, finds the child instead and throws #418. React 19.3.0 fixes this by rewinding `nextHydratableInstance` to the fiber's own node before the replay. The canary lacks that fix.

Load matters because the race needs the RSC chunk for `children` to land just after hydration reaches the element. Under parallel load the Worker streams slower and hydration starts earlier relative to the payload, which is why ticket 41's extra deep-browse test made it more frequent.

## Evidence

- Built with React's development client (guards stripped from both the vendored and the top-level copies, local only) and looped the suite until it failed. The unminified diff, on `/`, `/trip/day`, detail and browse alike, was always the same: under `<main>`, the client expected `PendingContent`'s `<div aria-busy>` and found `<Suspense>`, the div's own first child (`<!--$?-->`/`<!--$~-->` for `loading.tsx`).
- A MutationObserver in the page (temporary init script) showed the served DOM was correct at hydration time: `main > div[aria-busy] > <!--$~-->`, reveal still pending, no mutation before the error. So the DOM wasn't wrong. React's cursor was.
- The error stack runs through the concurrent work loop (`MessagePort` scheduler), i.e. transition hydration.
- `replayBeginWork` in the vendored canary has no hydration handling for host components. The same function in `react-dom@19.3.0` has it.
- `src/app/hydration-replay.test.ts` reproduces it deterministically with Next's vendored React: `<div>{Promise.resolve(<p/>)}</div>` hydrated in a transition. It fails with "Hydration failed…" on the unpatched copy and passes with the patch.

Ruled out: KV hit/miss differences (the served HTML and payload matched), dates, `navigator` reads (MuseumAddress, RouteLink and PushToggle read it in effects only), `useSyncExternalStore` (unused). The static-chunk 404s in the E2E log come from something else and play no part here.

## Fix

`patches/next@15.5.26.patch` (pnpm `patchedDependencies`) backports React 19.3.0's `replayBeginWork` change into Next's vendored `react-dom-client.production.js` and `.development.js`. No Next 15.5 release carries the fix (15.5.26 is the latest), and Next 16 is a major upgrade (it drops `next lint`, among other things), so that belongs in its own ticket. The patch is keyed to the exact version. After a Next bump it stops applying, and the regression test fails unless the new vendored React has the fix. At that point, drop the patch.

`jsdom` is a new dev dependency, used by that one test file only.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` pass. `SKIP_ENV_VALIDATION=1 pnpm test:e2e`, 8 runs in a row (each rebuilds):

| Run | Result |
|---:|---|
| 1 | 42 passed (18.1s) |
| 2 | 42 passed (18.9s) |
| 3 | 42 passed (16.8s) |
| 4 | 42 passed (17.0s) |
| 5 | 42 passed (16.9s) |
| 6 | 42 passed (17.4s) |
| 7 | 42 passed (17.7s) |
| 8 | 42 passed (17.7s) |

No `Hydration`/`#418` line in any run's log. Before the fix, the same local loop failed on runs 4, 11, 24, 31 and 41 of the diagnostic batches.
