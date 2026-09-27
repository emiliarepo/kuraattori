import { mkdirSync, writeFileSync } from "node:fs";

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { devSignIn, uniqueEmail } from "./dev-sign-in";
import { APP_BASE_URL } from "./env";
import { t } from "../src/i18n/fi";

/**
 * A measurement run, not a regression test: `SPACING_AUDIT=1 pnpm exec
 * playwright test spacing-audit` writes every route's spacing numbers to
 * `e2e/.tmp/spacing-audit/`. issues/50-spacing-pass.md records how to read them.
 */
test.skip(!process.env.SPACING_AUDIT, "measurement run, set SPACING_AUDIT=1");
test.describe.configure({ mode: "parallel" });

const LOCALES = ["fi", "en", "sv"] as const;
const WIDTHS = [390, 1280] as const;
const SCHEMES = ["light", "dark"] as const;

const SIGNED_OUT = [
  "/",
  "/feed",
  "/exhibitions",
  "/museums",
  "/edition/paakaupunkiseutu",
  "/trip",
  "/trip/day",
  "/my/interested",
  "/sign-in",
  "/privacy",
  "/terms",
];
const SIGNED_IN = [
  "/",
  "/feed",
  "/my/interested",
  "/my/visited",
  "/my/passport",
  "/my/year",
  "/my/hidden",
  "/trip",
  "/settings/interests",
  "/settings/regions",
  "/settings/calendar",
  "/settings/account",
  "/welcome",
];

interface Measurement {
  tabGaps: { strip: string; gap: number; first: string }[];
  h1Gap: { gap: number; first: string } | null;
  tight: string[];
  uneven: string[];
  crowded: string[];
}

