import { join } from "node:path";

import { asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";

import * as schema from "~/server/db/schema";
import {
  FROZEN_NOW,
  VISUAL_PERSIST_DIR,
  VISUAL_USER_EMAIL,
} from "../e2e/visual/env";

/**
 * Writes the visual-regression user straight into D1 after `e2e-seed.ts`, so
 * every run starts from identical rows. Dev sign-in looks users up by email
 * and reuses this one.
 */
const STATUSES = {
  "pentti-kokko-kaupunkitarinoita": "interested",
  muumimukimania: "interested",
  "oliver-beer-resonance-project-the-cave": "interested",
  "intervallum-nakymia-kiertokulkuihin": "visited",
  "edith-karlson-sarastus": "visited",
} as const;
const INTEREST_WEIGHTS = [2, 1];

const now = new Date(FROZEN_NOW);
const proxy = await getPlatformProxy<CloudflareEnv>({
  persist: { path: join(import.meta.dirname, "..", VISUAL_PERSIST_DIR, "v3") },
});
try {
  const db = drizzle(proxy.env.DB, { schema });
  const userId = "visual-user";
  await db
    .insert(schema.users)
    .values({ id: userId, email: VISUAL_USER_EMAIL, name: "Visual" });

  const rows = await db
    .select({ id: schema.exhibitions.id, slug: schema.exhibitions.slug })
    .from(schema.exhibitions)
    .where(inArray(schema.exhibitions.slug, Object.keys(STATUSES)));
  if (rows.length !== Object.keys(STATUSES).length)
    throw new Error("a visual-seed exhibition slug is missing from the seed");
  await db.insert(schema.userExhibitions).values(
    rows.map((row) => {
      const status = STATUSES[row.slug as keyof typeof STATUSES];
      return {
        userId,
        exhibitionId: row.id,
        status,
        visitedAt: status === "visited" ? now : null,
        createdAt: now,
        updatedAt: now,
      };
    }),
  );

  const categories = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .orderBy(asc(schema.categories.id));
  await db.insert(schema.userInterests).values(
    INTEREST_WEIGHTS.map((weight, index) => ({
      userId,
      categoryId: categories[index]!.id,
      weight,
    })),
  );
} finally {
  await proxy.dispose();
}
