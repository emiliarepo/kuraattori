import { expect, test } from "./fixtures";

for (const [browserLocale, lang] of [
  ["sv-SE", "sv"],
  ["de-DE", "en"],
  ["fi-FI", "fi"],
] as const) {
  test.describe(`a ${browserLocale} browser`, () => {
    test.use({ locale: browserLocale });

    test(`gets ${lang} until a language is chosen`, async ({
      page,
      context,
    }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", lang);

      await context.addCookies([
        { name: "kuraattori_locale", value: "fi", url: page.url() },
      ]);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "fi");
    });
  });
}

test.describe("an English browser", () => {
  test.use({ locale: "en-GB" });

  test("sees the capital region under its English name", async ({ page }) => {
    await page.goto("/");
    await page.locator("header button[aria-haspopup]").first().click();
    await expect(
      page.getByRole("dialog").getByText("Helsinki region", { exact: true }),
    ).toBeVisible();
  });
});
