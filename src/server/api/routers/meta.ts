import { desc, eq, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { dataSources, exhibitions } from "~/server/db/schema";

/**
 * Small queries that don't belong to exhibition/museum but that pages need
 * and the existing routers don't expose: import recency for the stale-data
 * notice, and whether the Museokortti exception filter has anything to
 * filter (docs/design.md: hidden when every exhibition is eligible).
 */
export const metaRouter = createTRPCRouter({
  lastImportAt: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ at: dataSources.lastSuccessfulImportAt })
      .from(dataSources)
      .where(eq(dataSources.enabled, true))
      .orderBy(desc(dataSources.lastSuccessfulImportAt))
      .limit(1);
    return row?.at?.toISOString() ?? null;
  }),
  hasIneligibleExhibitions: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ exists: sql<number>`1` })
      .from(exhibitions)
      .where(eq(exhibitions.museumCardEligible, false))
      .limit(1);
    return row !== undefined;
  }),
});
