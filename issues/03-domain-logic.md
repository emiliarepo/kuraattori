# 03 Domain logic: dates, urgency, relevance, user state
Status: todo · Model: Sonnet 5 · Blocked by: 01

Pure functions in `src/domain/` per the Data and domain decisions section of `docs/design.md`: exhibition phase (current/upcoming/ended) in Europe/Helsinki, days remaining, urgency, TimeBar progress, relevance with reasons, Sinulle ranking, and the status transition rules. Add Finnish formatting helpers (`27.9.2026`, `3 päivää jäljellä`, `Päättyy tänään`, `Alkaa 2.10.`) in `src/i18n`.

Focused tests: ends today / tomorrow / already ended / starts in future / missing end date; urgency never lifts a zero-category exhibition above a strongly relevant one; transitions interested→visited, hidden→interested, visited→clear.
