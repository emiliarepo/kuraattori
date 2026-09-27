# 47 Postmark ring text runs in a straight line
Status: done

The Museopassi postmark should read "KURAATTORI" around the ring, like a real postmark. In the share image (`/my/passport/share.png`) it was a flat, tiny line of text above the date.

## Root cause

Commit 733af9a (ticket 35, "share PNG loads fonts in dev and keeps the postmark legible") replaced the share image's ring with a single flat `<div>`. None of the suspects (d8e4350, ticket 22, ticket 37, ticket 46) caused it. The web `Stamp` component still draws the ring with an SVG `<textPath>` on an arc, and it renders correctly on `/dev/components` and `/my/passport`.

The earlier ring had two problems. Its letters were 11.5° apart at radius 16.5, which is 3.3 units per 5-unit glyph, so they overlapped. Satori also rotates nested absolute elements wrongly: each glyph `<div>` with its own `rotate()` lands in the wrong place once it sits inside the offset, rotated stamp box. Changing `transformOrigin` or positioning each glyph by trigonometry did not help.

## Fix

The share image draws the ring inside the stamp-body SVG, which resvg renders with correct SVG transforms. `ring-glyphs.ts` stores the Inter 600 outlines for the letters of "KURAATTORI" (the text is fixed and not translated). Each glyph is placed with `rotate() translate() scale()` using the same radius (14.8), font size (4.4) and letter spacing (1) as the web `<textPath>`. Advance widths centre the text on the arc. The web component is unchanged.

Stamp labels are unaffected, so genitive names stay whole and long and short names keep their sizes in every locale. The ring text is the brand name, so it is the same in all three locales.

## Test

`e2e/passport.spec.ts`: on `/my/passport` the ring is a `<textPath>` whose `href` resolves to an arc `<path>` in the same SVG. In the share PNG, the upper annulus between the two postmark circles holds ring ink. The old flat text measured 16 ink pixels there; the threshold is 150.
