# 09 Launch prerequisites
Status: doing · Model: orchestrator + human · Blocked by: 07

- [x] museot.fi terms checked (findings below); decided not to contact Museoliitto
- [ ] Cloudflare: `wrangler login`, create D1 `kuraattori`, put its id in `wrangler.jsonc`, apply migrations remotely, set Worker secrets (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
- [ ] Google OAuth client (web): origin `https://kuraattori.emialis.com`, redirect `https://kuraattori.emialis.com/api/auth/callback/google`, logo `public/logo-120.png`
- [x] GitHub repo `emiliarepo/kuraattori`
- [ ] GitHub secrets for the import workflow: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (D1 edit), `D1_DATABASE_ID`
- [ ] Custom domain `kuraattori.emialis.com` on the Worker (zone `emialis.com` must be on Cloudflare); `NEXT_PUBLIC_SITE_URL=https://kuraattori.emialis.com`
- [ ] First remote import, then deploy (explicit go-ahead required)

## museot.fi terms (checked 27.9.2026)

- `robots.txt` is empty and pages send `meta robots=ALL`: no technical crawling restriction.
- The only published terms (`/kayttoehdot`, 2025-6 PDFs) cover the Museum Card product: buying, renewal, cancellation, privacy. They say nothing about reusing site content, automated retrieval or linking images.
- Exhibition texts and images are supplied by the museums through Museoliitto's calendar tool; images are the museums' or photographers' copyright. Hotlinking them is the main legal risk, more than the factual data (titles, dates, venues).
- Our load: ~50 listing requests plus detail pages only for new or changed exhibitions, once a day at ≤2 req/s, with an identifying User-Agent.

Conclusion: not forbidden, not explicitly allowed. Decision (27.9.2026): proceed without contacting Museoliitto.

Fallback if images ever become a problem: show only our typographic ImageFallback and link out to museot.fi.
