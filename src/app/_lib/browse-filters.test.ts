import { describe, expect, it } from "vitest";

import {
  browseFiltersToListInput,
  browseFiltersToParams,
  parseBrowseFilters,
} from "./browse-filters";

describe("parseBrowseFilters", () => {
  it("defaults to the current state with no other filters", () => {
    expect(parseBrowseFilters({})).toEqual({
      search: null,
      city: null,
      museumIds: [],
      categoryIds: [],
      museumCardOnly: false,
      state: "current",
      endingWithinDays: null,
      page: 1,
    });
  });

  it("parses page, ignoring non-positive or non-integer values", () => {
    expect(parseBrowseFilters({ page: "3" }).page).toBe(3);
    expect(parseBrowseFilters({ page: "0" }).page).toBe(1);
    expect(parseBrowseFilters({ page: "-1" }).page).toBe(1);
    expect(parseBrowseFilters({ page: "abc" }).page).toBe(1);
  });

  it("clamps page to a sane maximum", () => {
    expect(parseBrowseFilters({ page: "9999" }).page).toBe(20);
  });

  it("parses comma-separated ids, dedupes and drops non-positive values", () => {
    const filters = parseBrowseFilters({ museum: "3,7,3,-1,x", category: "2" });
    expect(filters.museumIds).toEqual([3, 7]);
    expect(filters.categoryIds).toEqual([2]);
  });

  it("only accepts 'upcoming' as a non-default state", () => {
    expect(parseBrowseFilters({ state: "ended" }).state).toBe("current");
    expect(parseBrowseFilters({ state: "upcoming" }).state).toBe("upcoming");
  });

  it("trims search text and treats blank search as absent", () => {
    expect(parseBrowseFilters({ q: "  Muumi  " }).search).toBe("Muumi");
    expect(parseBrowseFilters({ q: "   " }).search).toBeNull();
  });
});

describe("browseFiltersToParams", () => {
  it("omits filters at their default", () => {
    const params = browseFiltersToParams(parseBrowseFilters({}));
    expect(params.toString()).toBe("");
  });

  it("round-trips a full filter set through the query string", () => {
    const filters = parseBrowseFilters({
      q: "muumi",
      city: "Tampere",
      museum: "1,2",
      category: "5",
      card: "1",
      state: "upcoming",
      ending: "14",
      page: "3",
    });
    const roundTripped = parseBrowseFilters(
      Object.fromEntries(browseFiltersToParams(filters)),
    );
    expect(roundTripped).toEqual(filters);
  });

  it("omits page from the query string at its default", () => {
    const params = browseFiltersToParams(parseBrowseFilters({ page: "1" }));
    expect(params.toString()).toBe("");
  });
});

describe("browseFiltersToListInput", () => {
  it("maps empty filters to an all-default list input", () => {
    expect(browseFiltersToListInput(parseBrowseFilters({}))).toEqual({
      search: undefined,
      city: undefined,
      museumIds: undefined,
      categoryIds: undefined,
      museumCardOnly: undefined,
      state: "current",
      endingWithinDays: undefined,
    });
  });
});
