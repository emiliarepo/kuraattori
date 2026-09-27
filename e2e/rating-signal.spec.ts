import { type Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

const LIKED_NYKYTAIDE_SLUGS = [
  "mika-vari",
  "saastamoisen-saation-kokoelmanayttely",
];

async function visitAndLike(page: Page, slug: string) {
  await page.goto(`/exhibitions/${slug}`);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("userExhibition.setStatus"),
    ),
    page
      .getByRole("button", { name: t.ui.status.visited, exact: true })
      .click(),
  ]);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("userExhibition.setRating") && response.ok(),
    ),
    page.getByRole("button", { name: t.ui.rating.up, exact: true }).click(),
  ]);
}

test("two 👍 on Nykytaide visits surface a 'Pidit samankaltaisista' pick on the home page", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("rating-signal"), "/settings/interests");
  resetPageClean();
  await page
    .getByRole("radiogroup", { name: "Taide", exact: true })
    .getByRole("radio", { name: t.ui.interest.interested })
    .click();

  await page.goto("/");
  const liked = page.getByRole("main").getByText(t.pages.home.whyLikedSimilar);
  await expect(page.getByText(t.pages.home.forYou).first()).toBeVisible();
  await expect(liked).toHaveCount(0);

  for (const slug of LIKED_NYKYTAIDE_SLUGS) await visitAndLike(page, slug);

  await page.goto("/");
  await expect(liked.first()).toBeVisible();

  assertPageClean();
});
