import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("dev sign-in, set an interest and a region, then Sinulle shows reasons", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("sinulle"), "/settings/interests");
  resetPageClean();

  await expect(
    page.getByRole("heading", { name: t.profile.title }),
  ).toBeVisible();
  await page
    .getByRole("radiogroup", { name: "Taide", exact: true })
    .getByRole("radio", { name: t.ui.interest.interested })
    .click();
  await page.goto("/settings/regions");
  await page.getByRole("checkbox", { name: "Pääkaupunkiseutu" }).check();

  await page.goto("/");
  const forYou = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: t.pages.home.forYou }) });
  await expect(forYou.getByRole("link").first()).toBeVisible();
  // Every "Sinulle" card carries a rust "why" kicker line above the title.
  await expect(forYou.getByText("Taide").first()).toBeVisible();

  assertPageClean();
});

test("Sinulle follows the region choice, and its Kaikki list shows the same picks", async ({
  page,
}) => {
  await devSignIn(page, uniqueEmail("sinulle-region"), "/settings/interests");
  await page
    .getByRole("radiogroup", { name: "Taide", exact: true })
    .getByRole("radio", { name: t.ui.interest.interested })
    .click();
  await expect(page.getByText(t.profile.saved)).toBeVisible();
  await page.goto("/settings/regions");
  await page.getByRole("checkbox", { name: "Pääkaupunkiseutu" }).check();
  await expect(page.getByText(t.profile.saved)).toBeVisible();

  await page.goto("/feed/for-you");
  const rows = page.getByRole("main").locator("ul > li");
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all())
    await expect(row).toContainText(/Helsinki|Espoo|Vantaa|Kauniainen/);
});

test("Uudet näyttelyt has a Kaikki list", async ({ page }) => {
  await page.goto("/feed");
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: t.pages.home.new }) })
    .getByRole("link", { name: t.pages.home.seeAll })
    .click();
  await expect(page).toHaveURL(/\/feed\/new$/);
  await expect(page.getByRole("main").locator("ul > li").first()).toBeVisible();
});
