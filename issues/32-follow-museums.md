# 32 Follow museums
Status: todo · Model: Sonnet 5 · Blocked by: 20

The `user_followed_museum` table exists and relevance already awards +15 for a followed museum (`src/domain/relevance.ts`, used by `recommendation.forYou` and `trip`), but nothing writes to it.

- **Follow control:** a "Seuraa" / "Seurataan" toggle on `/museums/[slug]` (next to the museum name) and on each row of `/museums` for signed-in users; optimistic, `aria-pressed`, polite announcement. New protected procedures `museum.follow` / `museum.unfollow` (or one `setFollowed`), validated; user from the session only.
- **Home:** a "Seuraamasi museot" rail (current and upcoming exhibitions at followed museums, soonest-ending first, one entry per exhibition group, notices excluded) shown only when the user follows at least one museum; place it after Sinulle.
- **Profile:** a "Museot" section on `/profile/interests` (or its own tab if it reads better) listing followed museums with unfollow buttons.
- **Why label:** when the follow bonus applies, the reasons include the museum name (e.g. "Seuraat: Kiasma").
- **Privacy and deletion:** mention followed museums in `/privacy`, include them in the data export, and confirm ticket 31's deletion test covers the table (it should already).
- Cached public data (ticket 23 KV) must not include per-user follows.
- Tests: follow/unfollow idempotency, relevance bonus reaches the ranking, rail filtering.

**Design:** follow `docs/design.md`; the toggle is a text button in the StatusActions style, not a pill.
