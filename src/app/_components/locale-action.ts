"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "~/i18n/locales";
import { auth } from "~/server/auth";
import { getDb } from "~/server/db";
import { users } from "~/server/db/schema";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Saved on the account when signed in; the cookie covers anonymous visits on this device too. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const session = await auth();
  if (session?.user) {
    const db = await getDb();
    await db.update(users).set({ locale }).where(eq(users.id, session.user.id));
  }
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
