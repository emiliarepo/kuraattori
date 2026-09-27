import { expect, test } from "./fixtures";
import { t } from "../src/i18n/fi";

test("anonymous home renders every rail", async ({ page, assertPageClean }) => {
  await page.goto("/");

  await expect(page.getByText(t.pages.signIn.home)).toBeVisible();

  for (const title of [
    t.pages.home.endingSoon,
    t.pages.home.new,
    t.pages.home.upcoming,
  ]) {
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: title }) });
    await expect(section.getByRole("link").first()).toBeVisible();
  }

  assertPageClean();
});
