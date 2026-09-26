import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { userInterests, userRegions } from "~/server/db/schema";

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [regions, interests] = await Promise.all([
      ctx.db
        .select({ region: userRegions.region })
        .from(userRegions)
        .where(eq(userRegions.userId, userId)),
      ctx.db
        .select({
          categoryId: userInterests.categoryId,
          weight: userInterests.weight,
        })
        .from(userInterests)
        .where(eq(userInterests.userId, userId)),
    ]);
    return { regions: regions.map((row) => row.region), interests };
  }),
  updateRegions: protectedProcedure
    .input(z.object({ regions: z.array(z.string().min(1).max(100)).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.delete(userRegions).where(eq(userRegions.userId, userId));
      if (input.regions.length)
        await ctx.db
          .insert(userRegions)
          .values(
            [...new Set(input.regions)].map((region) => ({ userId, region })),
          );
      return { regions: [...new Set(input.regions)] };
    }),
  updateInterests: protectedProcedure
    .input(
      z.object({
        interests: z
          .array(
            z.object({
              categoryId: z.number().int().positive(),
              weight: z.number().int().min(1).max(5).default(1),
            }),
          )
          .max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db
        .delete(userInterests)
        .where(eq(userInterests.userId, userId));
      const interests = [
        ...new Map(
          input.interests.map((interest) => [interest.categoryId, interest]),
        ).values(),
      ];
      if (interests.length)
        await ctx.db
          .insert(userInterests)
          .values(interests.map((interest) => ({ ...interest, userId })));
      return { interests };
    }),
});
