import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("dev sign-in, set an interest and a region, then Sinulle shows reasons", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(page, uniqueEmail("sinulle"), "/profile/interests");
  resetPageClean();

  await expect(
    page.getByRole("heading", { name: t.profile.title }),
  ).toBeVisible();
  await page
    .getByRole("radiogroup", { name: "Taide", exact: true })
    .getByRole("radio", { name: t.ui.interest.interested })
    .click();
  await page.goto("/profile/regions");
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
