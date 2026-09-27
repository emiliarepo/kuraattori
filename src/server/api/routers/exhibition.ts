import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { getDaysRemaining, getPhase, todayInHelsinki } from "~/domain/dates";
import { getUrgency } from "~/domain/urgency";
import { batchedByIds } from "~/server/api/batch";
import { groupExhibitionRows } from "~/server/api/grouping";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { listCategories } from "~/server/api/routers/category";
import { getActiveExhibitionPool } from "~/server/cache/active-pool";
import {
  exhibitionCategories,
  exhibitions,
  museums,
  userExhibitions,
} from "~/server/db/schema";
import { endDateOrFar } from "~/server/db/expressions";
import type { createTRPCContext } from "~/server/api/trpc";
import type { Db } from "~/server/db";

const NEW_WITHIN_DAYS = 30;

const ids = z.array(z.number().int().positive()).max(40);
const regions = z.array(z.string().min(1)).max(40);
const listInput = z.object({
  regions: regions.optional(),
  city: z.string().min(1).optional(),
  museumIds: ids.optional(),
  categoryIds: ids.optional(),
  museumCardOnly: z.boolean().optional(),
  state: z.enum(["current", "upcoming"]).optional(),
  endingWithinDays: z.number().int().min(0).max(365).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  cursor: z
    .string()
    .regex(/^(?:\d{4}-\d{2}-\d{2}|9999-12-31)\|\d+$/)
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const selectExhibitions = () => ({ exhibition: exhibitions, museum: museums });
export const onlyExhibitions = eq(exhibitions.kind, "exhibition");
/**
 * Excludes exhibitions the user has marked with any of `statuses`, expanding
 * to the whole group: a group is one thing to the user, even split across
 * rows for traceability. Uncorrelated `not in` subqueries run once per
 * statement; a correlated `not exists` ran once per scanned row.
 */
const whereNoUserStatus = (
  userId: string | null,
  statuses: readonly (typeof userExhibitions.$inferSelect)["status"][],
) => {
  if (!userId) return undefined;
  const statusList = sql.join(
    statuses.map((status) => sql`${status}`),
    sql`, `,
  );
  return sql`(${exhibitions.id} not in (
      select ue.exhibitionId from ${userExhibitions} ue
      where ue.userId = ${userId} and ue.status in (${statusList})
    )
    and (${exhibitions.exhibitionGroup} is null or ${exhibitions.exhibitionGroup} not in (
      select e2.exhibitionGroup from ${userExhibitions} ue
      inner join ${exhibitions} e2 on e2.id = ue.exhibitionId
      where ue.userId = ${userId} and ue.status in (${statusList})
        and e2.exhibitionGroup is not null
    )))`;
};

export const whereVisible = (userId: string | null) =>
  whereNoUserStatus(userId, ["hidden"]);

type ApiContext = Awaited<ReturnType<typeof createTRPCContext>>;
type ListInput = z.infer<typeof listInput>;

async function loadCategoryIds(db: Db, exhibitionIds: readonly number[]) {
  const rows = await batchedByIds(exhibitionIds, (batch) =>
    db
      .select({
        exhibitionId: exhibitionCategories.exhibitionId,
        categoryId: exhibitionCategories.categoryId,
      })
      .from(exhibitionCategories)
      .where(inArray(exhibitionCategories.exhibitionId, batch)),
  );
  const byExhibition = new Map<number, number[]>();
  for (const row of rows)
    byExhibition.set(row.exhibitionId, [
      ...(byExhibition.get(row.exhibitionId) ?? []),
      row.categoryId,
    ]);
  return byExhibition;
}

/** The user's hidden exhibitions as an in-memory predicate, with the same group expansion as `whereVisible`. */
export async function loadHiddenMatcher(db: Db, userId: string | null) {
  const hiddenRows = userId
    ? await db
        .select({
          exhibitionId: userExhibitions.exhibitionId,
          exhibitionGroup: exhibitions.exhibitionGroup,
        })
        .from(userExhibitions)
        .innerJoin(
          exhibitions,
          eq(exhibitions.id, userExhibitions.exhibitionId),
        )
        .where(
          and(
            eq(userExhibitions.userId, userId),
            eq(userExhibitions.status, "hidden"),
          ),
        )
    : [];
  const hiddenIds = new Set(hiddenRows.map((row) => row.exhibitionId));
  const hiddenGroups = new Set(
    hiddenRows.flatMap((row) =>
      row.exhibitionGroup ? [row.exhibitionGroup] : [],
    ),
  );
  return (exhibition: typeof exhibitions.$inferSelect) =>
    hiddenIds.has(exhibition.id) ||
    (exhibition.exhibitionGroup !== null &&
      hiddenGroups.has(exhibition.exhibitionGroup));
}

export async function withDetails(
  db: Db,
  rows: {
    exhibition: typeof exhibitions.$inferSelect;
    museum: typeof museums.$inferSelect;
  }[],
  userId: string | null,
  /** From the active pool, so a large result set doesn't query exhibition_category again. */
  poolCategoryIds?: ReadonlyMap<number, readonly number[]>,
) {
  if (!rows.length) return [];
  const groups = groupExhibitionRows(rows);
  const canonicalIds = groups.map((group) => group.exhibition.id);
  const memberIds = groups.flatMap((group) => group.memberIds);
  const categoryIdsByExhibition =
    poolCategoryIds ?? (await loadCategoryIds(db, canonicalIds));
  const categoryById = new Map(
    (await listCategories(db)).map((category) => [category.id, category]),
  );
  const states = userId
    ? await batchedByIds(memberIds, (batch) =>
        db
          .select({
            exhibitionId: userExhibitions.exhibitionId,
            status: userExhibitions.status,
            visitedAt: userExhibitions.visitedAt,
            note: userExhibitions.note,
            rating: userExhibitions.rating,
          })
          .from(userExhibitions)
          .where(
            and(
              eq(userExhibitions.userId, userId),
              inArray(userExhibitions.exhibitionId, batch),
            ),
          ),
      )
    : [];
  const today = todayInHelsinki();
  return groups.map(({ exhibition, museum, venues, memberIds: groupIds }) => ({
    ...exhibition,
    phase: getPhase(exhibition, today),
    daysRemaining: getDaysRemaining(exhibition, today),
    urgency: getUrgency(exhibition, today),
    museum,
    venues,
    /** Every exhibition id this canonical row stands in for (itself, or its whole group). */
    memberIds: groupIds,
    categories: (categoryIdsByExhibition.get(exhibition.id) ?? []).flatMap(
      (categoryId) => {
        const category = categoryById.get(categoryId);
        return category
          ? [
              {
                id: category.id,
                name: category.name,
                nameEn: category.nameEn,
                nameSv: category.nameSv,
                slug: category.slug,
              },
            ]
          : [];
      },
    ),
    status:
      states.find((state) => groupIds.includes(state.exhibitionId))?.status ??
      null,
    visitedAt:
      states.find((state) => groupIds.includes(state.exhibitionId))
        ?.visitedAt ?? null,
    visitNote:
      states.find((state) => groupIds.includes(state.exhibitionId))?.note ??
      null,
    rating:
      states.find((state) => groupIds.includes(state.exhibitionId))?.rating ??
      null,
  }));
}

async function listExhibitions(ctx: ApiContext, input: ListInput) {
  const today = todayInHelsinki();
  const filters = [
    onlyExhibitions,
    whereVisible(ctx.session?.user?.id ?? null),
  ];
  if (input.regions?.length)
    filters.push(inArray(museums.region, input.regions));
  if (input.city) filters.push(eq(museums.city, input.city));
  if (input.museumIds?.length)
    filters.push(inArray(museums.id, input.museumIds));
  if (input.museumCardOnly)
    filters.push(eq(exhibitions.museumCardEligible, true));
  if (input.state === "upcoming")
    filters.push(gt(exhibitions.startDate, today));
  // One combined lower bound: SQLite seeks `exhibition_kind_end_idx` by a
  // single range term, and a cursor's `or` can't be used for the seek.
  const endLowerBounds: string[] = [];
  if (input.state === "current") {
    filters.push(lte(exhibitions.startDate, today));
    endLowerBounds.push(today);
  }
  if (input.endingWithinDays !== undefined) {
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + input.endingWithinDays);
    filters.push(lte(endDateOrFar, end.toISOString().slice(0, 10)));
    endLowerBounds.push(today);
  }
  if (input.search)
    filters.push(
      or(
        like(exhibitions.titleFi, `%${input.search}%`),
        like(exhibitions.titleEn, `%${input.search}%`),
        like(exhibitions.titleSv, `%${input.search}%`),
        like(museums.name, `%${input.search}%`),
        like(museums.nameEn, `%${input.search}%`),
        like(museums.nameSv, `%${input.search}%`),
        like(museums.city, `%${input.search}%`),
      ),
    );
  if (input.categoryIds?.length)
    filters.push(
      exists(
        ctx.db
          .select({ id: exhibitionCategories.exhibitionId })
          .from(exhibitionCategories)
          .where(
            and(
              eq(exhibitionCategories.exhibitionId, exhibitions.id),
              inArray(exhibitionCategories.categoryId, input.categoryIds),
            ),
          ),
      ),
    );
  if (input.cursor) {
    const separator = input.cursor.lastIndexOf("|");
    const date = input.cursor.slice(0, separator);
    const id = Number(input.cursor.slice(separator + 1));
    filters.push(
      or(
        gt(endDateOrFar, date),
        and(eq(endDateOrFar, date), gt(exhibitions.id, id)),
      ),
    );
    endLowerBounds.push(date);
  }
  const endFrom = endLowerBounds.sort().at(-1);
  if (endFrom) filters.push(gte(endDateOrFar, endFrom));
  const rows = await ctx.db
    .select(selectExhibitions())
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(and(...filters))
    .orderBy(asc(endDateOrFar), asc(exhibitions.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const last = page.at(-1)?.exhibition;
  return {
    items: await withDetails(ctx.db, page, ctx.session?.user?.id ?? null),
    nextCursor:
      hasMore && last ? `${last.endDate ?? "9999-12-31"}|${last.id}` : null,
  };
}

export const exhibitionRouter = createTRPCRouter({
  list: publicProcedure
    .input(listInput)
    .query(({ ctx, input }) => listExhibitions(ctx, input)),
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select(selectExhibitions())
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(eq(exhibitions.slug, input.slug))
        .limit(1);
      if (!row) return null;
      // Grouped siblings, so the detail page can list every venue.
      const rows = row.exhibition.exhibitionGroup
        ? await ctx.db
            .select(selectExhibitions())
            .from(exhibitions)
            .innerJoin(museums, eq(exhibitions.museumId, museums.id))
            .where(
              and(
                onlyExhibitions,
                eq(exhibitions.exhibitionGroup, row.exhibition.exhibitionGroup),
              ),
            )
        : [row];
      const [item] = await withDetails(
        ctx.db,
        rows,
        ctx.session?.user?.id ?? null,
      );
      return item;
    }),
  similar: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [source] = await ctx.db
        .select({ exhibition: exhibitions, museum: museums })
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(eq(exhibitions.slug, input.slug))
        .limit(1);
      if (!source) return [];

      const userId = ctx.session?.user?.id ?? null;
      const sourceGroup = source.exhibition.exhibitionGroup;
      const sourceCategoryRows = await ctx.db
        .selectDistinct({ categoryId: exhibitionCategories.categoryId })
        .from(exhibitionCategories)
        .innerJoin(
          exhibitions,
          eq(exhibitions.id, exhibitionCategories.exhibitionId),
        )
        .where(
          sourceGroup
            ? eq(exhibitions.exhibitionGroup, sourceGroup)
            : eq(exhibitions.id, source.exhibition.id),
        );
      const sourceCategoryIds = new Set(
        sourceCategoryRows.map((row) => row.categoryId),
      );

      const isHidden = await loadHiddenMatcher(ctx.db, userId);

      const scoreOf = (
        museum: typeof museums.$inferSelect,
        categoryIds: readonly number[],
      ) =>
        categoryIds.filter((id) => sourceCategoryIds.has(id)).length * 10 +
        (museum.region !== null && museum.region === source.museum.region
          ? 5
          : 0) +
        (museum.id === source.museum.id ? 3 : 0);
      const pool = await getActiveExhibitionPool(ctx.db);
      const candidates = pool.flatMap(({ exhibition, museum, categoryIds }) => {
        if (isHidden(exhibition)) return [];
        const isSourceGroup = sourceGroup
          ? exhibition.exhibitionGroup === sourceGroup
          : exhibition.id === source.exhibition.id;
        if (isSourceGroup) return [];
        return [{ exhibition, museum, score: scoreOf(museum, categoryIds) }];
      });

      const byGroup = new Map<string, typeof candidates>();
      for (const candidate of candidates) {
        const key =
          candidate.exhibition.exhibitionGroup ??
          `id:${candidate.exhibition.id}`;
        byGroup.set(key, [...(byGroup.get(key) ?? []), candidate]);
      }
      const ranked = [...byGroup.values()]
        .map((members) => ({
          members,
          score: Math.max(...members.map((member) => member.score)),
          endDate: members
            .map((member) => member.exhibition.endDate ?? "9999-12-31")
            .sort()[0]!,
        }))
        .sort((a, b) => b.score - a.score || a.endDate.localeCompare(b.endDate))
        .slice(0, 6);
      const items = await withDetails(
        ctx.db,
        ranked.flatMap(({ members }) =>
          members.map(({ exhibition, museum }) => ({ exhibition, museum })),
        ),
        userId,
      );
      const itemsByGroup = new Map(
        items.map((item) => [item.exhibitionGroup ?? `id:${item.id}`, item]),
      );
      return ranked.flatMap(({ members }) => {
        const item = itemsByGroup.get(
          members[0]!.exhibition.exhibitionGroup ??
            `id:${members[0]!.exhibition.id}`,
        );
        return item ? [item] : [];
      });
    }),
  endingSoon: publicProcedure
    .input(
      z
        .object({
          days: z.number().int().min(0).max(365).default(14),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      listExhibitions(
        ctx,
        listInput.parse({
          endingWithinDays: input?.days ?? 14,
          state: "current",
          limit: input?.limit ?? 20,
        }),
      ),
    ),
  upcoming: publicProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .optional(),
    )
    .query(({ ctx, input }) =>
      listExhibitions(
        ctx,
        listInput.parse({ state: "upcoming", limit: input?.limit ?? 20 }),
      ),
    ),
  new: publicProcedure
    .input(
      z
        .object({
          regions: regions.optional(),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const today = todayInHelsinki();
      const openedSince = new Date(`${today}T00:00:00Z`);
      openedSince.setUTCDate(openedSince.getUTCDate() - NEW_WITHIN_DAYS);
      const filters = [
        onlyExhibitions,
        // Visited exhibitions are still on Päättyy pian and in lists, just not here.
        whereNoUserStatus(ctx.session?.user?.id ?? null, ["hidden", "visited"]),
        gte(exhibitions.startDate, openedSince.toISOString().slice(0, 10)),
        lte(exhibitions.startDate, today),
      ];
      if (input?.regions?.length)
        filters.push(inArray(museums.region, input.regions));
      const rows = await ctx.db
        .select(selectExhibitions())
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(and(...filters))
        .orderBy(desc(exhibitions.startDate), desc(exhibitions.id))
        .limit(input?.limit ?? 20);
      return withDetails(ctx.db, rows, ctx.session?.user?.id ?? null);
    }),
});
