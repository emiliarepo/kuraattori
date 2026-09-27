# 54 Landing page for anonymous visitors

Status: done · Model: Opus 5.5 (low) · Follows: 50, 52

Anonymous visitors at `/` get a landing page rendered in place, with no redirect. Signed-in users keep the feed at `/`, and `/feed` shows the feed to everyone. The prototype branch `prototype/landing` served as reference only and was not merged.

- **Structure:** a feature showcase. The first screen has a headline, a line of copy and both buttons, next to a Sinulle pick with a stamp built from real data. Then come sections for Sinulle (cards with reasons, live interest weights, 👍/👎), Muistutukset (the push as sent, a calendar entry) and Museopassi (real Stamps and the share text), each a centred headline over a centred mock and revealed on scroll. A lighter Lisäksi row covers Matkalla, Museopäivä and Avoinna nyt lähelläsi, and the buttons repeat at the end. A first build of variant A's cover with B's chapters was rejected: the side-by-side text sat awkwardly and the exhibition lists made it read like a feed.
- **Routing:** Koti (desktop tabs and bottom bar) → `/feed`, and it counts as active on `/` too. The logo → `/`. Manifest `start_url: /feed`. `/` has its own title and description with canonical `/`; `/feed` has canonical `/feed`. The sitemap lists `/feed`.
- **Masthead:** `MastheadTitle` swaps the small logo link for the cover H1 when an anonymous visitor is at `/`, so there is only one masthead.
- **Reads:** only the feed's cached queries (Päättyy pian and Uudet, same inputs). The prototype's `meta.counts` scanned the whole exhibition table and was dropped.
- **Motion:** a one-shot entrance and a scroll reveal, run once and off under reduced motion. `docs/design.md` records it as the landing page's exception to the Motion rule. Hover: stamps lift, the notification lifts, and links underline.
- **i18n:** a `landing` block in fi, en and sv. Content keeps the Finnish fallback.
- `VisitRating`'s buttons are extracted as `RatingButtons`, so the landing demo uses the real control.
- **Tests:** `e2e/landing.spec.ts` covers anonymous `/`, the buttons above the tab bar at 390 px, a first-click "Selaa näyttelyitä", `/feed` anonymous and signed in, signed-in `/`, and Koti → `/feed` with the logo → `/` at both widths. The layout lint covers `/` and `/feed` signed in and anonymous; it now skips SVG text, since the Stamp's two-line labels have touching tspan boxes by construction. The spacing audit lists `/feed`. Anonymous specs that expected the feed at `/` now visit `/feed`.
- **Visual baselines:** `e2e/visual/pages.visual.ts` adds `feed` (signed in) and `landing` (signed out). The signed-out `home-signed-out` shot now captures `/feed`. Linux baselines could not be generated here (no Docker); they will be regenerated in CI after the merge with the Deploy workflow's `update_baselines` run, so the visual check fails until then.
