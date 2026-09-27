import "server-only";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { auth } from "~/server/auth";
import { getDb } from "~/server/db";
import { users } from "~/server/db/schema";

import { i18nFor, type I18n } from ".";
import { LOCALE_COOKIE, resolveLocale } from "./locales";

async function savedLocale(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.locale ?? null;
}

/** The request's locale and strings, resolved once per request. */
export const getI18n = cache(async (): Promise<I18n> => {
  const [session, cookieStore, headerList] = await Promise.all([
    auth(),
    cookies(),
    headers(),
  ]);
  const userLocale = session?.user ? await savedLocale(session.user.id) : null;
  return i18nFor(
    resolveLocale(
      userLocale,
      cookieStore.get(LOCALE_COOKIE)?.value,
      headerList.get("accept-language"),
    ),
  );
});
