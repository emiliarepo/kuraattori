import { expect, test } from "./fixtures";

const kiasmaMapDestination =
  /(?:maps\.apple\.com\/\?q=|google\.com\/maps\/search\/\?api=1&query=)Nykytaiteen%20museo%20Kiasma%2C%20Mannerheiminaukio%202%2C%2000100%20Helsinki/;

test("exhibition detail page shows a TimeBar and similar exhibitions", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/feed");
  await page
    .getByRole("link", { name: /Oliver Beer/ })
    .first()
    .click();

  await expect(
    page.getByRole("heading", { name: /Oliver Beer/, level: 1 }),
  ).toBeVisible();
  await expect(page.locator("aside").getByRole("progressbar")).toBeVisible();
  await expect(page.locator("aside")).toContainText(
    "Mannerheiminaukio 2, 00100 Helsinki",
  );
  await expect(
    page.getByRole("link", {
      name: "Näytä kartalla: Nykytaiteen museo Kiasma",
    }),
  ).toHaveAttribute("href", kiasmaMapDestination);

  const similar = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Samankaltaisia" }) });
  await expect(similar.getByRole("link").first()).toBeVisible();

  assertPageClean();
});

test("museum page shows its visit address and map link", async ({
  page,
  assertPageClean,
}) => {
  await page.goto("/museums/nykytaiteen-museo-kiasma");
  await expect(
    page.getByText("Mannerheiminaukio 2, 00100 Helsinki"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Näytä kartalla: Nykytaiteen museo Kiasma",
    }),
  ).toHaveAttribute("href", kiasmaMapDestination);
  assertPageClean();
});
