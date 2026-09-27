# Kuraattori: design

Finnish-language exhibition discovery and visit tracking. Product spec: `docs/spec.md`. This file records the decisions the spec left open.

## Visual direction: "Aikakauslehti"

A Sunday culture supplement. A serif masthead with the date, one lead recommendation, horizontal card rails, warm rust on paper. Structure comes from type and thin rules. No shadows, gradients, rounded cards or pills.

- **Type:** Newsreader (serif, variable, with italics) for the logo, headlines, titles, bylines and reading text; Inter (sans) for labels, buttons, form controls, dates and other data. Both are self-hosted through `next/font` in `src/app/layout.tsx`. Numerals are lining everywhere and tabular in data (TimeBar, meta values, DaysNumeral).
- **Type utilities** in `src/styles/globals.css`: `text-headline` (serif, weight 500, line-height 1.05; callers set the size), `text-kicker` (sans, 11 px, 600, uppercase, 0.12em tracking) for section labels, meta labels, "why" lines and status markers, and `rail` for horizontal scrollers. Bylines (museum, city) are serif italic in `--muted`.
- **Colour:** follows `prefers-color-scheme` automatically, no toggle. All colours are CSS variables in `src/styles/tokens.css`; components never use raw hex.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f1e7` | `#1a1612` |
| `--fg` | `#1f1a14` | `#eee5d6` |
| `--muted` | `#62594d` | `#a99d8c` |
| `--rule` | `#1f1a14` | `#eee5d6` |
| `--rule-soft` | `#ddd3c3` | `#3a3129` |
| `--signal` | `#9a3f14` | `#e5895b` |
| `--on-signal` | `#fdf9f2` | `#1a1612` |
| `--surface` | `#ece4d6` | `#26201a` |

  `--signal` (rust) is only for urgency, "why recommended" and the active state. Every text/background pair (`fg`, `muted` and `signal` on `bg` and `surface`, `on-signal` on `signal`, `bg` on `fg`) passes WCAG AA (4.5:1) in both modes; `src/styles/tokens.test.ts` enforces it, so change a token and the test tells you. `--rule` is for the masthead and section rules, `--rule-soft` for dividers between rows and meta lines.
- **Motion:** short transitions (≤150 ms) on state changes only. No looping animation. Everything off under `prefers-reduced-motion`.

## Components

