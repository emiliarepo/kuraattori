import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("the feed's two shortcuts show for signed-in users and look alike", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await devSignIn(page, uniqueEmail("shortcuts"), "/feed");
  const main = page.getByRole("main");
  const nearby = main.getByRole("link", {
    name: new RegExp(t.pages.nearby.banner),
  });
  const edition = main.getByRole("link", {
    name: new RegExp(t.pages.home.thisWeeksEdition),
  });
  await expect(nearby).toBeVisible();
  await expect(edition).toBeVisible();
  const style = (link: typeof nearby) =>
    link
      .locator("span")
      .first()
      .evaluate((span) => {
        const s = getComputedStyle(span);
        return [s.fontFamily, s.fontSize, s.fontStyle].join(" / ");
      });
  expect(await style(edition)).toBe(await style(nearby));
});
