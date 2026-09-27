import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";

import { todayInHelsinki } from "~/domain/dates";
import { batchedByIds } from "~/server/api/batch";
import { cached } from "~/server/cache/kv-cache";
import { exhibitionCategories, exhibitions, museums } from "~/server/db/schema";
import {
  deserializeExhibition,
  deserializeMuseum,
  serializeExhibition,
  serializeMuseum,
} from "~/server/db/serialize";
import type { Db } from "~/server/db";

const ACTIVE_POOL_CACHE_TTL_SECONDS = 60 * 60;

export interface ActivePoolEntry {
  exhibition: typeof exhibitions.$inferSelect;
  museum: typeof museums.$inferSelect;
  categoryIds: number[];
}

async function loadActivePool(db: Db) {
  const today = todayInHelsinki();
  const rows = await db
    .select({ exhibition: exhibitions, museum: museums })
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(
      and(
        eq(exhibitions.kind, "exhibition"),
        or(isNull(exhibitions.endDate), gte(exhibitions.endDate, today)),
      ),
    );
  const categoryRows = await batchedByIds(
    rows.map((row) => row.exhibition.id),
    (batch) =>
      db
        .select({
          exhibitionId: exhibitionCategories.exhibitionId,
          categoryId: exhibitionCategories.categoryId,
        })
        .from(exhibitionCategories)
        .where(inArray(exhibitionCategories.exhibitionId, batch)),
  );
  const categoryIdsByExhibition = new Map<number, number[]>();
  for (const row of categoryRows) {
    const list = categoryIdsByExhibition.get(row.exhibitionId) ?? [];
    list.push(row.categoryId);
    categoryIdsByExhibition.set(row.exhibitionId, list);
  }
  return rows.map(({ exhibition, museum }) => ({
    exhibition: serializeExhibition(exhibition),
    museum: serializeMuseum(museum),
    categoryIds: categoryIdsByExhibition.get(exhibition.id) ?? [],
  }));
}

/**
 * Every current-or-upcoming exhibition with its category ids: the shared
 * candidate set for `similar` and `recommendation.forYou`, so neither reads
 * the whole exhibitions/exhibition_category tables on every page view.
 * Keyed by day so a stale cache entry can't outlive "today" even at the full
 * TTL; personal filtering (hidden, visited, interests) always happens after,
 * per request, on top of this shared/public data.
 */
export async function getActiveExhibitionPool(
  db: Db,
): Promise<ActivePoolEntry[]> {
  const today = todayInHelsinki();
  const entries = await cached(
    `active-pool:${today}`,
    ACTIVE_POOL_CACHE_TTL_SECONDS,
    () => loadActivePool(db),
  );
  return entries.map((entry) => ({
    exhibition: deserializeExhibition(entry.exhibition),
    museum: deserializeMuseum(entry.museum),
    categoryIds: entry.categoryIds,
  }));
}
