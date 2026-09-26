import { sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { museums } from "~/server/db/schema";

export const systemRouter = createTRPCRouter({
  museumCount: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(museums);
    return row?.count ?? 0;
  }),
});
