import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { devSignIn, uniqueEmail } from "./dev-sign-in";

const PAGES: { name: string; path: string; requiresAuth?: boolean }[] = [
  { name: "home", path: "/" },
  { name: "browse", path: "/exhibitions" },
  {
    name: "detail",
    path: "/exhibitions/oliver-beer-resonance-project-the-cave",
  },
  { name: "profile", path: "/profile", requiresAuth: true },
];

for (const { name, path, requiresAuth } of PAGES) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${name} has no serious/critical a11y violations (${colorScheme}, 390px)`, async ({
      page,
    }) => {
      if (requiresAuth)
        await devSignIn(page, uniqueEmail(`a11y-${name}`), path);
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).include("body").analyze();
      const serious = results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(
        serious,
        serious
          .map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)
          .join("\n"),
      ).toEqual([]);
    });
  }
}
