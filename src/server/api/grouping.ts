import type { exhibitions, museums } from "~/server/db/schema";

export interface Venue {
  name: string;
  city: string | null;
  slug: string;
}

export interface ExhibitionMuseumRow {
  exhibition: typeof exhibitions.$inferSelect;
  museum: typeof museums.$inferSelect;
}

export interface GroupedExhibitionRow {
  exhibition: typeof exhibitions.$inferSelect;
  museum: typeof museums.$inferSelect;
  venues: Venue[];
  memberIds: number[];
}

/**
 * Collapses rows sharing an `exhibitionGroup` into one, keeping the
 * lowest-id member as canonical (its fields, e.g. slug, represent the
 * group) and merging the rest into `venues`/`memberIds`. Order-preserving:
 * a group appears at its first member's original position. Rows with a
 * null `exhibitionGroup` (not yet classified by an import) are their own
 * singleton group.
 */
export function groupExhibitionRows<Row extends ExhibitionMuseumRow>(
  rows: Row[],
): GroupedExhibitionRow[] {
  const order: string[] = [];
  const byKey = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.exhibition.exhibitionGroup ?? `id:${row.exhibition.id}`;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }

  return order.map((key) => {
    const members = [...byKey.get(key)!].sort(
      (a, b) => a.exhibition.id - b.exhibition.id,
    );
    const canonical = members[0]!;
    return {
      exhibition: canonical.exhibition,
      museum: canonical.museum,
      venues: members.map((member) => ({
        name: member.museum.name,
        city: member.museum.city,
        slug: member.museum.slug,
      })),
      memberIds: members.map((member) => member.exhibition.id),
    };
  });
}
