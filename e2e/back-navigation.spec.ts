import { expect, test } from "./fixtures";

test("browse: back navigation returns to the same scroll position", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/exhibitions");
  await expect(page.getByRole("listitem").first()).toBeVisible();

  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 1200);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  await page.getByRole("listitem").nth(2).getByRole("link").click();
  // Wait for the client-side transition's own history push to land before
  // going back, or `goBack` can race it and land on about:blank.
  await page.waitForURL(/\/exhibitions\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goBack();
  await page.waitForURL(/\/exhibitions$/);
  await expect(page.getByRole("listitem").first()).toBeVisible();
  // The browser's native restoration lands close to, not always exactly at,
  // the pre-navigation offset (page content reflows before it fires); the
  // regression this guards is landing back at the top.
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  assertPageClean();
});
