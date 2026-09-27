"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { REGIONS_COOKIE } from "~/server/regions-preference";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function persistRegionsCookie(regions: string[]) {
  (await cookies()).set(REGIONS_COOKIE, JSON.stringify(regions), {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
