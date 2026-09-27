export interface SavingsVisit {
  title: string;
  visitedAt: Date | null;
  museumCardEligible: boolean;
  admissionAdultCents: number | null;
}

export interface Savings {
  year: number;
  years: number[];
  savedCents: number;
  unpricedTitles: string[];
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function visitYear(visitedAt: Date): number {
  return Number(
    new Intl.DateTimeFormat("fi-FI", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
    }).format(visitedAt),
  );
}

/** Undefined when no visit has a date. `requestedYear` falls back to the latest. */
export function summarizeSavings(
  visits: readonly SavingsVisit[],
  requestedYear: number | undefined,
): Savings | undefined {
  const dated = visits.flatMap((visit) =>
    visit.visitedAt ? [{ ...visit, year: visitYear(visit.visitedAt) }] : [],
  );
  const years = [...new Set(dated.map((visit) => visit.year))].sort(
    (a, b) => b - a,
  );
  const latest = years[0];
  if (latest === undefined) return undefined;
  const year =
    requestedYear !== undefined && years.includes(requestedYear)
      ? requestedYear
      : latest;

  const eligible = dated.filter(
    (visit) => visit.year === year && visit.museumCardEligible,
  );
  return {
    year,
    years,
    savedCents: eligible.reduce(
      (sum, visit) => sum + (visit.admissionAdultCents ?? 0),
      0,
    ),
    unpricedTitles: eligible
      .filter((visit) => visit.admissionAdultCents === null)
      .map((visit) => visit.title),
  };
}
