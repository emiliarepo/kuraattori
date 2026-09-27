# 24 Status on cards and small home-page tweaks
Status: todo · Model: Sonnet 5 · Blocked by: 15, 18, 19

1. **Heart on cards and rows.** Signed-in users see a small button in the top-right corner of every ExhibitionCard image (and next to the title in ExhibitionRow): `♡` when unmarked, rust `♥` when Kiinnostaa, `✓` when Käyty (hidden ones don't appear in lists). Tapping toggles Kiinnostaa ↔ none (on a visited card it does nothing and just shows ✓). Optimistic update through `userExhibition.setStatus`, polite live-region announcement, `aria-pressed`, accessible name "Kiinnostaa: <title>". The button must not be nested inside the card's `<Link>` (invalid HTML): position it over the image as a sibling. At least 44×44 px touch target with a small visible glyph; `--bg` at ~85% behind the glyph for contrast on photos, square, no pill or shadow. Anonymous users see no button. Keep the card's fixed line budget (the status kicker text can then drop "KIINNOSTAA" since the heart shows it; keep "KÄYTY" out of the kicker too).
2. **Päättyy pian:** interested exhibitions sort first (per design.md), marked with the heart.
3. **Hide visited** exhibitions from Sinulle and Uudet näyttelyt; keep them in Päättyy pian and lists with the ✓.
4. **Empty Sinulle:** a signed-in user without interests sees "Valitse kiinnostuksen kohteet" linking to `/profile` in place of the rail.
5. **Omat tab dot:** a small rust dot on the Omat tab (mobile bottom bar and desktop tab) when an interested exhibition ends within 7 days; include it in the tab's accessible name ("Omat, 2 päättyy pian").

Verify at 390/1280 px, light and dark, signed in and anonymous; toggling from a rail updates the detail page and /my/interested without reload.

**Design:** follow `docs/design.md` ("Aikakauslehti"); update its ExhibitionCard, ExhibitionRow and BottomTabBar entries for the heart and the dot.
