import { describe, expect, it } from "vitest";

import {
  addMinutes,
  haversineKm,
  orderStops,
  walkingMinutes,
} from "~/domain/day-plan";

const at = (id: number, latitude: number, longitude: number) => ({
  id,
  coordinates: { latitude, longitude },
});

describe("orderStops", () => {
  it("walks a line from the first stop instead of zigzagging", () => {
    const stops = [
      at(1, 60.17, 24.9),
      at(2, 60.17, 24.96),
      at(3, 60.17, 24.92),
      at(4, 60.17, 24.94),
    ];
    expect(orderStops(stops).map((s) => s.stop.id)).toEqual([1, 3, 4, 2]);
  });

  it("improves a nearest-neighbour route with 2-opt", () => {
    // Nearest neighbour goes 1→2→3→4 round the square, leaving a long last
    // leg to 5; walking the square the other way ends next to 5.
    const stops = [
      at(1, 0, 0),
      at(2, 0, 1),
      at(3, 1, 1),
      at(4, 1, 0),
      at(5, 0.5, 3),
    ];
    expect(orderStops(stops).map((s) => s.stop.id)).toEqual([1, 4, 3, 2, 5]);
  });

  it("keeps the first stop first and puts unlocated stops last", () => {
    const ordered = orderStops([
      { id: 9, coordinates: null },
      at(1, 60.2, 24.9),
      at(2, 60.1, 24.9),
    ]);
    expect(ordered.map((s) => s.stop.id)).toEqual([1, 2, 9]);
    expect(ordered[1]!.legKm).toBeNull();
    expect(ordered[2]!.legKm).toBeNull();
  });
});

describe("leg maths", () => {
  it("measures a degree of latitude as about 111 km", () => {
    expect(
      haversineKm(at(1, 60, 25).coordinates, at(2, 61, 25).coordinates),
    ).toBeCloseTo(111.2, 0);
  });

  it("walks 1 km in 12 minutes and never shows zero", () => {
    expect(walkingMinutes(1)).toBe(12);
    expect(walkingMinutes(2.5)).toBe(30);
    expect(walkingMinutes(0.01)).toBe(1);
  });

  it("adds visit times across the hour", () => {
    expect(addMinutes("11:00", 90)).toBe("12:30");
    expect(addMinutes("23:30", 90)).toBe("01:00");
  });
});
