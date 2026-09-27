# 22 English and Swedish UI

Status: done · Model: Opus 5.5 (low effort) · Blocked by: 13–21 (lowest priority, last)

Add `en` and `sv` alongside `fi`, with a language choice on `/profile`.

- **Strings:** `src/i18n/en.ts` and `src/i18n/sv.ts` with exactly the same shape as `fi.ts`. Derive the type from `fi.ts` (`typeof fi`, widened to string values) so a missing or extra key is a type error. Translate everything a user sees, including date and relative-time formatting through `Intl` with `en-FI` / `sv-FI`, and the TimeBar and urgency labels ("3 days left", "3 dagar kvar"). Keep proper nouns (museum names, category names from museot.fi) as the source provides them.
- **Locale resolution:** signed-in user's saved choice → `kuraattori_locale` cookie → the browser's top `Accept-Language` (fi → fi, sv → sv, anything else → en; no header → fi). Changed 27.9.2026 at the owner's request. `<html lang>` follows the locale.
- **Profile:** on `/profile/account` (ticket 29), a "Kieli / Language / Språk" control with Suomi, English, Svenska, in the Forms style. Signed-in users persist it (new `users.locale` column, migration); anonymous users get the cookie. Also reachable from the sign-in page footer.
- **Import translations first:** the importer never fills `title_en/sv` or `description_en/sv`. museot.fi has English and Swedish versions of the calendar (check the language switch links on a detail page, e.g. `en.php` / `sv` variants, and the per-exhibition URLs); fetch those detail pages for exhibitions, respecting the existing rate limit, and store the translated title/description when present. Save fixtures and test the parser.
- **Content:** where an exhibition has `title_en`/`title_sv` or `description_en`/`description_sv`, show them in that locale, otherwise fall back to Finnish with `lang="fi"` on the element. Report how many exhibitions have en/sv content in the current data.
- **URLs stay the same** (no `/en/` prefixes). Metadata uses the resolved locale; the sitemap stays Finnish.
- Tests: the type-level key parity (a `satisfies` check compiled in CI is enough), the resolution order, and the date/relative-time formatting for each locale.

## Finnish fallback (added 27.9.2026)

- Every piece of imported content falls back to Finnish on its own when a translation is missing or empty (whitespace only counts as empty): exhibition title, description, museum name, category name and anything else imported. A translated title with a Finnish description is expected and fine. The Finnish element carries `lang="fi"`.
- One pure helper does this (for example `localized(row, "title", locale)`), with unit tests: translation present, missing, empty or whitespace, and Swedish missing while English is present (Swedish falls back to Finnish, not English).
- E2E: in the English locale, an exhibition with no English text still renders its Finnish title and description, not a blank or a key.
- After this merges, the orchestrator triggers one manual import (`import.yml`) to fill in translations and runs a spot check on prod.

## Outcome (27.9.2026)

- **Import requests.** Every run adds 2 requests (the English and Swedish `kaikki=1` listings). Detail pages are fetched only for rows whose listing shows translated text and whose `translation_hash` changed, at the same ~2 req/s limit. In the 27.9.2026 snapshot (642 exhibitions), 425 have English and 264 have Swedish text, so the first full run after this merges makes about **691 extra requests** (≈ 6½ min). Later daily runs make 2 plus a few for new or changed exhibitions. Failed translated pages are retried the next run and don't count toward `items_failed`.
- **Content coverage** (same snapshot): English text for 425 / 642 exhibitions, Swedish for 264 / 642; English museum names for most museums, English and Swedish names for every topic. The production numbers come after the first import.
- **Stays Finnish:** cities, regions, opening-hour notes, admission text, stamp labels and the legal texts (marked `lang="fi"`), the offline page, the day-plan `.ics` download. The calendar feed and closing-soon pushes follow `users.locale`.
- Migration `0012`: nullable `users.locale`, `museums/categories.name_en/sv`, `exhibitions.translation_hash`. The privacy page lists the new `kuraattori_locale` cookie (version 3).
