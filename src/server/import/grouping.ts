import { hashListingPayload } from "./hash";

/** Substrings (already lowercase) of a title that mark a listing as a closure notice, not an exhibition. */
const NOTICE_TITLE_PATTERNS = ["suljettu", "kiinni", "näyttelyn vaihto"];

/** Matched only against the title, never the excerpt/description: museot.fi listings mention "suljettu" in the body text of real exhibitions too (e.g. a museum closed for renovation). */
export function isNoticeTitle(title: string): boolean {
  const normalized = title.toLowerCase();
  return NOTICE_TITLE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function normalizeGroupTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ClassificationFields {
  title: string;
  startDate: string;
  endDate: string | undefined;
  description: string | undefined;
}

/** Same exhibition listed at several venues shares this key: normalized title + start + end + description hash. */
export function computeExhibitionGroup(fields: ClassificationFields): string {
  return hashListingPayload({
    title: normalizeGroupTitle(fields.title),
    startDate: fields.startDate,
    endDate: fields.endDate,
    description: fields.description,
  });
}

export interface Classification {
  exhibitionGroup: string;
  kind: "exhibition" | "notice";
}

export function classify(fields: ClassificationFields): Classification {
  return {
    exhibitionGroup: computeExhibitionGroup(fields),
    kind: isNoticeTitle(fields.title) ? "notice" : "exhibition",
  };
}
