# Museum Exhibition Tracker: spec v0.1 (condensed)

The original spec, condensed. `docs/design.md` overrides it where they differ (importer on GitHub Actions, visual direction, scoring).

## Principles

- Exhibition-first: users browse, save, prioritise and mark individual exhibitions; museums are context.
- Deterministic, explainable recommendations. No LLMs.
- Urgency and relevance are separate. An irrelevant exhibition must not become a top recommendation just because it ends soon.
- Source traceability: the origin, last fetched, last seen and changed state of each record, and whether it disappeared.
- Finnish UI only, localisation-ready (fi, later en, sv). No language selector.

## Stack

Create T3 App: Next.js App Router, TypeScript, Tailwind, tRPC, Drizzle, Auth.js. Cloudflare Workers, D1, Static Assets. Aim for the free tier.

## Auth (§5)

Google sign-in, Auth.js tables in D1. Users keep their visited, interested and hidden exhibitions, regions and interests across devices. Anonymous browsing is allowed; anonymous personal state need not persist.

## Source (§6–7, §9–10)

Museot.fi behind an `ExhibitionSourceAdapter` (`fetchExhibitions`, optional `fetchMuseums`). Import: source id, title, description, museum, location, city, region, start/end dates, source URL, image URL, Museum Card eligibility, categories (keep the museot.fi taxonomy, don't hardcode it; many per exhibition), language variants. Detect new, changed and missing records; never hard-delete on one missing run; keep old exhibitions for users who visited them. Validate with Zod; one bad record doesn't fail the run; record errors.

## Schema (§8, indicative)

museums(id, source, source_id, name, slug, city, region, address, latitude, longitude, museum_card_eligible, website_url, created_at, updated_at, last_seen_at)
exhibitions(id, source, source_id, museum_id, slug, title_fi/en/sv, description_fi/en/sv, start_date, end_date, source_url, image_url, museum_card_eligible, source_payload_hash, created_at, updated_at, last_fetched_at, last_seen_at)
categories(id, source, source_id, name, slug, created_at, updated_at); exhibition_categories(exhibition_id, category_id) PK both
user_interests(user_id, category_id, weight default 1); user_regions(user_id, region); user_followed_museums(user_id, museum_id)
user_exhibitions(user_id, exhibition_id, status interested|visited|hidden, visited_at, created_at, updated_at)
data_sources(id, name, adapter, enabled, last_successful_import_at, created_at, updated_at)
import_runs(id, data_source_id, started_at, completed_at, status, items_fetched, items_created, items_updated, items_unchanged, items_missing, items_failed, error_message)

## tRPC (§11)

exhibition.list({region?, city?, museumIds?, categoryIds?, museumCardOnly?, state?: current|upcoming, endingWithinDays?, search?, cursor?}), bySlug, endingSoon, upcoming, new · museum.list, bySlug, exhibitions · category.list · profile.get/updateRegions/updateInterests (protected) · userExhibition.setStatus (or separate procedures) / listVisited / listInterested (protected) · recommendation.forYou (protected). Protected procedures take the user from the session, never from input.

## Pages (§14–18)

Home with personalised sections (Päättyy pian, Sinulle, Uudet näyttelyt, Tulossa, Kiinnostavat), not a stats dashboard. Browse filters: region, city, museum, category, Museum Card, current/upcoming, ending soon; optional search. Detail: title, museum, image, description, start, end, time left, categories, Museum Card, source link, user state; actions Kiinnostaa / Käyty / Piilota. Onboarding after the first sign-in (interests, regions), skippable, editable later.

## Quality (§21–29)

Mobile first. Accessibility: semantic HTML, keyboard navigation, visible focus, contrast, labels, accessible dialogs, announced state changes, reduced motion, urgency never shown by colour alone, alt text. Images degrade gracefully. Public pages indexable with metadata; user pages noindex. Server components by default; pagination/cursors. Friendly errors for import failures, broken images, auth and DB errors, stale or expired records. Record import runs. Tests: import normalisation, date/urgency edge cases, scoring (urgency doesn't overpower relevance), user-state transitions. Security: session-derived user, validated inputs, Drizzle parameterisation, no secrets on the client.

## MVP flow (§30)

Open the site → browse → sign in with Google → choose regions → choose interests → see recommendations → open an exhibition → Kiinnostaa → days later it shows under Päättyy pian → visit → Käyty → it stays in history after the exhibition ends.

## Non-goals

AI recommendations, social features, reviews, tickets, events, push, native apps, image pipeline, multilingual UI, analytics.
