export interface TripFilters {
  readonly place: string | null;
  readonly from: string | null;
  readonly to: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | undefined): value is string {
  return value !== undefined && ISO_DATE.test(value);
}

function nullIfBlank(value: string | undefined): string | null {
  if (!value) return null;
  return value;
}

/** Reads `/trip`'s `place`, `from` and `to` query params into typed filters. */
export function parseTripFilters(
  searchParams: Record<string, string | string[] | undefined>,
): TripFilters {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const from = get("from");
  const to = get("to");
  return {
    place: nullIfBlank(get("place")),
    from: isIsoDate(from) ? from : null,
    to: isIsoDate(to) ? to : null,
  };
}

/** A usable range needs both dates, in order. */
export function hasValidTripRange(
  filters: TripFilters,
): filters is TripFilters & { from: string; to: string } {
  return (
    filters.from !== null && filters.to !== null && filters.from <= filters.to
  );
}
