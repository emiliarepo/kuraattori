# 42 Museopassi sharing like the web games
Status: done · Model: Opus 5.5 · Blocked by: 35

"Jaa passi" should share the way Wordle, Pokedoku and the LinkedIn games do: one tap opens the native share sheet with the passport image and a short ready-made text.

- **Text** (Finnish, from `fi.ts`, emoji-light): `Museopassi 2026 🏛️ 38/249 museota`, one line of per-region progress, then https://kuraattori.emialis.com.
- **Sharing:** `navigator.share({ files, text, url })` when `canShare({ files })` allows it; otherwise text and URL only. Without Web Share: copy the text to the clipboard, download the image, show "Kopioitu". One click, never two.
- **Image:** reviewed for feed legibility; square 1080×1080 (or 1080×1350 if that reads better) with a big count, the stamp grid and the wordmark, Aikakauslehti, light mode.
- **Privacy:** no user name in the image or text.
- Tests: unit tests for the text builder, a Playwright check that the fallback copies the text.

## Decisions

- **Region line:** the three regions with the most stamps, each with a five-cell bar (`Tampere ▰▰▰▰▰ · Pääkaupunkiseutu ▰▱▱▱▱ · Turku ▰▱▱▱▱ · +1`). Bars scan faster in a feed than `12/40` fractions, and the headline already carries the exact count. A region with any stamp shows at least one filled cell. The year is the current Helsinki year; the counts are all-time, as on the page.
- **Square image.** 4:5 reads better on Instagram, but most places this gets shared (WhatsApp, iMessage, X, LinkedIn) crop or letterbox portrait images, and a square survives all of them. The region line moved from the image to the text, which leaves room for a 200 px count. The grid is capped at 60 stamps (was 120) so stamps stay readable at thumbnail size, and a small collection is centred in the grid area.
- **One tap:** the old button fetched the PNG after the click, so Safari lost the tap's user activation by the time `navigator.share` ran and the first tap failed. The PNG is now fetched when the page loads, and the clipboard write starts before any await.

## Known gaps

- If the tap comes before the prefetch finishes (slow network, big sheet), Safari can still refuse the share; the button then shows "Jakaminen epäonnistui." and a second tap works.
- Some share targets drop the image when `files` and `url` are combined (reported for a few iOS apps); not verified on a real phone here.
