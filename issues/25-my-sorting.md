# 25 Sorting on the Omat tabs
Status: todo · Model: GPT-6 Sol · Blocked by: 23

Each Omat tab gets a small sort control (sans `text-kicker` label "Järjestys" + a native `<select>` in the Forms style, or a short row of text buttons; no pills). The choice lives in the URL (`?sort=…`) so it survives reload and back navigation (ticket 23), and the default needs no parameter.

| Tab | Options (default first) |
|---|---|
| Kiinnostavat | Päättyy ensin (current and upcoming by end date; open-ended last; ended ones in a separate "Päättyneet" group at the bottom) · Lisätty viimeksi (`created_at` desc) · Avautuu ensin (upcoming first by start date) · Nimi A–Ö |
| Käydyt | Käyty viimeksi (`visited_at` desc) · Käyty ensin · Nimi A–Ö |
| Piilotetut | Piilotettu viimeksi (`updated_at` desc) · Nimi A–Ö |

- Names sort with `Intl.Collator("fi-FI")` (Å, Ä, Ö after Z).
- Sorting happens on the server in the `my` router (validated enum per tab), not by re-sorting a partial page on the client.
- Tests: each ordering including ties (stable by id), and Finnish collation.

**Design:** follow `docs/design.md` ("Aikakauslehti"); the control sits right-aligned in the tab header row at 1280 px and on its own line under the tabs at 390 px.
