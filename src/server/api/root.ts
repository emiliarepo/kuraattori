import { systemRouter } from "~/server/api/routers/system";
import { exhibitionRouter } from "~/server/api/routers/exhibition";
import { museumRouter } from "~/server/api/routers/museum";
import { categoryRouter } from "~/server/api/routers/category";
import { profileRouter } from "~/server/api/routers/profile";
import { userExhibitionRouter } from "~/server/api/routers/user-exhibition";
import { recommendationRouter } from "~/server/api/routers/recommendation";
import { metaRouter } from "~/server/api/routers/meta";
import { myRouter } from "~/server/api/routers/my";
import { tripRouter } from "~/server/api/routers/trip";
import { pushRouter } from "~/server/api/routers/push";
import { editionRouter } from "~/server/api/routers/edition";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  system: systemRouter,
  exhibition: exhibitionRouter,
  museum: museumRouter,
  category: categoryRouter,
  profile: profileRouter,
  userExhibition: userExhibitionRouter,
  recommendation: recommendationRouter,
  meta: metaRouter,
  my: myRouter,
  trip: tripRouter,
  push: pushRouter,
  edition: editionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.system.museumCount();
 */
export const createCaller = createCallerFactory(appRouter);
