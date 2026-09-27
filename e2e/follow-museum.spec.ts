import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test("follow a museum from its page, then see it on the home rail", async ({
  page,
  assertPageClean,
  resetPageClean,
}) => {
  await devSignIn(
    page,
    uniqueEmail("follow"),
    "/museums/nykytaiteen-museo-kiasma",
  );
  resetPageClean();

  const follow = page.getByRole("button", {
    name: "Seuraa: Nykytaiteen museo Kiasma",
  });
  await follow.click();
  await expect(
    page.getByRole("button", {
      name: "Lopeta seuraaminen: Nykytaiteen museo Kiasma",
    }),
  ).toBeVisible();

  await page.goto("/");
  const rail = page.locator("section").filter({
    has: page.getByRole("heading", { name: t.pages.home.followedMuseums }),
  });
  await expect(rail.getByRole("link").first()).toBeVisible();
  await expect(
    rail.getByText("Nykytaiteen museo Kiasma").first(),
  ).toBeVisible();

  assertPageClean();
});
