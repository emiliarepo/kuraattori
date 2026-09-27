import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("the chosen sort stays selected and shows progress while the list reloads", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("my-sort"), "/my/interested");
  const select = page.getByLabel(t.pages.my.sortLabel);
  await expect(select).toHaveValue("ending");

  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    (url) => url.searchParams.has("_rsc"),
    async (route) => {
      await held;
      await route.continue();
    },
  );

  await select.selectOption("name");
  await page.waitForTimeout(500);
  await expect(select).toHaveValue("name");
  await expect(page.getByRole("status")).toHaveText(t.ui.updating);
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(1);

  release();
  await expect(page).toHaveURL(/sort=name/);
  await expect(select).toHaveValue("name");
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
});
