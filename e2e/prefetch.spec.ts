import { expect, test } from "./fixtures";

test("list links prefetch on intent, not on sight", async ({ page }) => {
  const prefetched: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.searchParams.has("_rsc") &&
      url.pathname.startsWith("/exhibitions/")
    )
      prefetched.push(url.pathname);
  });

  await page.goto("/feed");
  await page.waitForLoadState("networkidle");
  expect(prefetched).toEqual([]);

  const card = page.locator('main a[href^="/exhibitions/"]').first();
  const href = (await card.getAttribute("href"))!;
  await card.hover();
  await expect.poll(() => prefetched).toContain(href);
});
