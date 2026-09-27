# Overnight run order (27.9.2026)

Models (user, 27.9.2026): Opus 5.5 at low effort for difficult tickets; Sonnet 5 or GPT-6 Sol otherwise; never Luna.

Authorized by the user: execute tickets 13–21 in any order, merge locally, push, deploy (CI or `pnpm run deploy`), and review design consistency.

Migrations are serialized (one migration-adding ticket in flight at a time): 14 → 15 → 16 → 20.

1. Merge 11 (CI deploy) and 12 (serif redesign); verify live.
1b. After 12 lands: reread tickets 13–21 against the new docs/design.md and components (rails, serif tokens, card names); update wording, file references and UI instructions before launching them.
2. Wave A (parallel, no migrations): 13 weights (Sonnet), 17 PWA (Luna), 19 similar (Luna) + 14 dedupe (Sonnet, migration).
3. Wave B: 15 visit date/note (Luna, migration), 18 travel mode (Sonnet).
4. Wave C: 24 card status tweaks (Sonnet), 16 calendar (Luna, migration).
4b. Wave C2: 23 performance + back navigation (Sonnet, broad; skeletons copy the final card layout from 24).
4c. After 23: 26 health checks (Sol), 27 E2E tests (Sonnet), 28 error visibility (Sonnet), 29 profile tabs (Sonnet) — reliability first, alongside wave D.
5. Wave D: 20 savings (Opus low, migration) + 25 Omat sorting (Sol, no migration), then 21 year in review (Sonnet).
5b. After 20: 32 follow museums (Sonnet), 33 museum address + map link (Sol).
6. 22 en/sv locales (Opus low; lowest priority; adds a migration, so after 20).
6b. 31 terms, privacy, account deletion (Opus low) — needed for Google OAuth verification; can run in parallel with 20/21.
7. 30 design consistency review (Opus) across all screens, fixes, final deploy and browser check.

After each merge: typecheck, lint, test, format, build on main; push; confirm deploy; spot-check the changed screens in the browser.
Commits use the repo-local identity emilia@repo.codes; rebase agent branches if needed.

## Update (27.9.2026, afternoon)

1. 30 design verification (Opus low) — now, before new features.
2. Then in parallel where files allow: 35 Museopassi (Opus low), 36 day planner (Opus low), 22 en/sv (Opus low); 34 Sunday edition (Sonnet, low priority) last.
2a. 39 cost guardrails: kill switch + CPU limit (Sonnet); the user creates the WAF rate-limit rule and billing alerts.
2b. 38 image archive to R2 (Sonnet); needs user-approved R2 bucket and token permission.
3. 37 final verification (Opus low) after everything.
4. Public release: fixtures stay as they are (user decision, 27.9.2026); no history rewrite. MIT licence added.


## Queue after ticket 42 (27.9.2026)

Migrations run one branch at a time, in this order: 41 → 43 → 44 → 45 → 22 → 34. Then 37, the final verification.
