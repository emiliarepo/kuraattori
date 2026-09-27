import { e2eToday } from "./clock";
import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("old profile paths redirect to settings and the year review", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("settings-routes"), "/");
  await page.goto("/profile/regions");
  await expect(page).toHaveURL(/\/settings\/regions$/);
  await page.goto(`/profile/year/${Number(e2eToday().slice(0, 4))}`);
  await expect(page).toHaveURL(/\/my\/year\/\d{4}$/);
});

test("the year review is a tab under Omat", async ({ page }) => {
  await devSignIn(page, uniqueEmail("year-tab"), "/my/visited");
  const tabs = page.getByRole("navigation", { name: t.ui.nav.mine });
  await tabs.getByRole("link", { name: t.pages.my.yearTab }).click();
  await expect(page).toHaveURL(/\/my\/year/);
  await expect(
    page.getByRole("navigation", { name: t.ui.nav.profile }),
  ).toHaveCount(0);
});
