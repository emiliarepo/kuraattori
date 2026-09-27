import { expect, test } from "./fixtures";
import { t } from "../src/i18n/fi";

test("the anonymous feed links to the capital region's Sunday edition", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/feed");
  await page.getByRole("link", { name: t.pages.home.thisWeeksEdition }).click();

  await expect(page).toHaveURL(
    /\/edition\/paakaupunkiseutu\/\d{4}-\d{2}-\d{2}$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: t.pages.edition.name }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Pääkaupunkiseutu · \d+\.\d+\.\d{4}$/),
  ).toBeVisible();
  for (const title of [
    t.pages.edition.endingThisWeek,
    t.pages.edition.openingThisWeek,
    t.pages.edition.archive,
  ])
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const archive = page.locator("section").filter({
    has: page.getByRole("heading", { name: t.pages.edition.archive }),
  });
  await expect(archive.locator("[aria-current=page]")).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

  assertPageClean();
});

test("switching region keeps the page and shows the pending state", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/edition/paakaupunkiseutu");
  await page
    .getByRole("navigation", { name: t.pages.edition.regions })
    .getByRole("link", { name: "Tampere" })
    .click();
  await expect(page).toHaveURL(/\/edition\/tampere\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText(/^Tampere · /)).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: t.pages.edition.regions })
      .getByRole("link", { name: "Tampere" }),
  ).toHaveAttribute("aria-current", "page");
  assertPageClean();
});

test("unknown regions and non-Sunday dates are not found", async ({ page }) => {
  for (const path of ["/edition/oulu", "/edition/turku/2026-09-28"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: t.pages.notFound.title }),
    ).toBeVisible();
  }
});

test("the sitemap lists the editions", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  expect(body).toContain("/edition/tampere");
});
