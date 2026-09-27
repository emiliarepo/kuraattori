import { INTL_LOCALE, type Locale } from "~/i18n/locales";

export interface SavingsVisit {
  title: string;
  visitedAt: Date | null;
  museumCardEligible: boolean;
  admissionAdultCents: number | null;
  museumId: number;
}

export interface Savings {
  year: number;
  years: number[];
  savedCents: number;
  unpricedTitles: string[];
}

export function formatEuros(cents: number, locale: Locale = "fi"): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function helsinkiDate(visitedAt: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Helsinki",
  }).format(visitedAt);
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
    visit.visitedAt
      ? [
          {
            ...visit,
            visitedAt: visit.visitedAt,
            year: visitYear(visit.visitedAt),
          },
        ]
      : [],
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

  // One ticket covers every exhibition a museum shows that day; the dearest
  // price is the ticket that covers them all.
  const tickets = new Map<string, { cents: number | null; titles: string[] }>();
  for (const visit of dated) {
    if (visit.year !== year || !visit.museumCardEligible) continue;
    const key = `${visit.museumId}:${helsinkiDate(visit.visitedAt)}`;
    const ticket = tickets.get(key) ?? { cents: null, titles: [] };
    ticket.titles.push(visit.title);
    if (visit.admissionAdultCents !== null)
      ticket.cents = Math.max(ticket.cents ?? 0, visit.admissionAdultCents);
    tickets.set(key, ticket);
  }
  return {
    year,
    years,
    savedCents: [...tickets.values()].reduce(
      (sum, ticket) => sum + (ticket.cents ?? 0),
      0,
    ),
    unpricedTitles: [...tickets.values()]
      .filter((ticket) => ticket.cents === null)
      .flatMap((ticket) => ticket.titles),
  };
}
