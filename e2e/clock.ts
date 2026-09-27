import { todayInHelsinki } from "../src/domain/dates";

/** The day the museot.fi fixture snapshots were saved; their dates are relative to it. */
export const FIXTURE_DAY = "2026-09-27";

export function e2eToday(): string {
  return todayInHelsinki();
}

/**
 * The E2E seed moves the fixtures' world by this many days so it always sits
 * on today: every date moves by it, and weekly opening hours rotate by it, so
 * a museum is open today exactly when it was open on the fixture day.
 */
export function fixtureShiftDays(): number {
  return Math.round(
    (Date.parse(e2eToday()) - Date.parse(FIXTURE_DAY)) / 86_400_000,
  );
}

/** Weekly hours (Monday first) as they read after shifting by `days`. */
export function rotateWeek<W extends readonly unknown[]>(
  week: W,
  days: number,
): W {
  return week.map(
    (_, weekday) => week[(((weekday - days) % 7) + 7) % 7],
  ) as unknown as W;
}
