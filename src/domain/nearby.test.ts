import { describe, expect, it } from "vitest";

import {
  distanceFrom,
  helsinkiClock,
  nextOpening,
  allNearby,
  openNearby,
  openState,
  roundCoordinates,
} from "./nearby";
import type { WeeklyHours } from "./opening-hours";

// Mon closed, Tue–Sun 10–18.
const kiasmaLike: WeeklyHours = [
  null,
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
];

// Fri and Sat 18–02, otherwise closed.
const lateNight: WeeklyHours = [
  null,
  null,
  null,
  null,
  { open: "18:00", close: "02:00" },
  { open: "18:00", close: "02:00" },
  null,
];

// 2026-09-29 is a Tuesday.
const tuesday = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return { date: "2026-09-29", minutes: h * 60 + m };
};

describe("helsinkiClock", () => {
  it("rolls over to the next Helsinki day before UTC does", () => {
    // 21:30 UTC is 00:30 in Helsinki (EEST, UTC+3).
    expect(helsinkiClock(new Date("2026-09-28T21:30:00Z"))).toEqual({
      date: "2026-09-29",
      minutes: 30,
    });
  });

  it("uses winter time after the switch", () => {
    expect(helsinkiClock(new Date("2026-12-01T21:59:00Z"))).toEqual({
      date: "2026-12-01",
      minutes: 23 * 60 + 59,
    });
  });
});

describe("openState", () => {
  it("is open inside the hours and says when it closes", () => {
    expect(openState(kiasmaLike, tuesday("12:00"))).toEqual({
      open: true,
      closes: "18:00",
      closingSoon: false,
    });
  });

  it("marks the last 45 minutes as closing soon", () => {
    expect(openState(kiasmaLike, tuesday("17:15"))).toMatchObject({
      open: true,
      closingSoon: true,
    });
    expect(openState(kiasmaLike, tuesday("17:14"))).toMatchObject({
      closingSoon: false,
    });
  });

  it("is closed at closing time and on a closed day", () => {
    expect(openState(kiasmaLike, tuesday("18:00")).open).toBe(false);
    expect(
      openState(kiasmaLike, { date: "2026-09-28", minutes: 12 * 60 }).open,
    ).toBe(false);
  });

  it("is closed when hours are unknown", () => {
    expect(openState(null, tuesday("12:00")).open).toBe(false);
  });

  it("treats a closing time after midnight as belonging to the previous day", () => {
    // Saturday 00:30 is still Friday night's opening.
    expect(openState(lateNight, { date: "2026-10-03", minutes: 30 })).toEqual({
      open: true,
      closes: "02:00",
      closingSoon: false,
    });
    // Friday 00:30 follows a closed Thursday.
    expect(openState(lateNight, { date: "2026-10-02", minutes: 30 }).open).toBe(
      false,
    );
    expect(
      openState(lateNight, { date: "2026-10-03", minutes: 90 }),
    ).toMatchObject({ closingSoon: true });
  });

  it("uses the Helsinki date just after midnight", () => {
    // Monday 23:30 UTC is Tuesday 02:30 in Helsinki: closed, then Tuesday opens at 10.
    const clock = helsinkiClock(new Date("2026-09-28T23:30:00Z"));
    expect(openState(kiasmaLike, clock).open).toBe(false);
    expect(nextOpening(kiasmaLike, clock)).toEqual({
      date: "2026-09-29",
      opens: "10:00",
    });
  });
});

describe("nextOpening", () => {
  it("skips a closed day", () => {
    expect(
      nextOpening(kiasmaLike, { date: "2026-09-27", minutes: 19 * 60 }),
    ).toEqual({ date: "2026-09-29", opens: "10:00" });
  });

  it("is undefined without hours", () => {
    expect(nextOpening(null, tuesday("12:00"))).toBeUndefined();
  });
});

describe("distance", () => {
  const kiasma = { latitude: 60.1717, longitude: 24.9365 };
  const ateneum = { latitude: 60.1703, longitude: 24.9441 };

  it("gives kilometres and the day planner's 5 km/h walking minutes", () => {
    const distance = distanceFrom(kiasma, ateneum);
    expect(distance.km).toBeCloseTo(0.45, 1);
    expect(distance.walkingMinutes).toBe(5);
  });

  it("rounds coordinates to about 100 m", () => {
    expect(
      roundCoordinates({ latitude: 60.17168, longitude: 24.93649 }),
    ).toEqual({ latitude: 60.172, longitude: 24.936 });
  });
});

describe("openNearby", () => {
  const origin = { latitude: 60.1717, longitude: 24.9365 };
  const place = (
    name: string,
    latitude: number,
    hours: WeeklyHours | null,
  ) => ({
    name,
    coordinates: { latitude, longitude: 24.9365 },
    openingHours: hours,
  });
  const far = place("far", 60.2, kiasmaLike); // ~3.1 km north
  const near = place("near", 60.172, kiasmaLike);
  const closed = place("closed", 60.1718, lateNight);
  const places = [far, closed, near];

  it("keeps open places within the radius, nearest first", () => {
    expect(
      openNearby(places, origin, 2, tuesday("12:00")).map((r) => r.place.name),
    ).toEqual(["near"]);
    expect(
      openNearby(places, origin, 5, tuesday("12:00")).map((r) => r.place.name),
    ).toEqual(["near", "far"]);
  });

  it("lists every place in the radius with its next opening when nothing is open", () => {
    const early = { date: "2026-10-02", minutes: 8 * 60 };
    expect(openNearby(places, origin, 5, early)).toEqual([]);
    expect(
      allNearby(places, origin, 5, early).map((r) => ({
        name: r.place.name,
        opens: r.opening?.opens,
      })),
    ).toEqual([
      { name: "closed", opens: "18:00" },
      { name: "near", opens: "10:00" },
      { name: "far", opens: "10:00" },
    ]);
    expect(allNearby(places, origin, 0.01, early)).toEqual([]);
  });
});
