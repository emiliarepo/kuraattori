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

/**
 * Dev-only: true when `.dev.vars`' `DEV_SIMULATE_D1_FAILURE` names the given
 * tRPC procedure, so error visibility can be verified against a D1-shaped
 * error without a real outage. `.dev.vars` is never shipped by `wrangler
 * deploy` (see `getDb`), so this is always false in production. Also false
 * outside a Worker request (e.g. router tests calling `createCaller`
 * directly), where there's no Cloudflare context to read it from.
 */
export async function shouldSimulateD1Failure(
  procedure: string,
): Promise<boolean> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const flags = env as {
      NEXTJS_ENV?: string;
      DEV_SIMULATE_D1_FAILURE?: string;
    };
    return (
      flags.NEXTJS_ENV === "development" &&
      flags.DEV_SIMULATE_D1_FAILURE === procedure
    );
  } catch {
    return false;
  }
}
