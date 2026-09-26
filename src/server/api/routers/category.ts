import { asc } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { categories } from "~/server/db/schema";

export const categoryRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(categories).orderBy(asc(categories.name)),
  ),
});
