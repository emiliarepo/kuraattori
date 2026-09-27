import { getPhase, type ExhibitionDates } from "./dates";

export interface ExhibitionImage extends ExhibitionDates {
  readonly imageUrl: string | null;
  readonly imageArchiveKey: string | null;
}

export function archivedImagePath(key: string): string {
  return `/img/${key}`;
}

/**
 * Image URLs in the order to try them. museot.fi stays first while the
 * exhibition is running or upcoming; once it has ended the source may be gone,
 * so only the archived copy is used.
 */
export function imageSources(
  exhibition: ExhibitionImage,
  today: string,
): string[] {
  const archived = exhibition.imageArchiveKey
    ? archivedImagePath(exhibition.imageArchiveKey)
    : null;
  if (getPhase(exhibition, today) === "ended")
    return archived ? [archived] : [];
  return [exhibition.imageUrl, archived].filter((url) => url !== null);
}
