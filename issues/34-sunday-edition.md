# 34 Sunday edition ("Sunnuntainumero")
Status: todo · Model: Sonnet 5 · Blocked by: 30 · Priority: low

The design is a Sunday culture supplement; lean into it with a weekly, public, shareable edition for the three city regions only: Pääkaupunkiseutu, Tampere, Turku. No RSS.

- Route `/edition/[region]/[yyyy-mm-dd]` (the Sunday's date; region slugs `paakaupunkiseutu`, `tampere`, `turku`), plus `/edition/[region]` redirecting to the latest Sunday.
- Content, computed deterministically for that Sunday (Europe/Helsinki) from public data only, no personalisation: masthead "Sunnuntainumero · Tampere · 4.10.2026"; one lead exhibition (the most notable current opening of the past two weeks, tie-break by number of categories and image presence); "Päättyy tällä viikolla" (ends Mon–Sun); "Avautuu tällä viikolla"; "Piilohelmi" (one current exhibition at a museum with ≤ 2 current exhibitions, rotating week to week by a stable hash of the date).
- An edition is a snapshot: store its chosen exhibition ids when first generated (small table keyed by region+date) so it doesn't change later; older editions stay readable ("Arkisto" list per region).
- Home: a small "Tämän viikon numero →" link for users whose regions include one of the three cities (or all anonymous users: link to Pääkaupunkiseutu).
- Public and indexable, Open Graph image from the lead exhibition, in the sitemap. Keep reads within the ticket 23 budget and reuse the KV cache.
- Tests: the selection rules for a fixed date, snapshot stability.

**Design:** the most editorial page in the app: magazine front page layout in the Aikakauslehti style. Follow `docs/design.md`.
