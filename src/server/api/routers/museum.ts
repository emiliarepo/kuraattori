import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { exhibitions, museums } from "~/server/db/schema";
import { exhibitionRouter, whereVisible } from "./exhibition";

export const museumRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(museums).orderBy(asc(museums.name)),
  ),
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(
      async ({ ctx, input }) =>
        (
          await ctx.db
            .select()
            .from(museums)
            .where(eq(museums.slug, input.slug))
            .limit(1)
        )[0] ?? null,
    ),
  exhibitions: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        state: z.enum(["current", "upcoming", "ended"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const museum = (
        await ctx.db
          .select()
          .from(museums)
          .where(eq(museums.slug, input.slug))
          .limit(1)
      )[0];
      if (!museum) return [];
      const result = await ctx.db
        .select({ slug: exhibitions.slug })
        .from(exhibitions)
        .where(
          and(
            eq(exhibitions.museumId, museum.id),
            eq(exhibitions.kind, "exhibition"),
            whereVisible(ctx.session?.user?.id ?? null),
          ),
        )
        .orderBy(asc(exhibitions.startDate));
      const items = await Promise.all(
        result.map(({ slug }) =>
          exhibitionRouter.createCaller(ctx).bySlug({ slug }),
        ),
      );
      return input.state
        ? items.filter((item) => item?.phase === input.state)
        : items;
    }),
});
