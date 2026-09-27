# 31 Terms of use, privacy policy and account deletion
Status: done · Model: Opus 5.5 (low effort) · Blocked by: none

Google's OAuth consent screen needs public links to a privacy policy and terms of use. Keep both as short and plain as possible, in Finnish, based on an existing template rather than written from scratch.

- **Privacy policy** (`/privacy`, "Tietosuojaseloste"): base it on the Finnish Data Protection Ombudsman's privacy notice model (tietosuoja.fi, "Tietosuojaselosteen malli"/informing template) and GDPR art. 13 headings. Cover exactly what the app does: controller (Emilia Repo, private individual, contact emilia@repo.codes); data (Google account name, email, profile image URL; session and preference cookies; chosen regions, interest weights, exhibition statuses, visit dates and notes, calendar feed token); purpose and legal basis (providing the service the user asked for: art. 6(1)(b)); processors and transfers (Cloudflare: hosting, database, logs; Google: sign-in; note Cloudflare/Google as processors with EU–US Data Privacy Framework / SCCs, linking their DPAs); retention (until the user deletes the account; server logs per Cloudflare's retention); no analytics, no ads, no selling; user rights (access, rectification, erasure, portability, objection, complaint to the Data Protection Ombudsman); cookies used (list them by name). Date and version at the top.
- **Terms of use** (`/terms`, "Käyttöehdot"): base it on a short, reputable open template for a free hobby web service; cover: free service provided as is, no warranty; exhibition data comes from museot.fi and may be wrong or out of date, check the museum before visiting; user responsibilities (lawful use, no automated scraping of Kuraattori); account termination by either party; changes to terms; Finnish law. Date at the top.
- **Account deletion** (GDPR erasure, required by the policy): "Poista tili" on `/profile/account` with a confirm step; deletes the user and all their rows (accounts, sessions, interests, regions, statuses, notes, calendar feed) in one transaction; signs out; test that no rows remain.
- **Data export** (portability, small): "Lataa tietosi" on `/profile/account` returns the user's data as JSON.
- Links: footer on every page (Käyttöehdot · Tietosuoja), and a line on `/sign-in` ("Kirjautumalla hyväksyt käyttöehdot ja tietosuojaselosteen"). Both pages are public and indexable; add them to the sitemap.
- Report in the ticket: the template sources used (URLs) and the exact URLs to enter in the Google OAuth consent screen (home page, privacy, terms).
- Add a one-line note at the top of this ticket's report that this is not legal advice and the user should read both texts before publishing.

**Design:** reading pages in the Aikakauslehti style (serif body, `text-headline` title, kicker date line), comfortable measure (~65ch).

## Report

This is not legal advice. Read both texts before publishing.

**Template sources**

- Privacy policy: the Data Protection Ombudsman's list of what the informing obligation requires (GDPR art. 13), https://tietosuoja.fi/documents/6927448/8214536/Informointivelvoitteen+edellytt%C3%A4m%C3%A4t+tiedot/419957bd-fd5a-4090-9c64-cf4769b10570/Informointivelvoitteen+edellytt%C3%A4m%C3%A4t+tiedot.pdf, and its guide https://tietosuoja.fi/rekisteroidyn-informointi. The office no longer publishes a fill-in "tietosuojaselosteen malli", so the headings follow that list.
- Terms of use: Automattic's open Legalmattic terms (CC BY-SA 4.0), https://github.com/Automattic/legalmattic, cut down to a free hobby service. The share-alike licence requires the attribution line at the bottom of `/terms`.

**Google OAuth consent screen**

- Home page: https://kuraattori.emialis.com/
- Privacy policy: https://kuraattori.emialis.com/privacy
- Terms of service: https://kuraattori.emialis.com/terms

**Deviations and notes**

- Google is described as handling sign-in under its own privacy policy, not as a processor. For Google account data, Google acts as a separate controller, and no Google DPA applies to a consumer OAuth client. Cloudflare is the processor and its DPA is linked.
- The cookie list comes from the code: Auth.js `authjs.session-token`, `authjs.csrf-token`, `authjs.callback-url` and `authjs.pkce.code_verifier` (with `__Secure-`/`__Host-` prefixes over HTTPS), plus `kuraattori_regions` and `kuraattori_onboarded`. The page also mentions the `sessionStorage` rail scroll position.
- Deletion also clears `user_followed_museum`, which has no UI yet, and `verification_token` rows matching the user's email. The test finds user-linked tables through the schema's foreign keys to `user`, so a future user table (e.g. from ticket 20) fails the test until `deleteUserData` and the privacy text cover it.
- Deletion is one `db.batch` (atomic in D1). The confirm step is `/profile/account?delete=1`.
