# 09 Launch prerequisites
Status: doing · Model: orchestrator + human · Blocked by: 07

- [ ] **museot.fi permission** (findings below; email draft ready, not sent)
- [ ] Cloudflare: `wrangler login`, create D1 `kuraattori`, put its id in `wrangler.jsonc`, apply migrations remotely, set Worker secrets (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
- [ ] Google OAuth client (web): origin `https://<prod host>`, redirect `https://<prod host>/api/auth/callback/google`, logo `public/logo-120.png`
- [x] GitHub repo `emiliarepo/kuraattori`
- [ ] GitHub secrets for the import workflow: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (D1 edit), `D1_DATABASE_ID`
- [ ] First remote import, then deploy (explicit go-ahead required)

## museot.fi terms (checked 27.9.2026)

- `robots.txt` is empty and pages send `meta robots=ALL`: no technical crawling restriction.
- The only published terms (`/kayttoehdot`, 2025-6 PDFs) cover the Museum Card product: buying, renewal, cancellation, privacy. They say nothing about reusing site content, automated retrieval or linking images.
- Exhibition texts and images are supplied by the museums through Museoliitto's calendar tool; images are the museums' or photographers' copyright. Hotlinking them is the main legal risk, more than the factual data (titles, dates, venues).
- Our load: ~50 listing requests plus detail pages only for new or changed exhibitions, once a day at ≤2 req/s, with an identifying User-Agent.

Conclusion: not forbidden, not explicitly allowed. Ask Museoliitto before a public launch. Until they answer, keep the site unlisted.

Fallback if they decline images: show only our typographic ImageFallback and link out to museot.fi. Museum metadata is also available as open data via Finna's museum database.

### Draft email (Finnish), to Museoliitto viestintä / näyttelykalenteri

> Aihe: Museot.fi-näyttelykalenterin tietojen käyttö harrastusprojektissa
>
> Hei,
>
> teen ei-kaupallista harrastusprojektia nimeltä Kuraattori: suomenkielinen verkkopalvelu, jossa käyttäjä voi selata Suomen museoiden näyttelyitä, merkitä kiinnostavat ja käydyt näyttelyt sekä nähdä, mitkä päättyvät pian. Näyttelytiedot haettaisiin kerran vuorokaudessa museot.fi-näyttelykalenterista (nimi, ajankohta, museo, teemat, kuvaus ja kuva), ja jokaisesta näyttelystä linkitettäisiin takaisin museot.fi:n sivulle. Palvelu ohjaa kävijöitä museoihin, myös Museokortilla.
>
> Onko tietojen tällainen käyttö teille sopivaa? Saako näyttelykuvia näyttää suoraan museot.fi:n osoitteista, vai pitäisikö kuvat jättää pois? Onko teillä rajapintaa tai tietosyötettä, jota käyttäisitte mieluummin kuin sivujen lukemista?
>
> Kiitos!
> Emilia Repo
