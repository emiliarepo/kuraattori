# 29 Profile sub-pages and calendar entry points
Status: done · Model: Sonnet 5 · Blocked by: 23

`/profile` has become one long form (24 categories × 4 levels, grouped regions, calendar at the bottom). Split it and surface the calendar where users want it.

- **Tabs** in the same style as `MyTabs` (serif/sans text tabs with a rust underline for the active one; no pills), each a real route so back navigation and deep links work:
  - `/profile` → redirects to `/profile/interests`
  - `/profile/interests` "Kiinnostukset": the category weight rows, grouped for scanning (selected ones first, then the rest), with a short line explaining the four levels
  - `/profile/regions` "Alueet": the grouped region list (`groupRegions()`)
  - `/profile/calendar` "Kalenteri": the feed URL, copy button, "Lisää kalenteriin" (webcal) and "Luo uusi osoite"
  - `/profile/account` "Tili": name/email, sign out (and the language choice once ticket 22 lands)
- Onboarding (`/welcome`) keeps its two-step flow but reuses the same interest and region components.
- **Calendar on Omat:** `/my/interested` gets a compact line under the tabs: "Päättymispäivät kalenteriisi →" linking to `/profile/calendar`, or, when a feed exists, a direct "Lisää kalenteriin" webcal link plus "Asetukset".
- Saving stays automatic per change with a polite live-region confirmation ("Tallennettu").
- All new routes `noindex` (like /profile today) and covered by the robots rules.
- Verify at 390/1280 px, light and dark; tab order and focus are correct; back from a sub-tab returns to the previous one.

**Design:** follow `docs/design.md` ("Aikakauslehti"); add a "Profile" entry to the Navigation and screens table.