function measure(page: Page): Promise<Measurement> {
  return page.evaluate(() => {
    const main = document.querySelector("main")!;
    const round = (n: number) => Math.round(n);
    const label = (el: Element) =>
      `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 3).join(".") : ""}> "${(el.textContent ?? "").trim().slice(0, 30)}"`;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== "hidden" &&
        el.closest(".sr-only") === null
      );
    };

    // Top edge of the first painted thing (text ink box, image, control or rule).
    const inkTop = (root: Element): { top: number; el: Element } | null => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let best: { top: number; el: Element } | null = null;
      if (
        ["BUTTON", "SELECT", "INPUT", "IMG"].includes(root.tagName) ||
        parseFloat(getComputedStyle(root).borderTopWidth) > 0
      )
        best = { top: root.getBoundingClientRect().top, el: root };
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        let top: number | null = null;
        let el: Element;
        if (n.nodeType === Node.TEXT_NODE) {
          if (!n.textContent?.trim()) continue;
          el = n.parentElement!;
          if (!visible(el)) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          top = range.getBoundingClientRect().top;
        } else {
          el = n as Element;
          if (!visible(el)) continue;
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (
            ["IMG", "SVG", "SELECT", "INPUT", "BUTTON", "svg"].includes(
              el.tagName,
            ) ||
            parseFloat(s.borderTopWidth) > 0 ||
            (s.backgroundColor !== "rgba(0, 0, 0, 0)" && el !== root)
          )
            top = r.top;
        }
        if (top !== null && (!best || top < best.top)) best = { top, el };
      }
      return best;
    };

    const firstAfter = (y: number, skip: Element) => {
      let best: { top: number; el: Element } | null = null;
      for (const el of main.querySelectorAll("*")) {
        if (skip.contains(el) || el.contains(skip) || !visible(el)) continue;
        if (el.children.length > 0 && el.tagName !== "SELECT") {
          const own = [...el.childNodes].some(
            (c) => c.nodeType === Node.TEXT_NODE && c.textContent?.trim(),
          );
          const s = getComputedStyle(el);
          if (!own && parseFloat(s.borderTopWidth) === 0) continue;
        }
        const ink = inkTop(el) ?? {
          top: el.getBoundingClientRect().top,
          el,
        };
        if (ink.top >= y - 0.5 && (!best || ink.top < best.top)) best = ink;
      }
      return best;
    };

    const tabGaps: Measurement["tabGaps"] = [];
    for (const nav of main.querySelectorAll("nav")) {
      if (!nav.querySelector('a[aria-current="page"].border-b-2')) continue;
      let strip: Element = nav;
      while (
        strip.parentElement &&
        strip.parentElement !== main &&
        Math.abs(
          strip.parentElement.getBoundingClientRect().bottom -
            strip.getBoundingClientRect().bottom,
        ) < 1
      )
        strip = strip.parentElement;
      const bottom = strip.getBoundingClientRect().bottom;
      const first = firstAfter(bottom, strip);
      tabGaps.push({
        strip: nav.getAttribute("aria-label") ?? "",
        gap: first ? round(first.top - bottom) : -1,
        first: first ? label(first.el) : "",
      });
    }

    let h1Gap: Measurement["h1Gap"] = null;
    const h1 = main.querySelector("h1");
    if (h1) {
      const first = firstAfter(h1.getBoundingClientRect().bottom, h1);
      if (first)
        h1Gap = {
          gap: round(first.top - h1.getBoundingClientRect().bottom),
          first: label(first.el),
        };
    }

    const blocks = [...main.querySelectorAll("*")].filter((el) => {
      if (!visible(el)) return false;
      const d = getComputedStyle(el).display;
      return !d.startsWith("inline") && d !== "contents";
    });

    const tight: string[] = [];
    const important = (el: Element) =>
      el.matches(
        "h1,h2,h3,section,button,select,input,textarea,nav,ul,ol,form,[role=status]",
      );
    for (const el of blocks) {
      const next = el.nextElementSibling;
      if (!next || !visible(next)) continue;
      const a = el.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      const overlapX =
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1;
      if (!overlapX || b.top < a.bottom - 1) continue;
      const gap = b.top - a.bottom;
      if (gap < 8 && (important(el) || important(next)))
        tight.push(`${round(gap)}px ${label(el)} -> ${label(next)}`);
    }

    const uneven: string[] = [];
    for (const el of blocks) {
      const s = getComputedStyle(el);
      const framed =
        parseFloat(s.borderTopWidth) > 0 ||
        parseFloat(s.borderBottomWidth) > 0 ||
        s.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        el.matches("section,header,li,details");
      if (!framed || el.getBoundingClientRect().height < 40) continue;
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(
        (r) => r.width > 0 && r.height > 0,
      );
      for (const img of el.querySelectorAll("img,svg,select,input,button"))
        if (visible(img)) rects.push(img.getBoundingClientRect());
      if (!rects.length) continue;
      const top = Math.min(...rects.map((r) => r.top)) - box.top;
      const bottom = box.bottom - Math.max(...rects.map((r) => r.bottom));
      if (
        Math.abs(top - bottom) > 12 &&
        Math.max(top, bottom) > 2 * Math.min(top, bottom) + 4
      )
        uneven.push(`top ${round(top)} / bottom ${round(bottom)} ${label(el)}`);
    }

    const textRect = (el: Element): DOMRect | null => {
      const rects: DOMRect[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || !visible(n.parentElement!)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
      }
      if (!rects.length) return null;
      const left = Math.min(...rects.map((r) => r.left));
      const top = Math.min(...rects.map((r) => r.top));
      return new DOMRect(
        left,
        top,
        Math.max(...rects.map((r) => r.right)) - left,
        Math.max(...rects.map((r) => r.bottom)) - top,
      );
    };
    const lineCount = (el: Element) => {
      const tops = new Set<number>();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || !visible(n.parentElement!)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects())
          if (r.width > 0) tops.add(Math.round(r.bottom / 4));
      }
      return tops.size;
    };

    const crowded: string[] = [];
    const chips = [
      ...main.querySelectorAll(
        "button,select,input,a.btn,[class*='btn-'],.text-kicker",
      ),
    ].filter(visible);
    for (const el of chips) {
      const parent = el.parentElement;
      if (!parent) continue;
      const control = el.matches("button,select,input");
      const a = control ? el.getBoundingClientRect() : textRect(el);
      if (!a) continue;
      for (const sib of parent.children) {
        if (sib === el || !visible(sib) || sib.contains(el)) continue;
        const b = control ? textRect(sib) : sib.getBoundingClientRect();
        if (!b) continue;
        const overlapY =
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4;
        if (!overlapY) continue;
        const gap =
          b.left >= a.right
            ? b.left - a.right
            : a.left >= b.right
              ? a.left - b.right
              : -1;
        if (gap >= 0 && gap < 4 && sib.textContent?.trim())
          crowded.push(`${round(gap)}px ${label(el)} | ${label(sib)}`);
      }
    }
    const vw = document.documentElement.clientWidth;
    for (const el of main.querySelectorAll("h1,h2,h3,p,button,label,dt,dd")) {
      if (!visible(el) || el.closest(".rail,[class*='overflow-x']")) continue;
      const r = el.getBoundingClientRect();
      if (r.left < 12 || r.right > vw - 12)
        crowded.push(
          `edge ${round(r.left)}..${round(vw - r.right)} ${label(el)}`,
        );
    }
    for (const el of main.querySelectorAll(
      "button,nav a,a.btn,[class*='btn-']",
    )) {
      if (!visible(el) || (el.textContent ?? "").trim().length < 3) continue;
      const lines = lineCount(el);
      if (lines > 1) crowded.push(`wraps ${lines} lines ${label(el)}`);
    }

    return { tabGaps, h1Gap, tight, uneven, crowded };
  });
}

