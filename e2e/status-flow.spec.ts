import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

const EXHIBITION_TITLE = "Intervallum";

test("heart from a rail, then mark Käyty on the detail page", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("status-flow"), "/");
  resetPageClean();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("userExhibition.setStatus") &&
        response.request().method() === "POST",
    ),
    page
      .getByRole("button", {
        name: new RegExp(`Kiinnostaa: ${EXHIBITION_TITLE}`),
      })
      .first()
      .click(),
  ]);

  await page.goto("/my/interested");
  await expect(
    page.getByRole("link", { name: new RegExp(EXHIBITION_TITLE) }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: new RegExp(EXHIBITION_TITLE) })
    .first()
    .click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("userExhibition.setStatus") &&
        response.request().method() === "POST",
    ),
    page
      .getByRole("button", { name: t.ui.status.visited, exact: true })
      .click(),
  ]);
  await expect(
    page.getByRole("button", { name: t.ui.status.visited, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/my/interested");
  await expect(
    page.getByRole("link", { name: new RegExp(EXHIBITION_TITLE) }),
  ).toHaveCount(0);

  await page.goto("/my/visited");
  await expect(
    page.getByRole("link", { name: new RegExp(EXHIBITION_TITLE) }),
  ).toBeVisible();

  assertPageClean();
});
