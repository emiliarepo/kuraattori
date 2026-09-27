# 16 Calendar export for interested exhibitions
Status: todo · Model: GPT-6 Luna · Blocked by: 12

Let users see end dates of their Kiinnostaa exhibitions in their own calendar.

- A per-user private subscription feed: `/api/calendar/[token].ics` where `token` is a random, revocable secret stored per user (new column or table, migration). No session needed for the feed so calendar apps can poll it.
- One all-day event per interested exhibition on its last day: "Päättyy: <title>", location "<museum>, <city>", description with dates and the exhibition URL. Exhibitions without an end date are skipped. Stable UIDs so updates replace events.
- `/profile` shows the feed URL with a copy button, "Lisää kalenteriin" (webcal:// link) and "Luo uusi osoite" to rotate the token.
- Valid iCalendar (RFC 5545: CRLF, line folding, escaping); verify with an .ics validator or by importing into a calendar app, and add a unit test for escaping/folding.
