import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { t } from "../src/i18n/fi";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

/**
 * Reports text that the layout cuts off without an ellipsis, leaf text boxes
 * that overlap a sibling's, and page-level horizontal overflow. Deliberate
 * truncation (`text-overflow: ellipsis`, line clamps) is not a finding.
 */
async function layoutFindings(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const findings: string[] = [];
    const label = (element: Element) =>
      `<${element.tagName.toLowerCase()}> "${(element.textContent ?? "").trim().slice(0, 40)}"`;

    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      findings.push(
        `page overflows horizontally: ${document.documentElement.scrollWidth}px`,
      );
    }

    const textElements = [
      ...document.querySelectorAll<HTMLElement>("main *, footer *"),
    ].filter((element) => {
      if (element.getClientRects().length === 0) return false;
      return [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
    });

    for (const element of textElements) {
      const style = getComputedStyle(element);
      const intentional =
        style.textOverflow === "ellipsis" ||
        style.webkitLineClamp !== "none" ||
        element.closest(".sr-only") !== null;
      if (intentional) continue;
      const clipsX = style.overflowX !== "visible";
      const clipsY = style.overflowY !== "visible";
      if (
        (clipsX && element.scrollWidth > element.clientWidth + 1) ||
        (clipsY && element.scrollHeight > element.clientHeight + 1)
      ) {
        findings.push(`clipped text: ${label(element)}`);
      }
    }

    for (const element of textElements) {
      const parent = element.parentElement;
      if (!parent) continue;
      const box = element.getBoundingClientRect();
      for (const sibling of parent.children) {
        if (
          sibling === element ||
          !textElements.includes(sibling as HTMLElement)
        )
          continue;
        if (
          element.compareDocumentPosition(sibling) &
          Node.DOCUMENT_POSITION_PRECEDING
        )
          continue;
        const other = sibling.getBoundingClientRect();
        const overlapX =
          Math.min(box.right, other.right) - Math.max(box.left, other.left);
        const overlapY =
          Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
        if (overlapX > 1 && overlapY > 1) {
          findings.push(`overlap: ${label(element)} and ${label(sibling)}`);
        }
      }
    }
    return findings;
  });
}

for (const viewport of VIEWPORTS) {
  test(`no clipped or overlapping text at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await devSignIn(page, uniqueEmail("layout"), "/exhibitions");

    const detailHref = await page
      .locator('main a[href^="/exhibitions/"]')
      .first()
      .getAttribute("href");
    expect(detailHref).not.toBeNull();
    await page.goto(detailHref!);
    await page
      .getByRole("button", { name: t.ui.status.visited, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: t.ui.status.visited, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    const year = new Date().getFullYear();
    const paths = [
      "/",
      "/exhibitions",
      detailHref!,
      "/my/visited",
      "/profile",
      `/profile/year/${year}`,
    ];
    const findings: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      findings.push(
        ...(await layoutFindings(page)).map((f) => `${path}: ${f}`),
      );
    }
    expect(findings).toEqual([]);
  });
}
