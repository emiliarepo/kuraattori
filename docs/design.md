# Kuraattori: design

Finnish-language exhibition discovery and visit tracking. Product spec: `docs/spec.md`. This file records the decisions the spec left open.

## Visual direction: "Galleria"

Gallery wall labels. Heavy grotesk type, hard black rules, generous imagery, one signal colour. No decorative cards, shadows, gradients or rounded pills; structure comes from type and rules.

- **Type:** a single grotesk family, self-hosted via `next/font` (Inter Tight or Archivo; pick one, weights 400/600/800). Display sizes are tight (`letter-spacing:-0.05em`, `line-height:0.9`). Numerals are tabular in data.
- **Colour:** follows `prefers-color-scheme` automatically, no toggle. All colours are CSS variables in `src/styles/tokens.css`; components never use raw hex.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#0b0b0b` |
| `--fg` | `#0a0a0a` | `#f2f0ec` |
| `--muted` | `#555555` | `#a3a09a` |
| `--rule` | `#0a0a0a` | `#f2f0ec` |
| `--rule-soft` | `#d9d9d9` | `#2a2a2a` |
| `--signal` | `#d9331a` | `#ff6a4d` |
| `--on-signal` | `#ffffff` | `#0b0b0b` |
| `--surface` | `#f3f3f1` | `#161616` |

  `--signal` is only for urgency, "why recommended" and the active state. Verify WCAG AA for every text/background pair in both modes.
- **Motion:** short transitions (≤150 ms) on state changes only. No looping animation. Everything off under `prefers-reduced-motion`.

## Components

- **ExhibitionRow** (list view, the main unit): image thumbnail · title (bold) · museum, city · categories (small, muted, `·`-separated) · **TimeBar** · personal-status marker. Rows are separated by a 1 px `--rule`.
- **TimeBar:** a thin horizontal bar showing how far through its run the exhibition is. Filled part `--fg`; when ≤14 days remain the fill becomes `--signal` and the label turns bold. The label below always states the time as text: `12.9.–31.1.2027` on the left, `126 pv` / `7 päivää jäljellä` / `Päättyy tänään` / `Alkaa 2.10.` on the right. With no end date: no bar, label `Toistaiseksi`.
- **DaysNumeral:** large numeral + small caption ("7 / päivää"), used in the "Päättyy pian" list.
- **Hero:** a full-bleed image with the title and museum overlaid on a bottom scrim. Used for the top "Sinulle" pick.
- **RegionSelector:** always visible in the header, e.g. `Pk-seutu, Tampere ▾`. Opens a sheet (mobile) or popover (desktop) of region checkboxes. For signed-in users it edits their preferred regions (persisted). For anonymous users it keeps state in a cookie. It filters Koti and Selaa.
- **StatusActions:** a segmented control of three buttons joined by 2 px rules: Kiinnostaa / Käyty / Piilota. `aria-pressed` on each. Pressing the active one clears it. Optimistic update, with a polite live-region announcement.
- **CategoryList:** plain text links, not chips.
- **ImageFallback:** if the image is missing or broken, the title is set large on `--surface`. It must never collapse the layout.
- **UrgencyLabel:** a `--signal` block with `--on-signal` text ("7 päivää jäljellä"). Used on the detail page and the hero.

## Navigation and screens

Mobile first. Bottom tab bar on mobile: **Koti · Selaa · Omat · Profiili**. Top bar on desktop, with the logo left, tabs, and the RegionSelector right. Routes are Finnish:

