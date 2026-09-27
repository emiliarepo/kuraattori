import { asc } from "drizzle-orm";

import { cached } from "~/server/cache/kv-cache";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { categories } from "~/server/db/schema";
import { deserializeCategory, serializeCategory } from "~/server/db/serialize";

const CATEGORIES_CACHE_TTL_SECONDS = 60 * 60;

export const categoryRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await cached(
      "categories",
      CATEGORIES_CACHE_TTL_SECONDS,
      async () => {
        const rows = await ctx.db
          .select()
          .from(categories)
          .orderBy(asc(categories.name));
        return rows.map(serializeCategory);
      },
    );
    return rows.map(deserializeCategory);
  }),
});
