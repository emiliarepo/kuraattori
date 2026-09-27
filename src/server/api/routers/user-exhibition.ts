import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { transitionStatus } from "~/domain/status";
import { todayInHelsinki } from "~/domain/dates";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { exhibitions, museums, userExhibitions } from "~/server/db/schema";

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
        .select({ id: exhibitions.id, startDate: exhibitions.startDate })
        .from(exhibitions)
        .where(eq(exhibitions.id, input.exhibitionId))
        .limit(1);
      if (!exhibition.length) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        input.status === "visited" &&
        exhibition[0]!.startDate > todayInHelsinki()
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Exhibition has not started",
        });
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
            visitedAt:
              transition.visitedAt === "set"
                ? new Date(`${todayInHelsinki()}T12:00:00.000Z`)
                : null,
            note: null,
          })
          .onConflictDoUpdate({
            target: [userExhibitions.userId, userExhibitions.exhibitionId],
            set: {
              status: transition.status,
              visitedAt:
                transition.visitedAt === "set"
                  ? new Date(`${todayInHelsinki()}T12:00:00.000Z`)
                  : null,
              note: null,
              updatedAt: new Date(),
            },
          });
      return { status: transition.status };
    }),
  updateVisit: protectedProcedure
    .input(
      z.object({
        exhibitionId: z.number().int().positive(),
        visitedOn: z.string().date(),
        note: z.string().max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [exhibition] = await ctx.db
        .select({ startDate: exhibitions.startDate })
        .from(exhibitions)
        .where(eq(exhibitions.id, input.exhibitionId))
        .limit(1);
      if (!exhibition) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        input.visitedOn < exhibition.startDate ||
        input.visitedOn > todayInHelsinki()
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid visit date",
        });
      const result = await ctx.db
        .update(userExhibitions)
        .set({
          visitedAt: new Date(`${input.visitedOn}T12:00:00.000Z`),
          note: input.note.trim() || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userExhibitions.userId, ctx.session.user.id),
            eq(userExhibitions.exhibitionId, input.exhibitionId),
            eq(userExhibitions.status, "visited"),
          ),
        );
      return result;
    }),
  listByStatus: protectedProcedure
    .input(z.object({ status: z.enum(["interested", "visited", "hidden"]) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          exhibitionId: userExhibitions.exhibitionId,
          visitedAt: userExhibitions.visitedAt,
          note: userExhibitions.note,
          exhibition: exhibitions,
          museum: museums,
        })
        .from(userExhibitions)
        .innerJoin(
          exhibitions,
          eq(exhibitions.id, userExhibitions.exhibitionId),
        )
        .innerJoin(museums, eq(museums.id, exhibitions.museumId))
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
