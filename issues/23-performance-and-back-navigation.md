# 23 Page-load performance and back navigation
Status: todo · Model: Sonnet 5 · Blocked by: 24

Two related problems: moving between pages feels slow, and going back doesn't return the user to where they were.

## Measure first

Record before/after numbers in this ticket for the production build on Workers (`command pnpm preview`, then the live site after deploy): TTFB and time until content is visible for `/`, `/exhibitions`, `/exhibitions/[slug]`, `/museums/[slug]`, `/my/interested`, cold and warm, plus client-side navigation time between them. Identify where time goes (D1 query count and duration per page, serial vs parallel queries, `auth()` and `getActiveRegions()` calls, payload size, image weight) before changing anything.

## Likely improvements (confirm with the measurements)

- Run a page's independent queries in parallel; remove N+1 query patterns (e.g. categories fetched per exhibition); keep D1 round trips per page small.
- Cache public, non-personal data: museum/region/category lists and the exhibition data behind public pages, invalidated by the import (e.g. revalidate tags touched by the importer, or a short `s-maxage` + stale-while-revalidate at the edge). Personal data (status, recommendations) is never cached across users.
- `loading.tsx` skeletons in the Aikakauslehti style for slow segments, so navigation responds immediately. No shimmer or looping animation (design rule).
- Prefetch detail pages for visible cards/rows (Next `<Link>` default) and make sure it isn't disabled; avoid prefetch storms on long lists.
- Images: explicit width/height or aspect ratio already exist; add `loading="lazy"` and `decoding="async"` below the fold, `fetchpriority="high"` for the lead story image; don't add an image pipeline.
- Bundle: check client component boundaries; keep heavy code server-side.

## Back navigation must restore where the user was

- Browser back from a detail page returns to the same scroll position on home, browse, museum and /my pages.
- Browse (`/exhibitions`): the filters (already in the URL), the number of loaded pages ("Näytä lisää") and the scroll position survive back navigation. Put the loaded page count in the URL (e.g. `?page=3`, loading pages 1–3 on the server) or restore from a cache keyed by the URL; pick the one that also works on a full reload.
- Horizontal rails keep their horizontal scroll position after back.
- Open sheets (filter, region) are closed after back; back while a sheet is open closes the sheet instead of leaving the page (use history state for the sheet, or at minimum don't break back).
- Status changes made on a detail page are visible immediately after going back (no stale "Kiinnostaa" state from the router cache).

Verify on a phone viewport in the browser with real back-button navigation (preview history back), not just by reading code. Add focused tests for any URL/state logic.

**Design:** follow `docs/design.md` ("Aikakauslehti"); skeletons use `--surface` blocks matching the real layout (same card line budget), no shimmer.
