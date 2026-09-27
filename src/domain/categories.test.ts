import { describe, expect, it } from "vitest";

import { groupBySelection } from "./categories";

describe("groupBySelection", () => {
  it("puts selected items first, both groups keeping their original order", () => {
    const items = [
      { id: 1, name: "Taide" },
      { id: 2, name: "Historia" },
      { id: 3, name: "Muotoilu" },
    ];

    expect(groupBySelection(items, new Set([2]))).toEqual({
      selected: [{ id: 2, name: "Historia" }],
      rest: [
        { id: 1, name: "Taide" },
        { id: 3, name: "Muotoilu" },
      ],
    });
  });

  it("puts everything in rest when nothing is selected", () => {
    const items = [{ id: 1, name: "Taide" }];

    expect(groupBySelection(items, new Set())).toEqual({
      selected: [],
      rest: items,
    });
  });
});
