import { eq } from "drizzle-orm";

import { type Db } from "~/server/db";
import {
  accounts,
  calendarFeeds,
  sessions,
  userExhibitions,
  userFollowedMuseums,
  userInterests,
  userRegions,
  users,
  verificationTokens,
} from "~/server/db/schema";

export async function exportUserData(db: Db, userId: string) {
  const [
    [user],
    linkedAccounts,
    interests,
    regions,
    followedMuseums,
    exhibitions,
    [calendarFeed],
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, userId)),
    db
      .select({
        provider: accounts.provider,
        providerAccountId: accounts.providerAccountId,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db
      .select({
        categoryId: userInterests.categoryId,
        weight: userInterests.weight,
      })
      .from(userInterests)
      .where(eq(userInterests.userId, userId)),
    db
      .select({ region: userRegions.region })
      .from(userRegions)
      .where(eq(userRegions.userId, userId)),
    db
      .select({ museumId: userFollowedMuseums.museumId })
      .from(userFollowedMuseums)
      .where(eq(userFollowedMuseums.userId, userId)),
    db
      .select({
        exhibitionId: userExhibitions.exhibitionId,
        status: userExhibitions.status,
        visitedAt: userExhibitions.visitedAt,
        note: userExhibitions.note,
        createdAt: userExhibitions.createdAt,
        updatedAt: userExhibitions.updatedAt,
      })
      .from(userExhibitions)
      .where(eq(userExhibitions.userId, userId)),
    db
      .select({
        token: calendarFeeds.token,
        createdAt: calendarFeeds.createdAt,
      })
      .from(calendarFeeds)
      .where(eq(calendarFeeds.userId, userId)),
  ]);

  return {
    user: user ?? null,
    accounts: linkedAccounts,
    interests,
    regions: regions.map((row) => row.region),
    followedMuseums: followedMuseums.map((row) => row.museumId),
    exhibitions,
    calendarFeed: calendarFeed ?? null,
  };
}

export async function deleteUserData(db: Db, userId: string) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return;

  await db.batch([
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, user.email)),
    db.delete(userInterests).where(eq(userInterests.userId, userId)),
    db.delete(userRegions).where(eq(userRegions.userId, userId)),
    db
      .delete(userFollowedMuseums)
      .where(eq(userFollowedMuseums.userId, userId)),
    db.delete(userExhibitions).where(eq(userExhibitions.userId, userId)),
    db.delete(calendarFeeds).where(eq(calendarFeeds.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
}
