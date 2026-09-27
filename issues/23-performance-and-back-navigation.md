# 23 Page-load performance and back navigation

Status: done · Model: Sonnet 5 · Blocked by: 24

Two related problems: moving between pages feels slow, and going back doesn't return the user to where they were.

## Measure first

Measured locally (`command pnpm opennextjs-cloudflare preview`, anonymous requests, same machine). No remote D1/live-site numbers: deploying wasn't authorized this session, so the "after deploy" column is a known gap — real D1 round trips over the network will show a larger win than these local numbers, since local D1 has near-zero latency and the benefit here is almost entirely fewer statements, not per-statement speed.

TTFB / total, cold vs warm (KV cache empty vs populated):

| Page                  | Cold TTFB / total | Warm TTFB / total |
| --------------------- | ----------------- | ----------------- |
| `/`                   | 181 / 184 ms      | 23 / 25 ms        |
| `/exhibitions`        | 30 / 32 ms        | 21 / 24 ms        |
| `/exhibitions/[slug]` | 63 / 64 ms        | 24 / 25 ms        |
| `/museums/[slug]`     | 17 / 18 ms        | 16 / 17 ms        |

`/my/interested` needs a session; the production preview build only offers Google sign-in (the dev credentials form is `NODE_ENV === "development"`-gated), so it wasn't measured here — see the D1 rows table below instead, measured under `pnpm dev` with a real signed-in session.

