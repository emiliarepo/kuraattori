# 50 Spacing pass

Status: done · Model: Opus 5.5 (low)

User report: on the year in review (`/my/year/[yyyy]`, moved under the Omat layout) the "2026" heading nearly touches the tab strip. The page kept its old Profiili spacing.

## Method

`e2e/spacing-audit.spec.ts` measures every route, signed in and out, at 390 and 1280 px, light and dark, in fi, en and sv (24 runs). Run it with `SPACING_AUDIT=<tag> pnpm exec playwright test spacing-audit --project e2e`. It writes JSON to `e2e/.tmp/spacing-audit/`. For each page it records:

- the gap from each tab rule to the first painted content (text ink, image, control or rule), and from the H1 to its first content
- vertical gaps under 8 px next to a heading, control, list or section
- framed blocks (a rule, a background, `section`/`header`/`li`) whose top and bottom insets differ by more than 12 px and by more than 2×
- text touching a control, text within 12 px of the viewport edge, and buttons or tab labels that wrap

Text gaps read a few px above the box gap because they include half-leading. The regression test measures boxes.

## Findings and fixes (before → after, px)

| Where                                          | Before                                               | After          | Cause and fix                                                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vuosi, tab rule → kicker                       | 8                                                    | 24             | Omat layout gave the panel `pt-2` and every page added its own top padding. New `TabbedPage` owns H1 `mb-6`, the tabs and a `pt-6` panel for Omat, Asetukset and Matkalla. |
| Museopassi                                     | 32–38                                                | 24–26          | Page `pt-6` removed.                                                                                                                                                       |
| Käydyt (savings header)                        | 24 (8 + `pt-4` + text)                               | 24             | Header `pt-4` removed. Its bottom rule now has 20 px on both sides (`pb-5 mb-5`), like the rules between rows.                                                             |
| Piilotetut / Kiinnostavat list                 | 28                                                   | 24             | `ExhibitionRow` first row drops its top padding (and the status button's `top-5`). This also puts lists 16 px below `Section` headings, as the design says (was 36).       |
| Kiinnostavat calendar link                     | 17                                                   | 25             | `CalendarPrompt` `mt-2` removed.                                                                                                                                           |
| Kiinnostavat signed out                        | 36                                                   | 28             | `SignInPrompt` `py-6` removed. `EmptyState` defaults to no padding too.                                                                                                    |
| Asetukset                                      | 25–27                                                | 25–27          | Already 24 via `gap-6`. Now through `TabbedPage`.                                                                                                                          |
| Matkalla                                       | 36                                                   | 28             | `TripTabs` `mb-8` → shared `pt-6`.                                                                                                                                         |
| Vuosi bottom                                   | `pb-10` + footer `mt-12`                             | footer `mt-12` | Extra bottom padding removed.                                                                                                                                              |
| Päättyneet section on Kiinnostavat             | h2 with no gap above the list                        | `Section`      | Hand-rolled copy of `Section` without `mb-4` replaced by `Section`.                                                                                                        |
| /museums H1 → first museum                     | 41                                                   | 29             | First row `first:pt-0`.                                                                                                                                                    |
| /sign-in H1 → button                           | 32 (`gap-8`)                                         | 24             | H1 `mb-6`, the rest keeps `gap-8`.                                                                                                                                         |
| /exhibitions 390 px, filter button → first row | 36                                                   | 24             | Aside `mb-4` → `mb-6`, needed once the first row lost its padding.                                                                                                         |
| Interest weight buttons at ≥ 640 px            | "Ei kiinnosta" / "Not interested" wrapped to 2 lines | 1 line         | `whitespace-nowrap`, the control doesn't shrink, the category name wraps.                                                                                                  |

## Checked and left as is

- The sort select on Omat sits 8 px under the tabs on mobile. It is part of the tab strip (`py-2`).
- Alueet reads 37 px to the first label because the text sits in the middle of a 44 px checkbox row. The box gap is 24.
- `Section` top 21 / bottom 0 and the trip form top 0 / bottom 33 are the rule pattern (space above a rule belongs to the block before it). Around each rule the gaps match: 32/32 on the trip form, 24/24 on the year header.
- Label → input gaps of 4 px (`gap-1`, `mb-1`) are form labels.
- Rail arrow buttons 8 px from the edge sit over the image by design. Adjacent segmented buttons at 0 px share a border.
- The edition page's region tabs sit 33 px above its H1. That is a masthead-style nav, not a tab panel.

## Regression

`e2e/layout.spec.ts`: "tab pages start their content 24 px below the tab rule" checks the Vuosi kicker at exactly 24 px and requires the same box gap on Kiinnostavat, Käydyt, Museopassi, Vuosi, Asetukset and Matkalla. With the old `pt-2` it fails at 8. The overlap check now covers `/my/year/[yyyy]` and the four settings tabs (it still pointed at the removed `/settings/year`).
