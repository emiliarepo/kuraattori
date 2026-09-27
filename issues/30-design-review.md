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
