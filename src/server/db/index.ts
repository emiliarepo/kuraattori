import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";

import { wrapD1ForReadBudget } from "./read-budget";
import * as schema from "./schema";

/**
 * The D1 binding only exists once a request reaches the Worker (or the local
 * wrangler proxy in `next dev`), so this can't be a module-level singleton.
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  // `NEXTJS_ENV` comes from `.dev.vars`, which `wrangler dev`/`preview` load
  // locally and `wrangler deploy` never ships — unlike `NODE_ENV`, which
  // `next build` bakes in as "production" for `pnpm preview` too.
  const isLocal = (env as { NEXTJS_ENV?: string }).NEXTJS_ENV === "development";
  const db = isLocal ? wrapD1ForReadBudget(env.DB) : env.DB;
  return drizzle(db, { schema });
}

export type Db = Awaited<ReturnType<typeof getDb>>;
