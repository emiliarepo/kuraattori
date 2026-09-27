import { addDays, daysBetween } from "./dates";

export const EDITION_REGIONS = [
  { slug: "paakaupunkiseutu", region: "Pääkaupunkiseutu" },
  { slug: "tampere", region: "Tampere" },
  { slug: "turku", region: "Turku" },
] as const;

export type EditionRegionSlug = (typeof EDITION_REGIONS)[number]["slug"];

export function editionRegionBySlug(slug: string) {
  return EDITION_REGIONS.find((entry) => entry.slug === slug);
}

export function editionSlugForRegion(region: string) {
  return EDITION_REGIONS.find((entry) => entry.region === region)?.slug;
}

/** 0 = Sunday, from the ISO date alone (no time zone involved). */
function weekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

export function isSunday(isoDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && weekday(isoDate) === 0;
}

/** The most recent Sunday on or before `today`. */
export function latestSunday(today: string): string {
  return addDays(today, -weekday(today));
}

export interface EditionCandidate {
  id: number;
  museumId: number;
  startDate: string;
  endDate: string | null;
  categoryCount: number;
  hasImage: boolean;
}

export interface EditionSelection {
  leadId: number | null;
  endingIds: number[];
  openingIds: number[];
  gemId: number | null;
}

const LEAD_OPENED_WITHIN_DAYS = 14;
const GEM_MAX_MUSEUM_EXHIBITIONS = 2;

/** FNV-1a over the date, so the hidden gem rotates week to week but never on reload. */
export function dateHash(isoDate: string): number {
  let hash = 0x811c9dc5;
  for (const char of isoDate) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const byEnd = (a: EditionCandidate, b: EditionCandidate) =>
  (a.endDate ?? "9999-12-31").localeCompare(b.endDate ?? "9999-12-31") ||
  a.id - b.id;

/**
 * The edition for Sunday `date` from one region's candidates (one per
 * exhibition group). "This week" is the Monday to Sunday after the edition.
 */
export function selectEdition(
  candidates: readonly EditionCandidate[],
  date: string,
): EditionSelection {
  const weekStart = addDays(date, 1);
  const weekEnd = addDays(date, 7);
  const current = candidates.filter(
    (c) => c.startDate <= date && (c.endDate === null || c.endDate >= date),
  );

  const lead = current
    .filter((c) => daysBetween(c.startDate, date) < LEAD_OPENED_WITHIN_DAYS)
    .sort(
      (a, b) =>
        b.categoryCount - a.categoryCount ||
        Number(b.hasImage) - Number(a.hasImage) ||
        b.startDate.localeCompare(a.startDate) ||
        a.id - b.id,
    )[0];

  const endingIds = candidates
    .filter(
      (c) =>
        c.startDate <= weekEnd &&
        c.endDate !== null &&
        c.endDate >= weekStart &&
        c.endDate <= weekEnd &&
        c.id !== lead?.id,
    )
    .sort(byEnd)
    .map((c) => c.id);

  const openingIds = candidates
    .filter((c) => c.startDate >= weekStart && c.startDate <= weekEnd)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id)
    .map((c) => c.id);

  const perMuseum = new Map<number, number>();
  for (const c of current)
    perMuseum.set(c.museumId, (perMuseum.get(c.museumId) ?? 0) + 1);
  const taken = new Set([lead?.id, ...endingIds]);
  const gems = current
    .filter(
      (c) =>
        (perMuseum.get(c.museumId) ?? 0) <= GEM_MAX_MUSEUM_EXHIBITIONS &&
        !taken.has(c.id),
    )
    .sort((a, b) => a.id - b.id);
  const gem = gems[dateHash(date) % Math.max(gems.length, 1)];

  return {
    leadId: lead?.id ?? null,
    endingIds,
    openingIds,
    gemId: gem?.id ?? null,
  };
}
