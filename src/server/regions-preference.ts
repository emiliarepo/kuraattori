import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { auth } from "~/server/auth";
import { getDb } from "~/server/db";
import { userRegions } from "~/server/db/schema";

export const REGIONS_COOKIE = "kuraattori_regions";

/** Active regions for the request: the signed-in user's saved regions, else the anonymous cookie. */
export async function getActiveRegions(): Promise<string[]> {
  const session = await auth();
  if (session?.user) {
    const db = await getDb();
    const rows = await db
      .select({ region: userRegions.region })
      .from(userRegions)
      .where(eq(userRegions.userId, session.user.id));
    return rows.map((row) => row.region);
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
