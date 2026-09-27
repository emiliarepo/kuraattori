import { type ExhibitionWithDetails } from "~/app/_lib/row";
import { api } from "~/trpc/server";
import type { RouterInputs } from "~/trpc/react";

type ListInput = Omit<RouterInputs["exhibition"]["list"], "region" | "cursor">;

/**
 * `exhibition.list` only takes one `region`. With 0 or 1 active regions this
 * is a single call; with more, merges per-region pages. The merged case has
 * no stable cursor across regions, so pagination stops there — fine while
 * `getActiveRegions` only ever returns one region or none.
 */
export async function listAcrossRegions(
  activeRegions: readonly string[],
  input: ListInput,
): Promise<{ items: ExhibitionWithDetails[]; nextCursor: string | null }> {
  if (activeRegions.length <= 1) {
    return api.exhibition.list({ ...input, region: activeRegions[0] });
  }

  const pages = await Promise.all(
    activeRegions.map((region) => api.exhibition.list({ ...input, region })),
  );
  const seen = new Set<number>();
  const items = pages
    .flatMap((page) => page.items)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .sort(
      (a, b) =>
        (a.endDate ?? "9999-12-31").localeCompare(b.endDate ?? "9999-12-31") ||
        a.id - b.id,
    )
    .slice(0, input.limit ?? 20);
  return { items, nextCursor: null };
}
