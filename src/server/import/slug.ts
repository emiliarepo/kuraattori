/** Lowercase, ASCII, hyphenated slug: diacritics stripped (ä/ö/å → a/o/a) for portable URLs. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A slug unique against `isTaken`. Ties are broken by appending the source
 * id, which is stable across runs so re-imports keep the same slug.
 */
export function uniqueSlug(
  base: string,
  sourceId: string,
  isTaken: (candidate: string) => boolean,
): string {
  const slug = slugify(base) || "n";
  if (!isTaken(slug)) return slug;
  return `${slug}-${sourceId}`;
}
