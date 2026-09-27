import { type Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

const EXHIBITION_TITLE = "Intervallum";

function rated(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("userExhibition.setRating") && response.ok(),
  );
}

test("rate a visit on the detail page, then change and clear it in Käydyt", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("visit-rating"), "/");
  resetPageClean();
  await page
    .getByRole("link", { name: new RegExp(EXHIBITION_TITLE) })
    .first()
    .click();
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("userExhibition.setStatus"),
    ),
    page
      .getByRole("button", { name: t.ui.status.visited, exact: true })
      .click(),
  ]);

  const up = page.getByRole("button", { name: t.ui.rating.up, exact: true });
  const down = page.getByRole("button", {
    name: t.ui.rating.down,
    exact: true,
  });
  const saved = rated(page);
  await up.click();
  await expect(up).toHaveAttribute("aria-pressed", "true");
  await saved;
  await page.reload();
  await expect(up).toHaveAttribute("aria-pressed", "true");

  await page.goto("/my/visited");
  await expect(up).toHaveAttribute("aria-pressed", "true");
  await Promise.all([rated(page), down.click()]);
  await expect(down).toHaveAttribute("aria-pressed", "true");
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await Promise.all([rated(page), down.click()]);
  await expect(down).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await expect(down).toHaveAttribute("aria-pressed", "false");

  assertPageClean();
});
