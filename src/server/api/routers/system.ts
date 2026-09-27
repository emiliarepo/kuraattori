import { asc, isNotNull, sql } from "drizzle-orm";

import { cached } from "~/server/cache/kv-cache";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { museums } from "~/server/db/schema";

const REGIONS_CACHE_TTL_SECONDS = 60 * 60;

export const systemRouter = createTRPCRouter({
  museumCount: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(museums);
    return row?.count ?? 0;
  }),
  /** Read on every page (the header's RegionSelector); public and changes only on import. */
  regions: publicProcedure.query(({ ctx }) =>
    cached("regions", REGIONS_CACHE_TTL_SECONDS, async () => {
      const rows = await ctx.db
        .selectDistinct({ region: museums.region })
        .from(museums)
        .where(isNotNull(museums.region))
        .orderBy(asc(museums.region));
      return rows
        .map((row) => row.region)
        .filter((region): region is string => region !== null);
    }),
  ),
});
