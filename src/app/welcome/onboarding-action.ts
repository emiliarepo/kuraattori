"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ONBOARDED_COOKIE } from "~/app/welcome/onboarding-cookie";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function markOnboardingDone() {
  (await cookies()).set(ONBOARDED_COOKIE, "1", {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  // The header's region selector reads regions/interests just saved by this
  // flow; without this, a cached "/" segment can still show the old values.
  revalidatePath("/", "layout");
}
