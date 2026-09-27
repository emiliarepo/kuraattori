export type BrowseState = "current" | "upcoming";

export interface BrowseFilters {
  readonly search: string | null;
  readonly city: string | null;
  readonly museumIds: readonly number[];
  readonly categoryIds: readonly number[];
  readonly museumCardOnly: boolean;
  readonly state: BrowseState;
  readonly endingWithinDays: number | null;
}

const DEFAULT_STATE: BrowseState = "current";

export const ENDING_WITHIN_OPTIONS = [7, 14, 30, 60] as const;

function nullIfBlank(value: string | undefined): string | null {
  if (!value) return null;
  return value;
}

function parseIds(value: string | undefined): number[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => Number(part))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

/** Reads a Next.js `searchParams` object (values may be repeated) into typed Browse filters. */
export function parseBrowseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): BrowseFilters {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const endingWithinDays = Number(get("ending"));
  return {
    search: nullIfBlank(get("q")?.trim()),
    city: get("city") ?? null,
    museumIds: parseIds(get("museum")),
    categoryIds: parseIds(get("category")),
    museumCardOnly: get("card") === "1",
    state: get("state") === "upcoming" ? "upcoming" : DEFAULT_STATE,
    endingWithinDays:
      Number.isInteger(endingWithinDays) && endingWithinDays > 0
        ? endingWithinDays
        : null,
  };
}

/** The query string for a filter set, omitting anything already at its default. */
export function browseFiltersToParams(filters: BrowseFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.city) params.set("city", filters.city);
  if (filters.museumIds.length)
    params.set("museum", filters.museumIds.join(","));
  if (filters.categoryIds.length)
    params.set("category", filters.categoryIds.join(","));
  if (filters.museumCardOnly) params.set("card", "1");
  if (filters.state !== DEFAULT_STATE) params.set("state", filters.state);
  if (filters.endingWithinDays)
    params.set("ending", String(filters.endingWithinDays));
  return params;
}

/** The corresponding input for `exhibition.list`. */
export function browseFiltersToListInput(filters: BrowseFilters) {
  return {
    search: filters.search ?? undefined,
    city: filters.city ?? undefined,
    museumIds: filters.museumIds.length ? [...filters.museumIds] : undefined,
    categoryIds: filters.categoryIds.length
      ? [...filters.categoryIds]
      : undefined,
    museumCardOnly: filters.museumCardOnly || undefined,
    state: filters.state,
    endingWithinDays: filters.endingWithinDays ?? undefined,
  };
}