| Route | Content |
|---|---|
| `/` | Signed in: Hero (best "Sinulle"), Päättyy pian (DaysNumeral list, interested ones first, then relevant), Sinulle (2-col grid), Uudet, Tulossa. Anonymous: the same without Sinulle, plus a sign-in prompt. |
| `/nayttelyt` | Browse: ExhibitionRow list, cursor paging. Filters: region, city, museum, category, Museokortti, käynnissä/tulossa, päättyy N pv sisällä, text search. Filter state lives in the URL. Mobile: a filter bottom sheet; desktop: a left sidebar. |
| `/nayttelyt/[slug]` | Detail: 60/40 split with image left and info right (stacked on mobile). UrgencyLabel, huge title, description, a meta grid (Museo, Kaupunki, Avoinna, Museokortti), TimeBar, StatusActions, categories, source link, last update. |
| `/museot`, `/museot/[slug]` | Museum list and museum page with its exhibitions (current, upcoming, past). |
| `/omat` | Tabs: Kiinnostavat, Käydyt (history, including ended ones), Piilotetut. |
| `/profiili` | Interests (categories), regions, sign out. `/tervetuloa` is onboarding after first login, skippable, with the same controls. |
| `/kirjaudu` | Google sign-in. |

## Data and domain decisions

- **Dates** are stored as ISO `YYYY-MM-DD` strings. "Today" is computed in `Europe/Helsinki`. An exhibition is **current** if `start ≤ today ≤ end` (or no end), **upcoming** if `start > today`, **ended** if `end < today`.
- **Urgency** (0–100) comes from days remaining: >60→0, 31–60→10, 15–30→25, 7–14→50, 2–6→75, 1→90, 0→100. Ended or no end date → 0.
- **Relevance:** +40 for the first matching interest category, +15 per additional match (capped at +70 total for categories), +20 for a preferred region, +15 for a followed museum, +10 if first seen within 14 days. Every point carries a reason string for the "why" label.
- **Sinulle ranking:** `relevance + min(urgency, 100) * 0.15`. Only exhibitions with relevance > 0 **and** at least one category match are eligible when the user has interests. If they have none, eligibility falls back to region matches. Hidden and visited exhibitions are excluded. This keeps urgency a tiebreaker: at most +15 points.
- **User state** is a single `status` enum: `interested | visited | hidden`, or no row at all. Setting a status replaces the previous one; clearing deletes the row. `visited_at` is set when the status becomes visited.
- **Regions:** product regions map from the city (municipality). `Pääkaupunkiseutu` = Helsinki, Espoo, Vantaa, Kauniainen. `Tampere` = Tampere. `Turku` = Turku. Every other place maps to its maakunta name from museot.fi (`maakunta_id`). The mapping lives in `src/domain/regions.ts`.
- **i18n:** all UI strings live in `src/i18n/fi.ts`, accessed through a typed `t` object. Formatting uses `Intl` with `fi-FI`.

## Import

- Runs as a Node script (`pnpm import:museot`) on a GitHub Actions schedule (daily, 04:00 Helsinki time). It writes to D1 locally through wrangler's platform proxy and remotely through the D1 HTTP API. Not a Workers cron: the free plan's 10 ms CPU limit per run makes one impractical.
- Adapter: `MuseotFiAdapter implements ExhibitionSourceAdapter`. It fetches:
  1. `nayttelykalenteri/index.php?kaikki=1`, the full list (id, title, excerpt, museum, city, dates, image).
  2. Per theme `topic_N=1` (the IDs and labels come from the checkbox list on page 1, not hardcoded), for category membership.
  3. Per `maakunta_id` (the options on page 1), for each museum's region.
  4. The detail page (`nayttely_id=N`) only for new exhibitions or ones whose listing hash changed. This adds the full description, `museo_id`, Museum Card status (entrance image "Sisäänpääsy Museokortilla") and the text languages. Rate-limited to about 2 requests per second.
- The `museokortti=1` listing filter returns the full list, so card status comes from detail pages.
- Upsert keyed by (`source`, `source_id`). Every run touches `last_seen_at`; a record isn't deleted when it goes missing. Each run is recorded in `import_runs` with its counts. If one record fails validation, it's counted in `items_failed` and the rest are still imported. If the whole fetch fails, the run is marked failed and nothing is touched.
- Fixtures in `fixtures/museot/` (snapshot of 27.9.2026) back the parser tests.
