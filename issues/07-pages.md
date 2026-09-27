# 07 Pages: Koti, Selaa, näyttely, museot, Omat
Status: done · Model: Sonnet 5 · Blocked by: 04, 05, 06

The screens in `docs/design.md` using the 04 components and 05 routers, server components by default. Museokortti per design.md (exception-only marker; the filter is hidden when every exhibition is eligible). The Selaa filters live in the URL, with a mobile bottom sheet (accessible dialog) and a desktop sidebar. StatusActions wired to setStatus with optimistic updates and a live-region announcement. Omat tabs with history including ended exhibitions. Empty, error and stale-data states (show "Tiedot päivitetty <date>" from the latest successful import_run). Walk the spec §30 MVP flow end to end in the browser against local D1 and record the result.
