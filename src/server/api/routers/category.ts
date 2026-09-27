import { asc } from "drizzle-orm";

import { cached } from "~/server/cache/kv-cache";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { categories } from "~/server/db/schema";
import { deserializeCategory, serializeCategory } from "~/server/db/serialize";
import type { Db } from "~/server/db";

const CATEGORIES_CACHE_TTL_SECONDS = 60 * 60;

export async function listCategories(db: Db) {
  const rows = await cached(
    "categories",
    CATEGORIES_CACHE_TTL_SECONDS,
    async () => {
      const rows = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.name));
      return rows.map(serializeCategory);
    },
  );
  return rows.map(deserializeCategory);
}

export const categoryRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => listCategories(ctx.db)),
});
