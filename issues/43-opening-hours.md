# 43 Opening hours and free days
Status: todo · Model: Opus 5.5 (low) · Blocked by: 41 (migration order)

museot.fi museum pages carry weekly hours in a regular block (`fixtures/museot/museum-21118.html`: "Aukioloajat Ma Suljettu Ti 10:00-20:00 … Su 10:00-17:00"). The museum's event list also names free days ("Kiasman ilmaispäivä 2.10.2026").

- **Import:** parse the weekly hours into structured per-weekday open/close times (or closed), stored per museum. If the block is missing or unparseable, keep the previous value and log it; never guess. Parse upcoming events whose title matches `ilmais|maksuton` into free-day dates per museum. Skip anything fuzzier.
- **Museum page:** an "Aukioloajat" list with today highlighted, plus "Seuraava ilmaispäivä 2.10." when known.
- **Exhibition page:** one meta row, "Avoinna tänään 10–18" / "Suljettu tänään", using the Helsinki date, plus the free-day line when one falls within the next 14 days.
- **Day planner (`/trip/day`):** skip or clearly warn about museums closed on the chosen day, and fit the itinerary's times inside the opening hours.
- Parser unit tests against the fixture (add one or two more museum fixtures with unusual hours if the importer finds them), plus Playwright checks for the page rows.
