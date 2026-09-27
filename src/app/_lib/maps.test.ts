import { describe, expect, it } from "vitest";

import { isApplePlatform, mapHref } from "./maps";

describe("isApplePlatform", () => {
  it.each([
    [
      "iPhone Safari",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "iPhone",
      5,
      true,
    ],
    [
      "iPad desktop Safari",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
      "MacIntel",
      5,
      true,
    ],
    [
      "Mac Safari",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15",
      "MacIntel",
      0,
      true,
    ],
    [
      "Mac Chrome",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0",
      "MacIntel",
      0,
      true,
    ],
    [
      "Android Chrome",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0",
      "Linux armv8l",
      5,
      false,
    ],
    [
      "Windows Chrome",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
      "Win32",
      0,
      false,
    ],
  ])("detects %s", (_label, userAgent, platform, touch, expected) => {
    expect(isApplePlatform(userAgent, platform, touch)).toBe(expected);
  });

  it("encodes the museum name and address in either map URL", () => {
    expect(mapHref("Kiasma", "Mannerheiminaukio 2, Helsinki", true)).toBe(
      "https://maps.apple.com/?q=Kiasma%2C%20Mannerheiminaukio%202%2C%20Helsinki",
    );
    expect(mapHref("Kiasma", "Mannerheiminaukio 2, Helsinki", false)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Kiasma%2C%20Mannerheiminaukio%202%2C%20Helsinki",
    );
  });
});
