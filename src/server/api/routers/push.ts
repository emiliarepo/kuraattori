import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { pushSubscriptions } from "~/server/db/schema";

const endpoint = z.string().url().max(2000);

export const pushRouter = createTRPCRouter({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint,
        keys: z.object({
          p256dh: z.string().min(1).max(200),
          auth: z.string().min(1).max(100),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values = {
        userId: ctx.session.user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      };
      await ctx.db
        .insert(pushSubscriptions)
        .values({ endpoint: input.endpoint, ...values })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: values,
        });
    }),
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.endpoint, input.endpoint),
            eq(pushSubscriptions.userId, ctx.session.user.id),
          ),
        );
    }),
});
