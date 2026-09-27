# 14 Duplicate and non-exhibition listings
Status: done · Model: Sonnet 5 · Blocked by: 12

Two data-quality problems in the museot.fi feed:

1. **Same exhibition at several venues.** E.g. "Metallikausi" is listed for both Oulun museo and Tiima (same title, same dates, same description). Keep one exhibition record per source listing (traceability), but group them for display: add an `exhibition_group` key computed in the importer (normalized title + start + end + description hash). Lists and rails show one entry per group with "Oulun museo, Tiima" as venues in the card/row byline (museum names joined with ", ", then city); the detail page lists all venues. User status set on any member applies to the group (store on the member the user acted on; read status across the group).
2. **Listings that aren't exhibitions**, e.g. "suljettu näyttelyn vaihdon ajan". Mark them in the importer with a small explicit pattern list (`suljettu`, `kiinni`, `näyttelyn vaihto`, ...) as `kind = 'notice'` and exclude them from all lists; keep them in the DB. Report the matched titles from a real import so false positives can be reviewed.

Schema change with a drizzle migration. Tests from fixtures: grouping of the two Metallikausi rows, notice detection, and that unrelated same-title exhibitions with different dates don't group.

**Design:** follow `docs/design.md` ("Aikakauslehti"): tokens only, Newsreader/Inter via existing utilities (`text-headline`, `text-kicker`, `rail`), existing components (`Section`, `Rail`, `ExhibitionCard`, `ExhibitionRow`, `EmptyState`, `TimeBar`, `UrgencyLabel`); no chips, pills, shadows or rounded cards. Check 390 px and 1280 px in light and dark.
