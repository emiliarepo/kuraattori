import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("user menu closes after following its profile link", async ({ page }) => {
  await devSignIn(page, uniqueEmail("user-menu"));
  await page.goto("/");
  await page
    .locator("header")
    .getByRole("button", { name: /▾/ })
    .first()
    .click();
  await page
    .locator("header")
    .getByRole("dialog")
    .getByRole("link", { name: t.ui.nav.profile })
    .click();
  await page.waitForURL("**/profile/**");
  await expect(page.locator("header").getByRole("dialog")).toHaveCount(0);

  await page.getByRole("link", { name: t.ui.nav.home }).first().click();
  await page.waitForURL((url) => url.pathname === "/");
});
