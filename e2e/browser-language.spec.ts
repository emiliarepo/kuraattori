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
