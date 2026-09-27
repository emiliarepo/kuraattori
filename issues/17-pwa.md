# 17 Installable app (PWA)
Status: todo · Model: GPT-6 Luna · Blocked by: 12

- Web app manifest (`src/app/manifest.ts`): name "Kuraattori", `lang: fi`, `display: standalone`, theme/background colours from the current design tokens (light), icons from `public/` (add 192 and 512 maskable PNGs rendered from `public/icon.svg` with safe-zone padding).
- A small service worker (no heavy PWA framework): cache the app shell and static assets; network-first for pages; when offline, serve the cached `/my/interested` and a Finnish offline page ("Ei verkkoyhteyttä"). Never cache `/api/auth/*` or tRPC mutations.
- iOS: `apple-mobile-web-app-capable`, status bar style, apple-touch-icon already exists.
- Verify: Lighthouse installability (or Chrome DevTools Application panel), offline reload of /my/interested in the preview browser.
