import { expect, test } from "./fixtures";
import { t } from "../src/i18n/fi";

test("browse: a category filter narrows results without a reload", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/exhibitions");
  await page.evaluate(() => {
    (window as unknown as { __e2eMarker?: boolean }).__e2eMarker = true;
  });

  const rows = page.getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  const baselineCount = await rows.count();
  expect(baselineCount).toBeGreaterThan(0);

  await page.getByRole("checkbox", { name: "Nykytaide" }).check();
  await page.getByRole("button", { name: t.pages.browse.applyFilters }).click();

  await expect(page).toHaveURL(/category=/);
  await expect.poll(() => rows.count()).toBeLessThan(baselineCount);
  await expect.poll(() => rows.count()).toBeGreaterThan(0);

  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __e2eMarker?: boolean }).__e2eMarker === true,
  );
  expect(markerSurvived, "filtering should not reload the page").toBe(true);

  assertPageClean();
});
