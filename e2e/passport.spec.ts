import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("a visited museum shows a stamp in the Museopassi", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("passport"), "/");
  await page
    .getByRole("link", { name: /Intervallum/ })
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
  resetPageClean();

  await page.goto("/my/passport");
  const stamp = page.getByRole("link", {
    name: /^Museopassi-leima: LUOMUS Kaisaniemen kasvitieteellinen puutarha, Helsinki, käyty \d{1,2}\.\d{1,2}\.\d{4}$/,
  });
  await expect(stamp).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+ museota$/)).toBeVisible();

  await stamp.click();
  await expect(page).toHaveURL(/\/museums\//);

  assertPageClean();
});
