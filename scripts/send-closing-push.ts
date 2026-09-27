import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import webpush, { WebPushError } from "web-push";
import { getPlatformProxy } from "wrangler";

import { CLOSING_PUSH_DAYS, selectClosingPushes } from "~/domain/closing-push";
import { addDays, todayInHelsinki } from "~/domain/dates";
import { type Db } from "~/server/db";
import * as schema from "~/server/db/schema";
import {
  exhibitions,
  museums,
  pushSent,
  pushSubscriptions,
  userExhibitions,
  users,
} from "~/server/db/schema";
import { VAPID_PUBLIC_KEY } from "~/push/vapid";

import { createRemoteDb } from "./d1-http-driver";

const SITE_URL = "https://kuraattori.emialis.com";

interface Payload {
  title: string;
  body: string;
  url: string;
}

async function getDb(): Promise<{ db: Db; dispose: () => Promise<void> }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;
  if (accountId && apiToken && databaseId)
    return {
      db: createRemoteDb({ accountId, apiToken, databaseId }) as unknown as Db,
      dispose: async () => {},
    };
  const proxy = await getPlatformProxy<CloudflareEnv>();
  return { db: drizzle(proxy.env.DB, { schema }), dispose: proxy.dispose };
}

/** Sends to every subscription of the user; returns how many were delivered. */
async function sendToUser(db: Db, userId: string, payload: Payload) {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          ...payload,
          url: new URL(payload.url, SITE_URL).href,
        }),
        { TTL: 60 * 60 * 12 },
      );
      delivered++;
    } catch (error) {
      if (
        error instanceof WebPushError &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        console.log(`Removed a gone subscription (${error.statusCode}).`);
      } else {
        console.error("Push delivery failed:", error);
      }
    }
  }
  return delivered;
}

async function sendClosingPushes(db: Db, today: string) {
  const subscribers = db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  const [interested, sent] = await Promise.all([
    db
      .select({
        userId: userExhibitions.userId,
        exhibitionId: exhibitions.id,
        title: exhibitions.titleFi,
        museum: museums.name,
        slug: exhibitions.slug,
        endDate: exhibitions.endDate,
      })
      .from(userExhibitions)
      .innerJoin(exhibitions, eq(exhibitions.id, userExhibitions.exhibitionId))
      .innerJoin(museums, eq(museums.id, exhibitions.museumId))
      .where(
        and(
          eq(userExhibitions.status, "interested"),
          inArray(userExhibitions.userId, subscribers),
          gte(exhibitions.endDate, addDays(today, 1)),
          lte(exhibitions.endDate, addDays(today, CLOSING_PUSH_DAYS)),
        ),
      ),
    db.select().from(pushSent).where(inArray(pushSent.userId, subscribers)),
  ]);

  const pushes = selectClosingPushes(
    interested.map((row) => ({ ...row, endDate: row.endDate! })),
    sent,
    today,
  );
  let delivered = 0;
  for (const push of pushes) {
    if ((await sendToUser(db, push.userId, push)) === 0) continue;
    delivered++;
    await db
      .insert(pushSent)
      .values(
        push.exhibitionIds.map((exhibitionId) => ({
          userId: push.userId,
          exhibitionId,
          sentOn: today,
        })),
      )
      .onConflictDoNothing();
  }
  return { due: pushes.length, delivered };
}

async function sendTestPush(db: Db, email: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (!user) throw new Error(`No user with email ${email}.`);
  const delivered = await sendToUser(db, user.id, {
    title: "Testimuistutus Kuraattorista",
    body: "Muistutukset toimivat tällä laitteella.",
    url: "/profile/calendar",
  });
  if (delivered === 0)
    throw new Error("The user has no subscription that accepted the push.");
  return { delivered };
}

async function main() {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY is not set.");
  webpush.setVapidDetails(
    "mailto:hi@emialis.com",
    VAPID_PUBLIC_KEY,
    privateKey,
  );

  const testEmail = process.env.PUSH_TEST_EMAIL;
  const { db, dispose } = await getDb();
  try {
    const result = testEmail
      ? await sendTestPush(db, testEmail)
      : await sendClosingPushes(db, todayInHelsinki());
    console.log(JSON.stringify(result));
  } finally {
    await dispose();
  }
}

await main();
