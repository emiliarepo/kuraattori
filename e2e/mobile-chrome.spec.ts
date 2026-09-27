import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

test.use({ viewport: { width: 390, height: 844 } });

test("profile tabs scroll sideways only", async ({ page }) => {
  await devSignIn(page, uniqueEmail("profile-tabs"), "/settings/interests");
  const tabs = page.getByRole("navigation", { name: t.ui.nav.profile });
  const overflow = await tabs.evaluate(
    (nav) => nav.scrollHeight - nav.clientHeight,
  );
  expect(overflow).toBe(0);
});

test("the bottom bar adds no extra padding outside the installed app", async ({
  page,
}) => {
  await page.goto("/");
  const paddingBottom = await page
    .locator("nav")
    .filter({ has: page.getByRole("link", { name: t.ui.nav.browse }) })
    .last()
    .evaluate((nav) => getComputedStyle(nav).paddingBottom);
  expect(paddingBottom).toBe("0px");
});

test("Omat tabs fit or scroll sideways, never vertically", async ({ page }) => {
  await devSignIn(page, uniqueEmail("my-tabs"), "/my/visited");
  const tabs = page.getByRole("navigation", { name: t.ui.nav.mine });
  const box = await tabs.evaluate((nav) => ({
    vertical: nav.scrollHeight - nav.clientHeight,
    right: nav.getBoundingClientRect().right,
  }));
  expect(box.vertical).toBe(0);
  expect(box.right).toBeLessThanOrEqual(390);
});
