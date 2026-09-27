import { and, asc, eq, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { cached } from "~/server/cache/kv-cache";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getActiveExhibitionPool } from "~/server/cache/active-pool";
import { exhibitions, museums, userFollowedMuseums } from "~/server/db/schema";
import { deserializeMuseum, serializeMuseum } from "~/server/db/serialize";
import { onlyExhibitions, whereVisible, withDetails } from "./exhibition";

const MUSEUMS_CACHE_TTL_SECONDS = 60 * 60;

export const museumRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await cached(
      "museums",
      MUSEUMS_CACHE_TTL_SECONDS,
      async () => {
        const rows = await ctx.db
          .select()
          .from(museums)
          .orderBy(asc(museums.name));
        return rows.map(serializeMuseum);
      },
    );
    return rows.map(deserializeMuseum);
  }),
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
      const userId = ctx.session?.user?.id ?? null;
      const ownRows = await ctx.db
        .select({
          id: exhibitions.id,
          exhibitionGroup: exhibitions.exhibitionGroup,
        })
        .from(exhibitions)
        .where(
          and(
            eq(exhibitions.museumId, museum.id),
            onlyExhibitions,
            whereVisible(userId),
          ),
        )
        .orderBy(asc(exhibitions.startDate));
      if (!ownRows.length) return [];

      // A group's other venues can sit at other museums, so pull every row
      // sharing one of this museum's group keys (plus its own group-less
      // rows) in one query instead of resolving each exhibition on its own.
      const groupKeys = [
        ...new Set(
          ownRows.flatMap((row) =>
            row.exhibitionGroup ? [row.exhibitionGroup] : [],
          ),
        ),
      ];
      const singletonIds = ownRows
        .filter((row) => row.exhibitionGroup === null)
        .map((row) => row.id);
      const allRows = await ctx.db
        .select({ exhibition: exhibitions, museum: museums })
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(
          or(
            groupKeys.length
              ? inArray(exhibitions.exhibitionGroup, groupKeys)
              : undefined,
            singletonIds.length
              ? inArray(exhibitions.id, singletonIds)
              : undefined,
          ),
        );
      const items = await withDetails(ctx.db, allRows, userId);
      const itemByMemberId = new Map(
        items.flatMap((item) =>
          item.memberIds.map((id) => [id, item] as const),
        ),
      );
      const seen = new Set<number>();
      const ordered = ownRows.flatMap((row) => {
        const item = itemByMemberId.get(row.id);
        if (!item || seen.has(item.id)) return [];
        seen.add(item.id);
        return [item];
      });
      return input.state
        ? ordered.filter((item) => item.phase === input.state)
        : ordered;
    }),
  follow: protectedProcedure
    .input(z.object({ museumId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const museum = await ctx.db
        .select({ id: museums.id })
        .from(museums)
        .where(eq(museums.id, input.museumId))
        .limit(1);
      if (!museum.length) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .insert(userFollowedMuseums)
        .values({ userId: ctx.session.user.id, museumId: input.museumId })
        .onConflictDoNothing();
      return { following: true };
    }),
  unfollow: protectedProcedure
    .input(z.object({ museumId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userFollowedMuseums)
        .where(
          and(
            eq(userFollowedMuseums.userId, ctx.session.user.id),
            eq(userFollowedMuseums.museumId, input.museumId),
          ),
        );
      return { following: false };
    }),
  /** Followed museums with enough detail to render the profile's unfollow list. */
  followed: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: museums.id,
        name: museums.name,
        slug: museums.slug,
        city: museums.city,
      })
      .from(userFollowedMuseums)
      .innerJoin(museums, eq(museums.id, userFollowedMuseums.museumId))
      .where(eq(userFollowedMuseums.userId, ctx.session.user.id))
      .orderBy(asc(museums.name));
  }),
  /**
   * Current and upcoming exhibitions at followed museums, one entry per
   * exhibition group, soonest-ending first. Built from the shared active
   * pool (public, cached) so only the follow list itself is a per-user read.
   */
  followedExhibitions: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const followed = await ctx.db
        .select({ id: userFollowedMuseums.museumId })
        .from(userFollowedMuseums)
        .where(eq(userFollowedMuseums.userId, userId));
      if (!followed.length) return [];
      const followedIds = new Set(followed.map((row) => row.id));

      const pool = await getActiveExhibitionPool(ctx.db);
      const ownEntries = pool.filter((entry) =>
        followedIds.has(entry.museum.id),
      );
      if (!ownEntries.length) return [];
      const ownIds = new Set(ownEntries.map((entry) => entry.exhibition.id));
      const groupKeys = new Set(
        ownEntries.flatMap((entry) =>
          entry.exhibition.exhibitionGroup
            ? [entry.exhibition.exhibitionGroup]
            : [],
        ),
      );
      const allRows = pool
        .filter(
          (entry) =>
            ownIds.has(entry.exhibition.id) ||
            (entry.exhibition.exhibitionGroup !== null &&
              groupKeys.has(entry.exhibition.exhibitionGroup)),
        )
        .map(({ exhibition, museum }) => ({ exhibition, museum }));

      const items = await withDetails(ctx.db, allRows, userId);
      return items
        .filter((item) => item.status !== "hidden")
        .sort(
          (a, b) =>
            (a.endDate ?? "9999-12-31").localeCompare(
              b.endDate ?? "9999-12-31",
            ) || a.id - b.id,
        )
        .slice(0, input?.limit ?? 20);
    }),
});
