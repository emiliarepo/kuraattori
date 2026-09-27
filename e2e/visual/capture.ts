import { expect, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

import { FROZEN_NOW, VISUAL_BASE_URL } from "./env";

const placeholder = sharp({
  create: { width: 1200, height: 900, channels: 3, background: "#8a6d3b" },
})
  .png()
  .toBuffer();

/**
 * Freezes the browser clock and keeps the page off the network: exhibition
 * images hot-link museot.fi while an exhibition runs, so every external
 * image becomes one local placeholder and any other external request fails.
 */
export async function isolatePage(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(FROZEN_NOW));
  await page.route(
    (url) => url.origin !== VISUAL_BASE_URL,
    async (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ contentType: "image/png", body: await placeholder })
        : route.abort(),
  );
}

/**
 * Screenshots the settled page: fonts loaded, every image (lazy ones forced
 * eager) decoded. A full-page shot grows the viewport to the document height
 * instead of using Playwright's `fullPage`, which stitches fixed elements
 * (the mobile tab bar) into the middle of the page. The import timestamp
 * comes from the seed's real clock, so its text is pinned before capture.
 */
export async function capture(
  page: Page,
  name: string,
  options: { fullPage?: boolean; mask?: Locator[] } = {},
): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map((image) => image.decode().catch(() => undefined)),
    );
  });
  if (options.fullPage ?? true) {
    const viewport = page.viewportSize()!;
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.setViewportSize({ width: viewport.width, height });
  }
  await page.getByText(/^Tiedot päivitetty/).evaluateAll((elements) =>
    elements.forEach((element) => {
      element.textContent = "Tiedot päivitetty 27.9.2026 klo 12.00";
    }),
  );
  await expect(page).toHaveScreenshot(`${name}.png`, {
    mask: options.mask ?? [],
  });
}
