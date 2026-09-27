import { expect, test } from "./fixtures";

test("exhibition detail page shows a TimeBar and similar exhibitions", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /Oliver Beer/ })
    .first()
    .click();

  await expect(
    page.getByRole("heading", { name: /Oliver Beer/, level: 1 }),
  ).toBeVisible();
  await expect(page.locator("aside").getByRole("progressbar")).toBeVisible();

  const similar = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Samankaltaisia" }) });
  await expect(similar.getByRole("link").first()).toBeVisible();

  assertPageClean();
});
