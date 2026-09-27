# 28 Server error visibility and friendly failure states

Status: done · Model: Sonnet 5 · Blocked by: 23

During the outage `wrangler tail` showed no error at all and users saw Next's generic "Application error … Digest". Fix both.

- Log every server-side failure with context: a tRPC `onError` handler and a server-component error path that log `{ path, procedure, userId present?, error name/message, D1 error code }` via `console.error` so `wrangler tail` and Workers Logs show it. Enable Workers Logs (observability) in `wrangler.jsonc` if not already on (free tier).
- Recognise D1 failures (limit exceeded, timeouts): show a Finnish, on-brand error page ("Tietoja ei juuri nyt voitu ladata. Yritä hetken kuluttua uudelleen.") with the masthead intact, instead of the root error. Global `error.tsx`/`global-error.tsx` in the Aikakauslehti style; never show stack traces or digests as the main content.
- Public pages degrade where possible: if a secondary rail/section fails, render the rest of the page and an EmptyState for that section (use per-section error boundaries/`Promise.allSettled` for independent queries).
- Test: force a D1 error in a unit/integration test and assert the friendly state renders and the error is logged.
