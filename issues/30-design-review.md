# 30 Design consistency review
Status: todo · Model: Opus 5.5 (low effort) · Blocked by: 20, 21, 22, 31

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
| Masthead (desktop) | Region popover jumped horizontally as the label changed: base `inset-x-0` kept `left:0` at `sm`, so the panel hung off the trigger's left edge and overflowed the masthead by 140 px | `sm:left-auto`; trigger capped at `max-w-56` with a truncated label; date line no longer wraps | region |
| Masthead | First region toggle closed the popover (the `RegionSelector` key included the active regions, so `router.refresh()` remounted it) | Key by user only and adopt new server regions without remounting; E2E `region-selector.spec.ts` | region |
| Masthead (390 px) | Date wrapped onto two lines next to a long region label | Date `whitespace-nowrap`, selector shrinks | region |
| Masthead (desktop, signed in) | After UserMenu → Profiili the menu stayed open; its full-screen overlay swallowed the next click anywhere | Close the menu on link click; E2E `user-menu.spec.ts` | behaviour |
| All pages | Page top padding varied 24/32/48/64 px under the masthead (home, detail, profile, sign-in, welcome, legal, 404, error, offline) | One step: `py-8` everywhere; documented in design.md | spacing |
| /my | Title to tabs 16 px, other pages 24 px | `mb-6` | spacing |
| /profile (390 px) | Five tabs (467 px) overflowed a 358 px column and scrolled the whole page sideways | Tab row scrolls inside itself | spacing |
| /offline | Nested `<main>` plus its own `px-5` doubled the page-edge padding | Plain `div`, shared edges | spacing |
| All screens | Buttons used four paddings (py-1.5 to py-3), 34 to 46 px tall; only secondary buttons had hover | `btn` / `btn-primary` / `btn-secondary` utilities, 44 px minimum | consistency |
| Masthead, /my, /profile, detail, museum, trip, filters | Touch targets under 44 px: region trigger 16, tabs 40, StatusActions 40, follow 34, sort select 33, form controls 40–42, checkbox rows 20–28 | `min-h-11` (region trigger via negative margin so the date line keeps its height); desktop filter sidebar stays dense | consistency |
| Home (no interests), sign-in prompts | Action links were rust, which is reserved for urgency, "why" and active states | `--fg`, rust on hover, like the 404 link; rule added to design.md | consistency |
| /profile/account | Delete confirmation button 40 px and off the button scale | `btn` with the rust fill kept for the destructive action | consistency |
| /profile, /my tabs | Focus outline clipped by the scrolling tab row | Outline inset by 2 px on both tab bars | consistency |
| /profile interests, regions | The "Tallennettu" autosave confirmation was screen-reader only, and never re-announced after the first save | Visible muted kicker in a reserved line, cleared when a new change starts; E2E asserts it | behaviour |
| /exhibitions filter sheet (390 px) | "Näytä tulokset" dropped the filters: the back-to-close cleanup ran `history.back()` before Next updated the URL, cancelling the navigation and eating the previous history entry | `useBackToClose` returns a release function; the sheet replaces its history entry with the filtered URL; E2E in `browse.spec.ts` | behaviour |