- **Masthead** (`Header`): centred italic serif logo; the account link or UserMenu top right (the UserMenu is desktop only, since mobile has the Profiili tab). Below it, a date line between two `--rule` lines: weekday and date (`SUNNUNTAI 27.9.2026`, Helsinki time) on the left, the desktop tabs in the middle, the RegionSelector on the right. The masthead is not sticky.
- **LeadStory:** the top "Sinulle" pick on the home page. Image (3:2), a rust kicker `SINULLE · <reasons>`, a large serif title, an italic byline, a short excerpt of the description and the UrgencyLabel. Stacked on mobile; image and text side by side (3:2 columns) on desktop. The whole block is one link.
- **Rail:** a titled section (`Section`: serif heading on a `--rule` top border, optional "Kaikki" link) with a horizontally scrolling `<ul aria-label=…>` of ExhibitionCards. CSS scroll-snap only, no carousel script. Cards are 40vw wide on mobile (about 2.4 visible, so the next one always peeks) and 13 rem on desktop. The list bleeds to the screen edge on mobile. Every card is a link, so Tab walks the rail and the browser scrolls the focused card into view. Empty rails show the EmptyState text.
- **ExhibitionCard** (rail item): fixed line budget so cards in a rail line up: image (4:5) · optional lead slot (fixed height) · one rust kicker line (status and "why", truncated, reserved even when empty) · serif title clamped to 2 lines (reserved) · museum, city on one truncated line · categories on one truncated line · stacked TimeBar pinned to the bottom. Cards in a rail stretch to equal height. In Päättyy pian the lead slot holds a DaysNumeral and the TimeBar is omitted.
- **ExhibitionRow** (list view: browse, museum page, /my): thumbnail (4:3) left; rust "why" kicker · serif title · italic byline · categories · TimeBar · status marker. Rows are separated by 1 px `--rule-soft`.
- **TimeBar:** a 2 px bar (cards use the `stacked` layout: dates on one line, time left on the next, and an empty track for open-ended exhibitions so every card's time block has the same height) showing how far through its run the exhibition is. Filled part `--fg`; when ≤14 days remain the fill becomes `--signal` and the label turns bold rust. The sans label below always states the time as text: `12.9.–31.1.2027` on the left, `126 pv` / `7 päivää jäljellä` / `Päättyy tänään` / `Alkaa 2.10.` on the right; the two wrap onto separate lines in narrow cards. With no end date: no bar, label `Toistaiseksi`.
- **DaysNumeral:** a rust serif numeral with a small sans caption on the same baseline ("7 päivää"); `Päättyy tänään` in serif italic when zero days remain.
- **UrgencyLabel:** rust uppercase sans text with a 2 px rust rule on its left ("126 PÄIVÄÄ JÄLJELLÄ"). Used on the lead story and the detail page.
- **RegionSelector:** always in the masthead date line, e.g. `Pk-seutu, Tampere ▾`. Opens a bottom sheet (mobile) or popover (desktop) of region checkboxes. For signed-in users it edits their preferred regions (persisted). For anonymous users it keeps state in a cookie. It filters Koti and Selaa.
- **StatusActions:** a segmented control of three sans buttons joined by 1 px `--rule` lines: Kiinnostaa / Käyty / Piilota. The pressed one is `--signal` with `--on-signal` text. `aria-pressed` on each. Pressing the active one clears it. Optimistic update, with a polite live-region announcement.
- **Museokortti:** mark only the exception ("Ei Museokorttia"). No badge when eligible. The Museokortti filter is rendered only when some current exhibition is not eligible.
- **CategoryList:** plain sans text links separated by `·`, not chips.
- **ImageFallback:** if the image is missing or broken, the title is set in serif on `--surface`. It keeps the aspect ratio, so it never collapses the layout.
- **Forms** (filters, profile, onboarding, sign-in): kicker labels, `--rule-soft` input borders on `--bg`, checkboxes with a rust accent, primary buttons `--fg` with `--bg` text.

## Navigation and screens

Mobile first. Bottom tab bar on mobile: **Koti · Selaa · Omat · Profiili** (keys `home`, `browse`, `mine`, `profile`). On desktop the tabs sit in the masthead date line, between the date and the RegionSelector. Code identifiers and routes are English, including public paths; only visible text is Finnish (from `src/i18n/fi.ts`). Slugs come from Finnish titles because they are data.

| Route | Content |
|---|---|
| `/` | Signed in: LeadStory (best "Sinulle"), then rails: Päättyy pian (DaysNumeral cards, interested ones first, then relevant; "Kaikki" → `/exhibitions?ending=14`), Sinulle (the remaining picks), Uudet, Tulossa ("Kaikki" → `/exhibitions?state=upcoming`). Anonymous: a sign-in prompt instead of the lead, and no Sinulle rail. |
| `/exhibitions` | Browse: "Selaa" heading and an ExhibitionRow list, cursor paging. Filters: region, city, museum, category, Museokortti, käynnissä/tulossa, päättyy N pv sisällä, text search. Filter state lives in the URL. Mobile: a filter bottom sheet; desktop: a left sidebar. |
| `/exhibitions/[slug]` | Detail: breadcrumb (Näyttelyt / city / museum), UrgencyLabel, large serif title, italic byline. Below it a 1.6fr/1fr grid: image then description on the left; a sticky right column with the meta list (Museo, Kaupunki, Avoinna, Museokortti, Aiheet), TimeBar, StatusActions, source link and last update. On mobile the order is image, meta column, description. |
| `/museums`, `/museums/[slug]` | Museum list and museum page with its exhibitions (current, upcoming, past). |
| `/my` | Tabs (`/my/interested`, `/my/visited`, `/my/hidden`): Kiinnostavat, Käydyt (history, including ended ones), Piilotetut. |
| `/profile` | Interests (categories), regions, sign out. `/welcome` is onboarding after first login, skippable, with the same controls. |
| `/sign-in` | Google sign-in. |

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
- The `museokortti=1` listing filter returns the full list, so card status comes from detail pages (`div.sisaanpaasy_museokortilla`). A 52-exhibition sample on 27.9.2026 was 100% eligible: museot.fi is run by Museoliitto, which also runs Museokortti. Keep parsing it anyway for future sources.
- Upsert keyed by (`source`, `source_id`). Every run touches `last_seen_at`; a record isn't deleted when it goes missing. Each run is recorded in `import_runs` with its counts. If one record fails validation, it's counted in `items_failed` and the rest are still imported. If the whole fetch fails, the run is marked failed and nothing is touched.
- Fixtures in `fixtures/museot/` (snapshot of 27.9.2026) back the parser tests.
