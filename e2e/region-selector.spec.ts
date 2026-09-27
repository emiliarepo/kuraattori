import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("region popover stays open and anchored while toggling regions", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/");
  const nav = page.locator("header nav").first();
  const navX = (await nav.boundingBox())!.x;
  await page.getByRole("button", { name: t.ui.region.allRegions }).click();
  const dialog = page.getByRole("dialog", { name: t.ui.region.sheetTitle });
  const checkboxes = dialog.getByRole("checkbox");
  const left = (await dialog.boundingBox())!.x;

  for (const index of [0, 1, 2]) {
    await checkboxes.nth(index).click();
    await expect(checkboxes.nth(index)).toBeChecked();
    await page.waitForLoadState("networkidle");
    await expect(dialog).toBeVisible();
    expect((await dialog.boundingBox())!.x).toBe(left);
    expect((await nav.boundingBox())!.x).toBe(navX);
  }
  await expect(
    page.getByRole("button", { name: t.ui.region.regionCount(3) }),
  ).toBeVisible();

  assertPageClean();
});

test("masthead region label follows a change on the profile page", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("region-sync"));
  await page.goto("/profile/regions");
  const main = page.getByRole("main");
  const name = (await main
    .getByRole("checkbox", { checked: false })
    .first()
    .locator("xpath=..")
    .textContent())!.trim();
  await main.getByRole("checkbox", { name }).click();
  await expect(main.getByText(t.profile.saved)).toBeVisible();
  await expect(
    page.locator("header").getByRole("button", { name: new RegExp(name) }),
  ).toBeVisible();
});

test("clicking outside the region popover closes it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: t.ui.region.allRegions }).click();
  const dialog = page.getByRole("dialog", { name: t.ui.region.sheetTitle });
  await expect(dialog).toBeVisible();
  await page.locator("main").click({ position: { x: 10, y: 10 } });
  await expect(dialog).toBeHidden();
});
