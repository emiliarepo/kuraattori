# 12 Serif redesign: "Aikakauslehti" direction
Status: done · Model: Opus 5.5 · Blocked by: none

Replace the "Galleria" direction (heavy grotesk, black rules, vermilion) with direction B "Aikakauslehti" from the first UI mocks: a Sunday culture supplement. Serif masthead with a date line, one lead recommendation, horizontal card rails, a warm rust accent on paper.

1. **Type:** a self-hosted serif through `next/font` for headlines, titles and reading text. A small sans for labels, buttons and data. Dates and TimeBar numerals stay lining and tabular.
2. **Colour:** warm paper background in light mode (not pure white), warm near-black text, rust `--signal` for urgency, "why recommended" and the active state. Dark mode stays automatic through `prefers-color-scheme`, with a warm dark palette. Update `src/styles/tokens.css` and the table in `docs/design.md`. Every text/background pair passes WCAG AA in both modes, enforced by a test.
3. **Masthead:** centred serif logo; a date line between rules with the weekday and date, the RegionSelector and (desktop) the tabs.
4. **Home:** the top Sinulle pick as the lead story (image, rust kicker with the reasons, serif title, italic byline, excerpt, urgency). Päättyy pian, Sinulle, Uudet and Tulossa become horizontal rails: CSS scroll-snap, the next card partly visible, every card a link so Tab moves through them, a labelled list for screen readers, no carousel library.
5. **Browse, detail, museum, /my, /profile, sign-in, welcome, error pages:** restyle to the new direction. Browse stays a list.
6. Keep all behaviour: TimeBar, RegionSelector in the header, categories on rows and cards, "why recommended", StatusActions, urgency as text, ImageFallback, reduced motion, visible focus. No looping animation.
7. Rewrite the visual-direction section of `docs/design.md` so later work follows it.

Verify in the browser at 390 px and 1280 px, light and dark: home, browse, exhibition detail, museum page, /my, /profile, /dev/components.
