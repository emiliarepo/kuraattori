# 33 Museum address and map link
Status: todo · Model: GPT-6 Sol · Blocked by: 20

`museums.address`, `latitude` and `longitude` exist but are never filled. museot.fi museum pages (`/museohaku/index.php?museo_id=N`, linked from exhibition detail pages) list a street address.

- Importer: fetch each museum page once (only for museums without an address or whose page changed; polite rate limit, identifying User-Agent), parse the street address and postal code/city, store in `address`. Leave latitude/longitude null unless the page exposes coordinates; don't call a geocoding service.
- Museum page and exhibition detail: show the address as text plus a "Näytä kartalla" link to `https://www.openstreetmap.org/search?query=<encoded address>` (no map component, no third-party script).
- Save a museot.fi museum page fixture and test the parser on it; report how many museums got an address in a real local import.
