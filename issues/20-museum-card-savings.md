# 20 Museokortti savings tracker
Status: todo · Model: Sonnet 5 · Blocked by: 14, 15

Show how much the user has saved with the Museum Card: sum of adult admission prices of their visited exhibitions.

- Importer: parse the admission price text from detail pages (e.g. "23/13/0 €", "12 €", "Vapaa pääsy", ranges, "sis. museon pääsymaksuun"). Store the raw text plus parsed `admission_adult_cents` (nullable) on the museum or exhibition, whichever the source attaches it to. Migration. Report parse coverage from a real import (how many parsed / unparsed, with examples of unparsed).
- `/my/visited` header: "Olet säästänyt 184 € Museokortilla vuonna 2026" (year selector if visits span years), counting only visits with a card-eligible venue and a parsed price; list visits that couldn't be priced as "hinta ei tiedossa". Never guess a price.
- Tests from real fixture strings for the parser.
