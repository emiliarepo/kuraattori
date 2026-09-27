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
import { groupExhibitionRows } from "~/server/api/grouping";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  categories,
  exhibitionCategories,
  exhibitions,
  museums,
  userExhibitions,
} from "~/server/db/schema";
import type { createTRPCContext } from "~/server/api/trpc";
import type { Db } from "~/server/db";

const NEW_WITHIN_DAYS = 30;

const ids = z.array(z.number().int().positive()).max(40);
const listInput = z.object({
  region: z.string().min(1).optional(),
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
const onlyExhibitions = eq(exhibitions.kind, "exhibition");
/** Hidden on any member hides the whole group: a group is one thing to the user, even split across rows for traceability. */
export const whereVisible = (userId: string | null) =>
  userId
    ? sql`not exists (
        select 1 from ${userExhibitions} ue
        inner join ${exhibitions} e2 on e2.id = ue.exhibitionId
        where ue.userId = ${userId}
          and ue.status = 'hidden'
          and (e2.id = ${exhibitions.id}
            or (${exhibitions.exhibitionGroup} is not null and e2.exhibitionGroup = ${exhibitions.exhibitionGroup}))
      )`
    : undefined;

type ApiContext = Awaited<ReturnType<typeof createTRPCContext>>;
type ListInput = z.infer<typeof listInput>;

const ID_BATCH_SIZE = 90;

/** Runs `fetch` over `ids` in batches, staying under D1's SQL variable limit for large `IN` lists. */
async function batchedByIds<T>(
  ids: readonly number[],
  fetch: (batch: number[]) => Promise<T[]>,
): Promise<T[]> {
  const results: T[] = [];
  for (let offset = 0; offset < ids.length; offset += ID_BATCH_SIZE) {
    results.push(...(await fetch(ids.slice(offset, offset + ID_BATCH_SIZE))));
  }
  return results;
}

export async function withDetails(
  db: Db,
  rows: {
    exhibition: typeof exhibitions.$inferSelect;
    museum: typeof museums.$inferSelect;
  }[],
  userId: string | null,
) {
  if (!rows.length) return [];
  const groups = groupExhibitionRows(rows);
  const canonicalIds = groups.map((group) => group.exhibition.id);
  const memberIds = groups.flatMap((group) => group.memberIds);
  const categoryRows = await batchedByIds(canonicalIds, (batch) =>
    db
      .select({
        exhibitionId: exhibitionCategories.exhibitionId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(exhibitionCategories)
      .innerJoin(categories, eq(categories.id, exhibitionCategories.categoryId))
      .where(inArray(exhibitionCategories.exhibitionId, batch)),
  );
  const states = userId
    ? await batchedByIds(memberIds, (batch) =>
        db
          .select({
            exhibitionId: userExhibitions.exhibitionId,
            status: userExhibitions.status,
            visitedAt: userExhibitions.visitedAt,
            note: userExhibitions.note,
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
    categories: categoryRows
      .filter((c) => c.exhibitionId === exhibition.id)
      .map(({ id, name, slug }) => ({ id, name, slug })),
    status:
      states.find((state) => groupIds.includes(state.exhibitionId))?.status ??
      null,
    visitedAt:
      states.find((state) => groupIds.includes(state.exhibitionId))
        ?.visitedAt ?? null,
    visitNote:
      states.find((state) => groupIds.includes(state.exhibitionId))?.note ??
      null,
  }));
}

async function listExhibitions(ctx: ApiContext, input: ListInput) {
  const today = todayInHelsinki();
  const filters = [
    onlyExhibitions,
    whereVisible(ctx.session?.user?.id ?? null),
  ];
  if (input.region) filters.push(eq(museums.region, input.region));
  if (input.city) filters.push(eq(museums.city, input.city));
  if (input.museumIds?.length)
    filters.push(inArray(museums.id, input.museumIds));
  if (input.museumCardOnly)
    filters.push(eq(exhibitions.museumCardEligible, true));
  if (input.state === "upcoming")
    filters.push(gt(exhibitions.startDate, today));
  if (input.state === "current")
    filters.push(
      and(
        lte(exhibitions.startDate, today),
        or(
          sql`${exhibitions.endDate} is null`,
          gte(exhibitions.endDate, today),
        ),
      ),
    );
  if (input.endingWithinDays !== undefined) {
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + input.endingWithinDays);
    filters.push(
      and(
        gte(exhibitions.endDate, today),
        lte(exhibitions.endDate, end.toISOString().slice(0, 10)),
      ),
    );
  }
  if (input.search)
    filters.push(
      or(
        like(exhibitions.titleFi, `%${input.search}%`),
        like(museums.name, `%${input.search}%`),
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
        gt(sql`coalesce(${exhibitions.endDate}, '9999-12-31')`, date),
        and(
          eq(sql`coalesce(${exhibitions.endDate}, '9999-12-31')`, date),
          gt(exhibitions.id, id),
        ),
      ),
    );
  }
  const rows = await ctx.db
    .select(selectExhibitions())
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(and(...filters))
    .orderBy(
      asc(sql`coalesce(${exhibitions.endDate}, '9999-12-31')`),
      asc(exhibitions.id),
    )
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

      const today = todayInHelsinki();
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
      const sourceCategoryIds = sourceCategoryRows.map((row) => row.categoryId);
      const sharedCounts = new Map<number, number>();
      if (sourceCategoryIds.length > 0) {
        const countRows = await batchedByIds(sourceCategoryIds, (batch) =>
          ctx.db
            .select({
              exhibitionId: exhibitionCategories.exhibitionId,
              shared: sql<number>`count(*)`,
            })
            .from(exhibitionCategories)
            .where(inArray(exhibitionCategories.categoryId, batch))
            .groupBy(exhibitionCategories.exhibitionId),
        );
        for (const row of countRows) {
          sharedCounts.set(
            row.exhibitionId,
            (sharedCounts.get(row.exhibitionId) ?? 0) + row.shared,
          );
        }
      }
      const scoreOf = (
        exhibition: typeof exhibitions.$inferSelect,
        museum: typeof museums.$inferSelect,
      ) =>
        (sharedCounts.get(exhibition.id) ?? 0) * 10 +
        (museum.region !== null && museum.region === source.museum.region
          ? 5
          : 0) +
        (museum.id === source.museum.id ? 3 : 0);
      const candidates = await ctx.db
        .select({ exhibition: exhibitions, museum: museums })
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(
          and(
            onlyExhibitions,
            whereVisible(ctx.session?.user?.id ?? null),
            or(
              and(
                lte(exhibitions.startDate, today),
                or(
                  sql`${exhibitions.endDate} is null`,
                  gte(exhibitions.endDate, today),
                ),
              ),
              gt(exhibitions.startDate, today),
            ),
            source.exhibition.exhibitionGroup
              ? or(
                  sql`${exhibitions.exhibitionGroup} is null`,
                  sql`${exhibitions.exhibitionGroup} != ${source.exhibition.exhibitionGroup}`,
                )
              : sql`${exhibitions.id} != ${source.exhibition.id}`,
          ),
        )
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            score: scoreOf(row.exhibition, row.museum),
          })),
        );

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
        ctx.session?.user?.id ?? null,
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
          region: z.string().min(1).optional(),
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
        whereVisible(ctx.session?.user?.id ?? null),
        gte(exhibitions.startDate, openedSince.toISOString().slice(0, 10)),
        lte(exhibitions.startDate, today),
      ];
      if (input?.region) filters.push(eq(museums.region, input.region));
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
