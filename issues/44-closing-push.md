# 44 "Closing soon" push notifications
Status: todo · Model: Opus 5.5 (low) · Blocked by: 43 (migration order)

Web Push for the installed PWA (and desktop browsers). Opt-in only, from Profiili → a new notifications setting, never prompted on page load.

- One notification per exhibition, when a Kiinnostaa exhibition has 7 days left ("Päättyy viikon päästä: <title>, <museum>"), linking to its detail page. At most one notification per user per day; when several are due, bundle them into one ("3 kiinnostavaa näyttelyä päättyy viikon sisällä").
- Store push subscriptions per user and a sent-log so nothing repeats. Remove subscriptions the push service reports as gone (404/410).
- Sending: prefer a step in the existing nightly GitHub Action after the import (Node, reading D1 through the HTTP API like the importer) over a Worker cron. Justify in the ticket if you choose otherwise.
- VAPID keys: generate them and store the private key as a GitHub secret and/or Worker secret (authorized); the public key can be a public var. Never commit the private key.
- The service worker handles `push` and `notificationclick`. It stays production-only, as today.
- Include the account deletion and data export paths (subscriptions are personal data), and update the privacy page text.
- Tests: the due-selection logic (7-day window, dedupe, per-day bundling) as unit tests; E2E for the opt-in toggle. End-to-end delivery gets verified on prod once, from the nightly run or a manual workflow_dispatch.
