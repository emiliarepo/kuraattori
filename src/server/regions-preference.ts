import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { auth } from "~/server/auth";
import { getDb } from "~/server/db";
import { userRegions } from "~/server/db/schema";
import { logServerError } from "~/server/observability/log-error";

export const REGIONS_COOKIE = "kuraattori_regions";

/**
 * Active regions for the request: the signed-in user's saved regions, else
 * the anonymous cookie. Falls back to no active regions (no filter applied)
 * on a D1 failure, rather than crashing the masthead and every page that
 * calls this outside a tRPC procedure.
 */
export async function getActiveRegions(): Promise<string[]> {
  const session = await auth();
  if (session?.user) {
    try {
      const db = await getDb();
      const rows = await db
        .select({ region: userRegions.region })
        .from(userRegions)
        .where(eq(userRegions.userId, session.user.id));
      return rows.map((row) => row.region);
    } catch (error) {
      logServerError("getActiveRegions", error, { userId: session.user.id });
      return [];
    }
  }

  const raw = (await cookies()).get(REGIONS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((region): region is string => typeof region === "string")
      : [];
  } catch {
    return [];
  }
}
