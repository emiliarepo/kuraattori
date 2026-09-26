import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { transitionStatus } from "~/domain/status";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { exhibitions, userExhibitions } from "~/server/db/schema";

export const userExhibitionRouter = createTRPCRouter({
  setStatus: protectedProcedure
    .input(
      z.object({
        exhibitionId: z.number().int().positive(),
        status: z.enum(["interested", "visited", "hidden"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const exhibition = await ctx.db
        .select({ id: exhibitions.id })
        .from(exhibitions)
        .where(eq(exhibitions.id, input.exhibitionId))
        .limit(1);
      if (!exhibition.length) throw new TRPCError({ code: "NOT_FOUND" });
      const prior = (
        await ctx.db
          .select()
          .from(userExhibitions)
          .where(
            and(
              eq(userExhibitions.userId, userId),
              eq(userExhibitions.exhibitionId, input.exhibitionId),
            ),
          )
          .limit(1)
      )[0];
      const transition = transitionStatus(prior?.status ?? null, input.status);
      if (!transition.status)
        await ctx.db
          .delete(userExhibitions)
          .where(
            and(
              eq(userExhibitions.userId, userId),
              eq(userExhibitions.exhibitionId, input.exhibitionId),
            ),
          );
      else
        await ctx.db
          .insert(userExhibitions)
          .values({
            userId,
            exhibitionId: input.exhibitionId,
            status: transition.status,
            visitedAt: transition.visitedAt === "set" ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: [userExhibitions.userId, userExhibitions.exhibitionId],
            set: {
              status: transition.status,
              visitedAt: transition.visitedAt === "set" ? new Date() : null,
              updatedAt: new Date(),
            },
          });
      return { status: transition.status };
    }),
  listByStatus: protectedProcedure
    .input(z.object({ status: z.enum(["interested", "visited", "hidden"]) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          exhibitionId: userExhibitions.exhibitionId,
          visitedAt: userExhibitions.visitedAt,
          exhibition: exhibitions,
        })
        .from(userExhibitions)
        .innerJoin(
          exhibitions,
          eq(exhibitions.id, userExhibitions.exhibitionId),
        )
        .where(
          and(
            eq(userExhibitions.userId, ctx.session.user.id),
            eq(userExhibitions.status, input.status),
          ),
        )
        .orderBy(desc(userExhibitions.visitedAt), desc(exhibitions.startDate));
      return rows;
    }),
});
