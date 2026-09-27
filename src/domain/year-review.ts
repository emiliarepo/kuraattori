import { visitYear } from "~/domain/savings";

const TOP_CATEGORIES_LIMIT = 5;

export interface YearReviewVisit {
  title: string;
  museumId: number;
  museumName: string;
  city: string | null;
  visitedAt: Date;
  categories: readonly string[];
}

export interface VisitHighlight {
  title: string;
  museumName: string;
  visitedAt: Date;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface MonthCount {
  month: number;
  count: number;
}

export interface YearReview {
  year: number;
  years: number[];
  visitCount: number;
  museumCount: number;
  cityCount: number;
  topCategories: CategoryCount[];
  firstVisit: VisitHighlight;
  latestVisit: VisitHighlight;
  months: MonthCount[];
  busiestMonth: MonthCount;
}

function visitMonth(visitedAt: Date): number {
  return Number(
    new Intl.DateTimeFormat("fi-FI", {
      timeZone: "Europe/Helsinki",
      month: "numeric",
    }).format(visitedAt),
  );
}

/** Undefined when no visit falls in the requested (or latest available) year. */
export function summarizeYear(
  visits: readonly YearReviewVisit[],
  requestedYear: number | undefined,
): YearReview | undefined {
  const years = [
    ...new Set(visits.map((visit) => visitYear(visit.visitedAt))),
  ].sort((a, b) => b - a);
  const latest = years[0];
  if (latest === undefined) return undefined;
  const year =
    requestedYear !== undefined && years.includes(requestedYear)
      ? requestedYear
      : latest;

  const yearVisits = visits.filter(
    (visit) => visitYear(visit.visitedAt) === year,
  );
  const sorted = [...yearVisits].sort(
    (a, b) => a.visitedAt.getTime() - b.visitedAt.getTime(),
  );
  const firstVisit = sorted[0]!;
  const latestVisit = sorted[sorted.length - 1]!;

  const categoryCounts = new Map<string, number>();
  for (const visit of yearVisits) {
    for (const category of visit.categories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES_LIMIT)
    .map(([name, count]) => ({ name, count }));

  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    count: 0,
  }));
  for (const visit of yearVisits) {
    months[visitMonth(visit.visitedAt) - 1]!.count += 1;
  }
  const busiestMonth = months.reduce((busiest, month) =>
    month.count > busiest.count ? month : busiest,
  );

  return {
    year,
    years,
    visitCount: yearVisits.length,
    museumCount: new Set(yearVisits.map((visit) => visit.museumId)).size,
    cityCount: new Set(
      yearVisits.flatMap((visit) => (visit.city ? [visit.city] : [])),
    ).size,
    topCategories,
    firstVisit: {
      title: firstVisit.title,
      museumName: firstVisit.museumName,
      visitedAt: firstVisit.visitedAt,
    },
    latestVisit: {
      title: latestVisit.title,
      museumName: latestVisit.museumName,
      visitedAt: latestVisit.visitedAt,
    },
    months,
    busiestMonth,
  };
}
