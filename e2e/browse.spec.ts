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
  const exhibitionRows = page.getByRole("main").locator("ul > li");
  await expect(exhibitionRows.first()).toBeVisible();
  for (const row of await exhibitionRows.all())
    await expect(row).toContainText("Nykytaide");

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

test("load more keeps the scroll position and focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("/exhibitions");
  const loadMore = page.getByRole("button", { name: t.pages.browse.loadMore });
  await loadMore.scrollIntoViewIfNeeded();
  const rows = page.getByRole("main").locator("ul > li");
  const before = await rows.count();
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);

  await loadMore.click();

  await expect(rows).not.toHaveCount(before);
  await expect(page).toHaveURL(/page=2/);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect(loadMore).toBeFocused();
});

test("a city filter overrides the masthead region", async ({ page }) => {
  await page.goto("/exhibitions");
  const byline = await page
    .getByRole("main")
    .locator("ul > li p.italic")
    .first()
    .textContent();
  const city = byline!.split(", ").at(-1)!;
  const capital = ["Helsinki", "Espoo", "Vantaa", "Kauniainen"];
  const otherRegion = capital.includes(city) ? "Tampere" : "Pääkaupunkiseutu";

  await page.getByRole("button", { name: t.ui.region.allRegions }).click();
  const dialog = page.getByRole("dialog", { name: t.ui.region.sheetTitle });
  await dialog.getByRole("checkbox", { name: otherRegion }).check();
  await page.waitForLoadState("networkidle");

  await page.goto(`/exhibitions?city=${encodeURIComponent(city)}`);
  await expect(page.getByRole("main").locator("ul > li").first()).toContainText(
    city,
  );
});

test("load more pages across two masthead regions", async ({ page }) => {
  await page.goto("/exhibitions");
  await page.getByRole("button", { name: t.ui.region.allRegions }).click();
  const dialog = page.getByRole("dialog", { name: t.ui.region.sheetTitle });
  for (const region of ["Pääkaupunkiseutu", "Tampere"]) {
    await dialog.getByRole("checkbox", { name: region }).check();
  }
  await expect(
    page.getByRole("button", { name: t.ui.region.regionCount(2) }),
  ).toBeVisible();

  await page.goto("/exhibitions");
  const rows = page.getByRole("main").locator("ul > li");
  const before = await rows.count();
  await page.getByRole("button", { name: t.pages.browse.loadMore }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(rows).not.toHaveCount(before);
});
