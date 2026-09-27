import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

const personalHeading = { name: t.landing.personal.title };

test("anonymous / is the landing page, with its actions above the fold on a phone", async ({
  page,
  assertPageClean,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: t.app.name }),
  ).toBeVisible();
  await expect(page.getByRole("heading", personalHeading)).toBeAttached();

  const tabBarTop = (await page
    .getByRole("navigation", { name: t.ui.nav.main })
    .boundingBox())!.y;
  for (const name of [t.landing.browse, t.landing.signIn]) {
    const box = (await page
      .getByRole("link", { name, exact: true })
      .first()
      .boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(tabBarTop);
  }

  assertPageClean();
});

test("Selaa näyttelyitä opens the feed on the first click", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: t.landing.browse }).first().click();

  await expect(page).toHaveURL("/feed");
  await expect(
    page.getByRole("heading", { name: t.pages.home.endingSoon }),
  ).toBeVisible();
});

test("/feed shows the feed to anonymous visitors", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText(t.pages.signIn.home)).toBeVisible();
  await expect(page.getByRole("heading", personalHeading)).toHaveCount(0);
});

test("signed in, / and /feed both show the feed", async ({ page }) => {
  await devSignIn(page, uniqueEmail("landing"), "/feed");
  for (const path of ["/", "/feed"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: t.pages.home.endingSoon }),
    ).toBeVisible();
    await expect(page.getByRole("heading", personalHeading)).toHaveCount(0);
  }
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
]) {
  test(`Koti goes to /feed and the logo to / at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/exhibitions");
    const nav = page.getByRole("navigation", { name: t.ui.nav.main });
    await nav.getByRole("link", { name: t.ui.nav.home }).click();
    await expect(page).toHaveURL("/feed");
    await expect(
      nav.getByRole("link", { name: t.ui.nav.home }),
    ).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: t.app.name, exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", personalHeading)).toBeVisible();
  });
}
