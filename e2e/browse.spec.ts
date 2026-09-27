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

test.describe("mobile filter sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("applies on the first submit and back returns to the unfiltered list", async ({
    page,
  }) => {
    await page.goto("/exhibitions");
    await page
      .getByRole("button", { name: t.pages.browse.openFilters })
      .click();
    const sheet = page.getByRole("dialog", { name: t.pages.browse.filters });
    await sheet.getByRole("checkbox").first().check();
    await sheet
      .getByRole("button", { name: t.pages.browse.applyFilters })
      .click();

    await expect(page).toHaveURL(/\/exhibitions\?.+/);
    await expect(sheet).toBeHidden();

    await page.goBack();
    await expect(page).toHaveURL(/\/exhibitions$/);
  });
});
