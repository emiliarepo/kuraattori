# 17 Installable app (PWA)
Status: todo · Model: GPT-6 Luna · Blocked by: 12

- Web app manifest (`src/app/manifest.ts`): name "Kuraattori", `lang: fi`, `display: standalone`, `background_color` `#f6f1e7` and `theme_color` `#f6f1e7` (light `--bg`); add `<meta name="theme-color">` for both schemes (`#f6f1e7` / `#1a1612`), icons from `public/` (add 192 and 512 maskable PNGs rendered from `public/icon.svg` with safe-zone padding).
- A small service worker (no heavy PWA framework): cache the app shell and static assets; network-first for pages; when offline, serve the cached `/my/interested` and a Finnish offline page ("Ei verkkoyhteyttä"). Never cache `/api/auth/*` or tRPC mutations.
- iOS: `apple-mobile-web-app-capable`, status bar style, apple-touch-icon already exists.
- Verify: Lighthouse installability (or Chrome DevTools Application panel), offline reload of /my/interested in the preview browser.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
