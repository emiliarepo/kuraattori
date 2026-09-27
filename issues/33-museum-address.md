# 33 Museum address and map link
Status: todo · Model: GPT-6 Sol · Blocked by: 20

`museums.address`, `latitude` and `longitude` exist but are never filled. museot.fi museum pages (`/museohaku/index.php?museo_id=N`, linked from exhibition detail pages) list a street address.

- Importer: fetch each museum page once (only for museums without an address or whose page changed; polite rate limit, identifying User-Agent), parse the street address and postal code/city, store in `address`. Leave latitude/longitude null unless the page exposes coordinates; don't call a geocoding service.
- Museum page and exhibition detail: show the address as text plus a "Näytä kartalla" link that opens **Apple Maps on Apple devices and Google Maps everywhere else**:
  - Apple (iPhone, iPad, Mac): `https://maps.apple.com/?q=<encoded name, address>` (opens the Maps app on Apple platforms).
  - Others: `https://www.google.com/maps/search/?api=1&query=<encoded name, address>`.
  - Decide in the browser, not on the server: render the Google link in the HTML, and a tiny client component switches `href` to Apple Maps after mount when `navigator.userAgent`/`navigator.platform` indicate iOS, iPadOS (iPads report "Macintosh" with touch: check `navigator.maxTouchPoints > 1`) or macOS. This keeps server output identical for everyone (no cache variation, no hydration mismatch) and works without JavaScript (falls back to Google Maps).
  - `target="_blank" rel="noopener noreferrer"`, and an accessible name like "Näytä kartalla: <museum>". No map component, no third-party script.
  - Unit-test the platform detection with a few real UA strings (iPhone Safari, iPad Safari desktop-mode, macOS Safari/Chrome, Android Chrome, Windows Chrome).
- Save a museot.fi museum page fixture and test the parser on it; report how many museums got an address in a real local import.
