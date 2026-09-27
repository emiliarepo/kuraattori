# 36 Museum day planner ("Museopäivä")
Status: todo · Model: Opus 5.5 (low effort) · Blocked by: 30

Plan a day of visits in one city: pick exhibitions, get a sensible walking order.

- **Coordinates:** geocode museum addresses (ticket 33) during the import with OpenStreetMap Nominatim: only for museums with an address and no coordinates yet, max 1 request/second, identifying User-Agent (`KuraattoriBot/0.1 (+https://kuraattori.emialis.com; hi@emialis.com)`), cache results in `museums.latitude/longitude`, never at request time. Add the required OSM/Nominatim attribution to `/privacy` or a footer credit where maps data is used. Report coverage.
- **Planner** `/trip/day?city=…&date=…` (linked from travel mode and from a city on the museum pages): candidates are the user's Kiinnostaa exhibitions open on that date in that city (plus a "Lisää" picker from all open exhibitions there). The user selects 2–6.
- **Ordering:** nearest-neighbour from the first chosen stop, improved with 2-opt, on straight-line (haversine) distances; show each leg as "≈ 12 min kävellen" (5 km/h) and a total. No routing API.
- **Output:** a numbered itinerary in the Aikakauslehti style (stop number as a large serif numeral, exhibition, museum, address, the leg to the next stop), a "Näytä reitti" link that opens Apple Maps on Apple devices / Google Maps elsewhere with the stops as waypoints (reuse ticket 33's platform detection), and "Lisää kalenteriin" (.ics with one event per stop, 90 min each, starting 11:00, editable start time).
- Museums without coordinates still appear, marked "sijainti ei tiedossa", placed last.
- Tests: ordering on a fixed set of coordinates, leg-time maths, waypoint URL building for both map providers.

**Design:** follow `docs/design.md`; mobile first.
