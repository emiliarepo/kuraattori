import { type ExhibitionWithDetails } from "~/app/_lib/row";
import { api } from "~/trpc/server";
import type { RouterInputs } from "~/trpc/react";

type ListInput = Omit<RouterInputs["exhibition"]["list"], "regions" | "cursor">;

/**
 * `exhibition.list`, chained `pageCount` times so the browse page can load
 * "page N" (the URL's loaded-pages count) server-side in one request — back
 * navigation and a reload both land on the same set of loaded rows.
 */
export async function listPages(
  regions: readonly string[],
  input: ListInput,
  pageCount: number,
): Promise<{ items: ExhibitionWithDetails[]; nextCursor: string | null }> {
  const items: ExhibitionWithDetails[] = [];
  let cursor: string | undefined;
  let nextCursor: string | null = null;
  for (let page = 0; page < Math.max(pageCount, 1); page++) {
    const result = await api.exhibition.list({
      ...input,
      regions: [...regions],
      cursor,
    });
    items.push(...result.items);
    nextCursor = result.nextCursor;
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return { items, nextCursor };
}
