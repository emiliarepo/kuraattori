# 22 English and Swedish UI
Status: todo · Model: Opus 5.5 (low effort) · Blocked by: 13–21 (lowest priority, last)

Add `en` and `sv` alongside `fi`, with a language choice on `/profile`.

- **Strings:** `src/i18n/en.ts` and `src/i18n/sv.ts` with exactly the same shape as `fi.ts`. Derive the type from `fi.ts` (`typeof fi`, widened to string values) so a missing or extra key is a type error. Translate everything a user sees, including date and relative-time formatting through `Intl` with `en-FI` / `sv-FI`, and the TimeBar and urgency labels ("3 days left", "3 dagar kvar"). Keep proper nouns (museum names, category names from museot.fi) as the source provides them.
- **Locale resolution:** signed-in user's saved choice → `kuraattori_locale` cookie → `fi`. Don't guess from `Accept-Language` (the audience is Finnish-first). `<html lang>` follows the locale.
- **Profile:** on `/profile/account` (ticket 29), a "Kieli / Language / Språk" control with Suomi, English, Svenska, in the Forms style. Signed-in users persist it (new `users.locale` column, migration); anonymous users get the cookie. Also reachable from the sign-in page footer.
- **Import translations first:** the importer never fills `title_en/sv` or `description_en/sv`. museot.fi has English and Swedish versions of the calendar (check the language switch links on a detail page, e.g. `en.php` / `sv` variants, and the per-exhibition URLs); fetch those detail pages for exhibitions, respecting the existing rate limit, and store the translated title/description when present. Save fixtures and test the parser.
- **Content:** where an exhibition has `title_en`/`title_sv` or `description_en`/`description_sv`, show them in that locale, otherwise fall back to Finnish with `lang="fi"` on the element. Report how many exhibitions have en/sv content in the current data.
- **URLs stay the same** (no `/en/` prefixes). Metadata uses the resolved locale; the sitemap stays Finnish.
- Tests: the type-level key parity (a `satisfies` check compiled in CI is enough), the resolution order, and the date/relative-time formatting for each locale.
