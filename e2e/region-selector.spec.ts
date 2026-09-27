import { expect, test } from "./fixtures";
import { t } from "../src/i18n/fi";

test("region popover stays open and anchored while toggling regions", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/");
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
  }

  assertPageClean();
});