async function prepareSignedIn(page: Page) {
  await devSignIn(page, uniqueEmail("spacing"), "/exhibitions");
  await page.goto("/exhibitions");
  await page.locator('main a[href^="/exhibitions/"]').first().waitFor();
  const hrefs = await page
    .locator('main a[href^="/exhibitions/"]')
    .evaluateAll((links) =>
      [...new Set(links.map((l) => l.getAttribute("href")!))].slice(0, 4),
    );
  const marks = [
    t.ui.status.visited,
    t.ui.status.visited,
    t.ui.status.interested,
    t.ui.status.hidden,
  ];
  for (const [index, href] of hrefs.entries()) {
    await page.goto(href);
    const button = page.getByRole("button", {
      name: marks[index],
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  return hrefs[0]!;
}

for (const signedIn of [false, true])
  for (const locale of LOCALES)
    for (const width of WIDTHS)
      for (const scheme of SCHEMES)
        test(`${signedIn ? "in" : "out"} ${locale} ${width} ${scheme}`, async ({
          page,
          context,
        }) => {
          test.setTimeout(300_000);
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          let paths = SIGNED_OUT;
          if (signedIn) {
            const detail = await prepareSignedIn(page);
            paths = [...SIGNED_IN, detail];
          } else {
            await page.goto("/exhibitions");
            const detail = await page
              .locator('main a[href^="/exhibitions/"]')
              .first()
              .getAttribute("href");
            await page.goto("/museums");
            const museum = await page
              .locator('main a[href^="/museums/"]')
              .first()
              .getAttribute("href");
            paths = [...SIGNED_OUT, detail!, museum!];
          }
          await context.addCookies([
            { name: "kuraattori_locale", value: locale, url: APP_BASE_URL },
          ]);
          const results: Record<string, Measurement> = {};
          for (const path of paths) {
            await page.goto(path);
            await page.waitForLoadState("networkidle");
            results[new URL(page.url()).pathname] = await measure(page);
          }
          mkdirSync("e2e/.tmp/spacing-audit", { recursive: true });
          writeFileSync(
            `e2e/.tmp/spacing-audit/${process.env.SPACING_AUDIT}-${signedIn ? "in" : "out"}-${locale}-${width}-${scheme}.json`,
            JSON.stringify(results, null, 1),
          );
        });
