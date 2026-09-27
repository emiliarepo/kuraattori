import { cookies } from "next/headers";

export const ONBOARDED_COOKIE = "kuraattori_onboarded";

export async function hasCompletedOnboarding() {
  return (await cookies()).has(ONBOARDED_COOKIE);
}
