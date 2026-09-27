import { describe, expect, it } from "vitest";

import {
  escapeCalendarText,
  foldCalendarLine,
  formatCalendar,
  helsinkiTimeToUtc,
} from "./calendar";

describe("calendar formatting", () => {
  it("escapes RFC 5545 text values", () => {
    expect(escapeCalendarText("A\\B, C;D\nE\r\nF")).toBe(
      "A\\\\B\\, C\\;D\\nE\\nF",
    );
  });

  it("folds lines at 75 UTF-8 octets without splitting characters", () => {
    const folded = foldCalendarLine(`SUMMARY:${"ä".repeat(70)}`);
    for (const line of folded.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(`SUMMARY:${"ä".repeat(70)}`);
  });

  it("uses CRLF and an exclusive all-day end date", () => {
    const output = formatCalendar(
      [
        {
          uid: "group@kuraattori.emiliarepo.dev",
          endDate: "2026-10-31",
          startDate: "2026-09-01",
          title: 'Taide, "ja',
          location: "Museo; Helsinki",
          url: "https://example.test/exhibitions/taide",
        },
      ],
      new Date("2026-09-27T10:00:00.000Z"),
    );
    expect(output).toContain("DTSTART;VALUE=DATE:20261031\r\n");
    expect(output).toContain("DTEND;VALUE=DATE:20261101\r\n");
    expect(output).toContain('SUMMARY:Päättyy: Taide\\, "ja\r\n');
    expect(output).toContain("LOCATION:Museo\\; Helsinki\r\n");
    expect(output.endsWith("\r\n")).toBe(true);
    expect(output.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });

  it("converts Helsinki wall-clock time across daylight saving", () => {
    expect(helsinkiTimeToUtc("2026-07-01", "11:00").toISOString()).toBe(
      "2026-07-01T08:00:00.000Z",
    );
    expect(helsinkiTimeToUtc("2026-12-01", "11:00").toISOString()).toBe(
      "2026-12-01T09:00:00.000Z",
    );
  });
});
