export const MUSEUM_PAGE_REFRESH_DAYS = 7;

export interface MuseumRefreshCandidate {
  sourceId: string;
  pageFetchedAt: Date | null;
}

/**
 * Museum pages to fetch this run: never-fetched and changed museums always,
 * plus the stalest pages older than `MUSEUM_PAGE_REFRESH_DAYS`, at most a
 * seventh of all museums per night so the refreshes spread over the week.
 */
export function selectMuseumsForPageFetch<T extends MuseumRefreshCandidate>(
  candidates: T[],
  changedSourceIds: ReadonlySet<string>,
  now: Date,
): T[] {
  const dueBefore =
    now.getTime() - MUSEUM_PAGE_REFRESH_DAYS * 24 * 60 * 60 * 1000;
  const urgent = candidates.filter(
    (m) => m.pageFetchedAt === null || changedSourceIds.has(m.sourceId),
  );
  const rotation = candidates
    .filter(
      (m) =>
        m.pageFetchedAt !== null &&
        !changedSourceIds.has(m.sourceId) &&
        m.pageFetchedAt.getTime() <= dueBefore,
    )
    .sort((a, b) => a.pageFetchedAt!.getTime() - b.pageFetchedAt!.getTime())
    .slice(0, Math.ceil(candidates.length / MUSEUM_PAGE_REFRESH_DAYS));
  return [...urgent, ...rotation];
}
