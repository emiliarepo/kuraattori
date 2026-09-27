import { expect, test } from "./fixtures";

test("falls back to the archived copy when museot.fi images fail", async ({
  page,
}) => {
  await page.route(/museot\.fi\/.*\.(jpe?g|png|webp|gif)/i, (route) =>
    route.abort(),
  );
  await page.goto("/");
  const archived = page.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith("/img/"),
  );
  await page
    .getByRole("link", { name: /Oliver Beer/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Oliver Beer/, level: 1 }),
  ).toBeVisible();

  const image = page.getByRole("img", { name: /Oliver Beer/ }).first();
  await expect(image).toHaveAttribute(
    "src",
    /^\/img\/exhibitions\/\d+\/[0-9a-f]{40}\.webp$/,
  );
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1200);

  const response = await archived;
  expect(response.headers()["content-type"]).toBe("image/webp");
  expect(response.headers()["cache-control"]).toBe(
    "public, max-age=31536000, immutable",
  );
});

test("returns 404 for an unknown archive key", async ({ request }) => {
  const missing = await request.get("/img/exhibitions/0/missing.webp");
  expect(missing.status()).toBe(404);
});
