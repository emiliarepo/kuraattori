import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");

function parseTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [
      match[1]!,
      match[2]!,
    ]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const TEXT_PAIRS = [
  ["fg", "bg"],
  ["fg", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["signal", "bg"],
  ["signal", "surface"],
  ["on-signal", "signal"],
  ["bg", "fg"],
] as const;

describe.each([
  ["light", parseTokens(css.slice(0, darkStart))],
  ["dark", parseTokens(css.slice(darkStart))],
])("%s tokens", (_mode, tokens) => {
  it.each(TEXT_PAIRS)("%s on %s meets WCAG AA", (text, background) => {
    expect(contrast(tokens[text]!, tokens[background]!)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
