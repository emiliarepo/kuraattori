# 44 "Closing soon" push notifications
Status: done · Model: Opus 5.5 (low) · Blocked by: 43 (migration order)

Web Push for the installed PWA (and desktop browsers). Opt-in only, from Profiili → a new notifications setting, never prompted on page load.

- One notification per exhibition, when a Kiinnostaa exhibition has 7 days left ("Päättyy viikon päästä: <title>, <museum>"), linking to its detail page. At most one notification per user per day; when several are due, bundle them into one ("3 kiinnostavaa näyttelyä päättyy viikon sisällä").
- Store push subscriptions per user and a sent-log so nothing repeats. Remove subscriptions the push service reports as gone (404/410).
- Sending: prefer a step in the existing nightly GitHub Action after the import (Node, reading D1 through the HTTP API like the importer) over a Worker cron. Justify in the ticket if you choose otherwise.
- VAPID keys: generate them and store the private key as a GitHub secret and/or Worker secret (authorized); the public key can be a public var. Never commit the private key.
- The service worker handles `push` and `notificationclick`. It stays production-only, as today.
- Include the account deletion and data export paths (subscriptions are personal data), and update the privacy page text.
- Tests: the due-selection logic (7-day window, dedupe, per-day bundling) as unit tests; E2E for the opt-in toggle. End-to-end delivery gets verified on prod once, from the nightly run or a manual workflow_dispatch.

## Outcome (27.9.2026)

- **Tables** (migration `0010`): `push_subscription` (endpoint primary key, user, keys) and `push_sent` (user, exhibition, `sentOn`), which serves as both the "never repeat" log and the "one per day" check. Both tables are in the data export and the account deletion. The privacy page is at version 2.
- **Selection** (`src/domain/closing-push.ts`): interested exhibitions with 1–7 days left that the user has never been notified about. The whole week counts, not only day 7, so a missed nightly run or a Kiinnostaa set on day 5 still notifies. Nothing is sent to a user already notified that day. Several due exhibitions become one notification linking to `/my/interested`.
- **Sender** (`scripts/send-closing-push.ts`, `pnpm push:closing`): a step after the import in `.github/workflows/import.yml`, reading D1 through the HTTP API. It runs even if the import fails (`!cancelled()`), because notifications don't depend on fresh data. A subscription that answers 404/410 is deleted. The sent-log is written only when at least one device accepted the push.
- **Keys:** the public key is committed in `src/push/vapid.ts`. The private key is the GitHub secret `VAPID_PRIVATE_KEY`, set on 27.9.2026 and never written to disk. It is not a Worker secret, because the Worker never sends.
- **UI:** a "Muistutukset" section on Profiili → Kalenteri. The button reads "Otetaan käyttöön…" / "Poistetaan…" and is disabled while pending, with no page navigation, so `usePendingNavigation` doesn't apply. Unsupported browsers, iOS outside the installed PWA, and blocked permission each get a line of text instead of the button. Outside production there is no service worker, so the section shows "not supported".
- Checked locally against local D1 with a throwaway key: a real signed request to an endpoint answering 410 removed the subscription, one answering 201 wrote the sent-log, and a second run found nothing due.

## Verify delivery on prod once (after merge and deploy)

1. On a phone with Kuraattori installed to the home screen (iOS needs the installed PWA) or on desktop Chrome/Firefox, sign in at https://kuraattori.emialis.com, go to Profiili → Kalenteri → "Ota muistutukset käyttöön" and allow notifications.
2. Run `gh workflow run import.yml -f push_test_email=<your Google account email>` (or Actions → "Import museot.fi" → Run workflow and fill in `push_test_email`). This skips the import and sends "Testimuistutus Kuraattorista" to every subscription of that user.
3. Check that the log of `gh run watch` ends with `{"delivered":N}` where N ≥ 1, that the notification appears, and that tapping it opens `/profile/calendar`. The step fails if no subscription accepted the push.
4. For the real notification, mark an exhibition ending within 7 days as Kiinnostaa. The next nightly run (01:00 UTC) logs `{"due":1,"delivered":1}` and the notification links to its detail page.