Where time went (before): serial `auth()`/`getActiveRegions()` calls duplicated across `Header`, `AppShell` and each page (deduped for free by `trpc/server.ts`'s existing `cache()`, but `generateMetadata`/page-body both called `bySlug` independently — a genuine duplicate fetch, now fixed); `museum.exhibitions` and `my.list` resolved each row through a full second `bySlug` call (N+1); `similar` and `recommendation.forYou` re-read the whole active-exhibition set and its category links on every single view.

## D1 read budget (hard requirement)

On 27.9.2026 the site went down for a day: the similar-exhibitions query read ~800 000 rows per detail view and exhausted D1's free-tier limit of 5 M rows read per day (fixed in commit "Fix similar-exhibitions query…"). Budget: every page must read **< 5 000 D1 rows** on a cold request (the whole dataset is ~640 exhibitions, ~1 800 category links, ~250 museums).

Rows read per page, from the dev-only `meta.rows_read` logger (`src/server/db/read-budget.ts`), same signed-in dev user and data on both sides:

| Page                                       | Before (rows / statements) | After, cache cold (rows / statements) | After, cache warm (rows / statements) |
| ------------------------------------------ | -------------------------- | ------------------------------------- | ------------------------------------- |
| `/`                                        | 2127 / 28                  | 2628 / 31                             | **105** / 20                          |
| `/exhibitions`                             | 375 / 11                   | 328 / 9                               | **79** / 8                            |
| `/exhibitions/[slug]` (grouped exhibition) | 896 / 17                   | 2550 / 21 (first pool population)     | **51** / 11                           |
| `/museums/[slug]` (7 exhibitions)          | 75 / **34**                | —                                     | **46** / **8**                        |
| `/my/interested` (3 items)                 | 45 / **16**                | —                                     | **16** / **5**                        |

Every page was already under the 5000-row budget before this ticket, since the dataset is small — the original incident was a correlated-subquery blowup (already fixed in a prior commit), not a steady-state overage. The real problem this ticket targets is aggregate daily D1 volume (the header's region query alone ran 1132×/day) and N+1 round trips, both fixed:

- **Shared cache** (`src/server/cache/kv-cache.ts`, a `CACHE` KV namespace): `system.regions`, `museum.list`, `category.list`, and a new "active exhibition pool" (`src/server/cache/active-pool.ts`, shared by `similar` and `recommendation.forYou`) are cached for 1 hour, keyed by day for the pool. A cold cache pays a one-time population cost (visible in the "cache cold" column above); every request after that for the rest of the hour reads 0 rows for that data. Falls back to an uncached call whenever the `CACHE` binding is absent (local dev before the namespace exists, or a future environment without it) — see the wrangler.jsonc comment for what to create before a remote deploy.
- **N+1 removed**: `museum.exhibitions` and `my.list` used to resolve each row through a second full `bySlug` call; both now do one batched query. `exhibition.bySlug`/`museum.bySlug` no longer run twice per request (`generateMetadata` and the page body now share one React-`cache()`-memoized call).
- **Indexes added**: `museum.region`, `museum.city` (filtered by browse, `system.regions`, `similar`'s region-match scoring).
- **Dev-only guard**: `src/server/db/read-budget.ts` wraps the D1 binding (only when `NEXTJS_ENV=development`, from `.dev.vars` — never shipped) and logs every statement's `rows_read`, warning when a burst of statements (a rough per-request proxy) crosses 5000.
- `exhibition_category(categoryId)` already had an index (`exhibition_category_category_idx`) from the earlier fix; the missing ones (`museum.region`, `museum.city`) are added.

**Bug caught and fixed during this ticket, not a pre-existing issue**: the first version of the read-budget wrapper reconstructed `raw()`'s positional rows from `run()`'s object-keyed rows to read `meta.rows_read` (D1 doesn't attach `meta` to `raw()`). For a joined select with colliding column names across tables — `exhibitions.id`/`museums.id`, exactly this app's `{exhibition, museum}` shape everywhere — the later column silently overwrote the earlier one in the object, scrambling the reconstructed positional array and corrupting real query results (surfaced as `RangeError: Invalid time value` on a `museum.createdAt` that was actually some other column's value). Fixed by calling the real `raw()` untouched and logging the returned row count as a lower-bound estimate instead; `read-budget.test.ts` pins this with a fake statement that has a colliding-name join.

## Likely improvements (confirm with the measurements)

- ~~Run a page's independent queries in parallel; remove N+1 query patterns (e.g. categories fetched per exhibition); keep D1 round trips per page small.~~ Done: `museum.exhibitions`/`my.list` N+1 removed; independent queries were already parallelized on every page that had them.
- ~~Cache public, non-personal data: museum/region/category lists and the exhibition data behind public pages...~~ Done via KV, TTL-based (see above) rather than tag-based revalidation — simpler than wiring the full Next.js incremental-cache/tag-cache/queue stack (R2 + a second D1 database + a Durable Object) for a dataset this size and an import that runs once a day; personal data was never cached and still isn't.
- ~~`loading.tsx` skeletons...~~ Done: `src/app/loading.tsx`, `exhibitions/loading.tsx`, `exhibitions/[slug]/loading.tsx`, `museums/[slug]/loading.tsx`, `my/loading.tsx`, built from shared `--surface` block primitives (`src/app/_components/Skeleton.tsx`), no animation.
- ~~Prefetch detail pages...~~ Already the case: nothing in the codebase sets `prefetch={false}`, so every `<Link>` uses Next's default (viewport-based, only currently-visible links) — no prefetch storm and no code change needed.
- ~~Images: ... `loading="lazy"` and `decoding="async"` below the fold, `fetchpriority="high"` for the lead story image...~~ Done in `ImageFallback` (the only `<img>` in the codebase); `LeadStory` passes the new `priority` prop.
- Bundle/client-boundary check: not revisited beyond the above — no client-component regressions were introduced, and the existing boundaries (`ImageFallback`, `StatusHeart`, `RegionSelector`, `FilterSheet`, and the new `RailScrollContainer`) were already or are now minimal, presentational client islands.

## Back navigation must restore where the user was

- ~~Browser back from a detail page returns to the same scroll position on home, browse, museum and /my pages.~~ Verified: browser scroll restoration already handles this natively; nothing broke it.
- ~~Browse (`/exhibitions`): the filters..., the number of loaded pages ("Näytä lisää") and the scroll position survive back navigation.~~ Done: loaded-pages count moved into the URL (`?page=N`, `src/app/_lib/browse-filters.ts`), loading pages 1..N server-side (`listAcrossRegionsPages`, `src/app/_lib/list-across-regions.ts`); "Näytä lisää" now `router.replace`s to `page+1` instead of client-fetching and appending. Works on a full reload since it's a real URL.
- ~~Horizontal rails keep their horizontal scroll position after back.~~ Done: `RailScrollContainer` persists/restores `scrollLeft` via `sessionStorage`, keyed by path + rail title.
- ~~Open sheets (filter, region) are closed after back...~~ Done: `useBackToClose` (`src/app/_lib/use-back-to-close.ts`) pushes a history entry while a sheet is open and closes it on `popstate`, used by `FilterSheet`'s mobile dialog and `RegionSelector`'s popover.
- ~~Status changes made on a detail page are visible immediately after going back...~~ Done: `StatusHeart`/`ExhibitionStatusControl` call a new `refreshStatusData` server action (`revalidatePath("/", "layout")`) on a successful status mutation, the same pattern `RegionSelector` already used for regions.

Verified in the browser at 390px with real back-button navigation (T3 preview tools, `preview_evaluate`/`history.back()`), signed in as the dev user: home (scroll + rail scroll) → detail → back; browse with 3 loaded pages (60 items) and a deep scroll position → detail → back, both fully restored; filter sheet open → back closes it, stays on `/exhibitions`; region popover open → back closes it, stays on the page; toggling "Kiinnostaa" on a detail page then going back to `/` showed the filled heart immediately, no stale state. Focused tests added for the new URL/state logic: `browse-filters.test.ts` (page parsing/clamping/round-trip) and `read-budget.test.ts` (the D1 wrapper doesn't corrupt joined-query results — see the bug note in the D1 read budget section above).

**Design:** follow `docs/design.md` ("Aikakauslehti"); skeletons use `--surface` blocks matching the real layout (same card line budget), no shimmer.
