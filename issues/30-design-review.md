# 30 Design consistency review
Status: done · Model: Opus 5.5 (low effort) · Blocked by: 20, 21, 22, 31

Review every screen against `docs/design.md` ("Aikakauslehti") for consistency and good looks, then fix what's off. Screens: home (signed in/out), browse + filter sheet, exhibition detail, museum list + page, /trip, /my (all tabs, sort, savings), /my/year/[yyyy], /profile (all tabs), /welcome, /sign-in, /terms, /privacy, error and not-found pages, loading skeletons, offline page. Each at 390 px and 1280 px, light and dark, and in fi/en/sv once ticket 22 has landed (longest strings).

**Focus areas (user, 27.9.2026), in priority order:**

1. **Spacing between elements:** measure, don't eyeball. Vertical rhythm between sections, rails, headings and their content; gaps inside cards, rows, forms and the masthead; consistent padding at page edges; nothing touching or crowding at 390 px; no accidental double margins. Normalise to a small set of spacing steps and document them in design.md.
2. **Design consistency:** the same element looks and behaves the same everywhere (buttons, links, kicker lines, section headers, empty/error states, form controls, status markers, follow toggles, sort controls), in both colour schemes.
3. **Functional behaviour:** every button and link does what it says on the first click or tap, including heart, StatusActions, follow, sort, filters, region selector, rail arrows, profile autosave, calendar copy/rotate, export/delete, sign in/out and back navigation. Look specifically for actions that need two clicks, e.g. a first click only focusing or hydrating, optimistic state reverting, a stale router cache, or overlays swallowing clicks. Reproduce each in the browser with real clicks, fix the root cause, and add an E2E assertion for any bug found.

Also check: type scale and weights, spacing rhythm, rule weights, rust used only for urgency/why/active, card line budget and rail alignment (measure), focus states, touch targets ≥ 44 px, empty and error states, skeletons matching final layouts, no layout shift on load or on interaction.

Known issue to fix (user, 27.9.2026): **on desktop the region selector popover jumps horizontally when the selected-regions label changes length.** Anchor it so it never moves while open (e.g. a fixed-width trigger with truncated label, or the popover aligned to the masthead's right edge), and keep the masthead date line layout stable as the label changes.

Deliverables: fixes committed per area, before/after screenshots for anything visibly changed, and design.md updated where a rule was unclear. Don't add features.

## Findings

| Screen | Issue | Fix | Commit |
|---|---|---|---|
| Masthead (desktop) | Region popover jumped horizontally as the label changed: base `inset-x-0` kept `left:0` at `sm`, so the panel hung off the trigger's left edge and overflowed the masthead by 140 px | `sm:left-auto`; trigger capped at `max-w-56` with a truncated label; date line no longer wraps | a7bda58 |
| Masthead | First region toggle closed the popover (the `RegionSelector` key included the active regions, so `router.refresh()` remounted it) | Key by user only and adopt new server regions without remounting; E2E `region-selector.spec.ts` | a7bda58, 49d769c |
| Masthead (390 px) | Date wrapped onto two lines next to a long region label | Date `whitespace-nowrap`, selector shrinks | a7bda58 |
| Masthead (desktop, signed in) | After UserMenu → Profiili the menu stayed open; its full-screen overlay swallowed the next click anywhere | Close the menu on link click; E2E `user-menu.spec.ts` | 49d769c |
| All pages | Page top padding varied 24/32/48/64 px under the masthead (home, detail, profile, sign-in, welcome, legal, 404, error, offline) | One step: `py-8` everywhere; documented in design.md | 7ea9eec |
| /my | Title to tabs 16 px, other pages 24 px | `mb-6` | 7ea9eec |
| /profile (390 px) | Five tabs (467 px) overflowed a 358 px column and scrolled the whole page sideways | Tab row scrolls inside itself | 7ea9eec |
| /offline | Nested `<main>` plus its own `px-5` doubled the page-edge padding | Plain `div`, shared edges | 7ea9eec |
| All screens | Buttons used four paddings (py-1.5 to py-3), 34 to 46 px tall; only secondary buttons had hover | `btn` / `btn-primary` / `btn-secondary` utilities, 44 px minimum | 7ea9eec |
| Masthead, /my, /profile, detail, museum, trip, filters | Touch targets under 44 px: region trigger 16, tabs 40, StatusActions 40, follow 34, sort select 33, form controls 40–42, checkbox rows 20–28 | `min-h-11` (region trigger via negative margin so the date line keeps its height); desktop filter sidebar stays dense | 7ea9eec |
| Home (no interests), sign-in prompts | Action links were rust, which is reserved for urgency, "why" and active states | `--fg`, rust on hover, like the 404 link; rule added to design.md | 8839e48 |
| /profile/account | Delete confirmation button 40 px and off the button scale | `btn` with the rust fill kept for the destructive action | 8839e48 |
| /profile, /my tabs | Focus outline clipped by the scrolling tab row | Outline inset by 2 px on both tab bars | 8839e48 |
| /profile interests, regions | The "Tallennettu" autosave confirmation was screen-reader only, and never re-announced after the first save | Visible muted kicker, right-aligned in the gap under the tabs so it never shifts the layout, cleared when a new change starts; E2E asserts it | 08a11d9, 41da8cf |
| /exhibitions filter sheet (390 px) | "Näytä tulokset" dropped the filters: the back-to-close cleanup ran `history.back()` before Next updated the URL, cancelling the navigation and eating the previous history entry | `useBackToClose` returns a release function; the sheet replaces its history entry with the filtered URL; E2E in `browse.spec.ts` | 3aaef93 |
| Loading skeletons | Card skeleton 271 px vs 359 px real (390 px), row skeleton 118 vs 154 px, so every rail and list jumped on load; home and detail skeletons kept the old page top | Skeleton lines sized to the real line budget (now within 2 px at both widths); `py-8` tops | 4b384ad |
| /profile/calendar | Feed URL input off the form-control pattern (px-3, 36 px) | Same classes as other inputs | 41da8cf |
| Masthead (anonymous, mobile) | "Kirjaudu sisään" crowded the centred logo (22 px at 390, touching and wrapped at 320) | Desktop only, like the UserMenu; the Profiili tab leads to sign-in | 7ded55e |
| /exhibitions "Näytä lisää" (prod) | Loading more jumped to the top of the page and moved focus. Production Next.js 15.5 ignores `scroll: false` when a `loading.tsx` boundary covers the page (it prefetches loading states; dev doesn't, so it only showed on prod). Confirmed with a build without loading boundaries | Restore scroll and focus in a microtask after Next's handler, before paint (no frame at the top); E2E in `browse.spec.ts` with a test-only `E2E_BROWSE_PAGE_SIZE` | d4b27d4 |
| /exhibitions city/museum filter | A city outside the masthead regions returned nothing (e.g. Nurmijärvi with Pääkaupunkiseutu selected) because the regions intersected the filter | A chosen city or museum replaces the masthead regions; unit tests plus E2E | 4638239 |

**Left as is:** en/sv strings (ticket 22 not landed). Interest weight controls fill the default "–" option with rust, which reads as a wall of rust on /profile and /welcome; changing what the neutral state looks like is a design call, not a consistency fix. With two or more masthead regions browse shows only the first page (no cursor across regions, see `list-across-regions.ts`); that's pagination design, not a spacing or first-click bug.
