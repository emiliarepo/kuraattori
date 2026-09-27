# 38 Archive exhibition images to R2
Status: todo · Model: Sonnet 5 · Blocked by: 30

museot.fi images will disappear once exhibitions leave the source, which would leave past exhibitions, Käydyt, Museopassi and the year in review without images. Keep a resized copy of every exhibition image.

Measured 27.9.2026: 642 exhibitions with images, originals average ~580 KB (~370 MB total). Resized copies fit comfortably in R2's free tier (10 GB storage, free egress).

- **Storage:** an R2 bucket `kuraattori-images` bound to the Worker as `IMAGES_ARCHIVE` (the name `IMAGES` is already taken by the Cloudflare Images binding). The bucket already exists (created 27.9.2026, location hint weur); only add the binding to `wrangler.jsonc`. R2 is enabled on the account and `CLOUDFLARE_API_TOKEN` has Workers R2 Storage: Edit. Keys: `exhibitions/<exhibition id>/<sha1 of source URL>.webp`, so a changed source image gets a new key.
- **Archiving** in the nightly import (GitHub Action): for every exhibition whose source image URL has no archived copy yet, download it (the importer's polite rate limit and User-Agent), resize to max 1200 px on the long edge with `sharp`, encode WebP (quality ~78), and upload through the R2 S3-compatible API or `wrangler r2 object put`. Store `imageArchiveKey`, `imageWidth` and `imageHeight` on the exhibition (migration). A failed download is logged and retried next run, and never fails the import. Report archive coverage in the import summary.
- **Backfill:** the first run archives all current exhibitions. Keep it within the Action's time budget (rate limit about 2/s, so ~6 min for 642), or spread it over several runs with a per-run cap.
- **Serving:** a Worker route `/img/<key>` that streams from R2 with `Cache-Control: public, max-age=31536000, immutable` and the right content type; 404 for unknown keys.
- **Which image to show:** while an exhibition is current or upcoming, keep using the museot.fi URL, and fall back to the archived copy when it fails to load (`ImageFallback` tries archive → typographic placeholder). After the exhibition has ended, use the archived copy directly. Open Graph images use the archived copy when present.
- **Rights:** add a sentence to `/terms` that images belong to the museums and photographers, are shown to present their exhibitions, and are removed on request (contact hi@emialis.com); add a short "Kuvat" note to `/privacy` only if it processes personal data (it doesn't). Support removal: an admin-only script `scripts/remove-image.ts <exhibition id>` that deletes the R2 object and marks the exhibition so it isn't re-archived.
- **Token:** the GitHub Action needs R2 write access. Document the extra permission for `CLOUDFLARE_API_TOKEN` ("Workers R2 Storage: Edit") or separate R2 API credentials as repo secrets, whichever the chosen upload method needs.
- Tests: key derivation, fallback order, the "ended → archived copy" rule; verify in the browser by blocking museot.fi image requests.
