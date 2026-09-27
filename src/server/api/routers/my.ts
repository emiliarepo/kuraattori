import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { exhibitionRouter } from "~/server/api/routers/exhibition";
import { userExhibitionRouter } from "~/server/api/routers/user-exhibition";

/**
 * `userExhibition.listByStatus` returns bare exhibition rows (no museum join
 * or categories); composes it with `exhibition.bySlug` for the museum,
 * categories and phase/urgency the My pages need, the same
 * call-a-sibling-router pattern `museum.exhibitions` already uses.
 */
export const myRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["interested", "visited", "hidden"]) }))
    .query(async ({ ctx, input }) => {
      const rows = await userExhibitionRouter
        .createCaller(ctx)
        .listByStatus(input);
      const items = await Promise.all(
        rows.map((row) =>
          exhibitionRouter
            .createCaller(ctx)
            .bySlug({ slug: row.exhibition.slug }),
        ),
      );
      const found = items.filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );
      // Two group members can each carry the user's status; bySlug then
      // resolves both to the same canonical exhibition.
      const seenSlugs = new Set<string>();
      return found.filter((item) => {
        if (seenSlugs.has(item.slug)) return false;
        seenSlugs.add(item.slug);
        return true;
      });
    }),
});
