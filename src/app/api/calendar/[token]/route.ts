import { and, eq, inArray } from "drizzle-orm";

import { localized } from "~/domain/localized";
import { i18nFor } from "~/i18n";
import { resolveLocale } from "~/i18n/locales";
import { groupExhibitionRows } from "~/server/api/grouping";
import { formatCalendar } from "~/server/calendar";
import { getDb } from "~/server/db";
import {
  calendarFeeds,
  exhibitions,
  museums,
  userExhibitions,
  users,
} from "~/server/db/schema";
import { siteUrl } from "~/app/_lib/site-url";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: routeToken } = await params;
  if (!routeToken.endsWith(".ics"))
    return new Response("Not found", { status: 404 });
  const token = routeToken.slice(0, -4);
  const db = await getDb();
  const [feed] = await db
    .select({ userId: calendarFeeds.userId, locale: users.locale })
    .from(calendarFeeds)
    .innerJoin(users, eq(users.id, calendarFeeds.userId))
    .where(eq(calendarFeeds.token, token))
    .limit(1);
  if (!feed)
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });

  const interested = await db
    .select({ exhibition: exhibitions })
    .from(userExhibitions)
    .innerJoin(exhibitions, eq(exhibitions.id, userExhibitions.exhibitionId))
    .where(
      and(
        eq(userExhibitions.userId, feed.userId),
        eq(userExhibitions.status, "interested"),
        eq(exhibitions.kind, "exhibition"),
      ),
    );
  const interestedIds = interested.map(({ exhibition }) => exhibition.id);
  const groups = interested
    .map(({ exhibition }) => exhibition.exhibitionGroup)
    .filter((group): group is string => group !== null);
  const candidateIds = new Set<number>(interestedIds);
  for (let offset = 0; offset < groups.length; offset += 80) {
    const siblings = await db
      .select({ id: exhibitions.id })
      .from(exhibitions)
      .where(
        and(
          eq(exhibitions.kind, "exhibition"),
          inArray(
            exhibitions.exhibitionGroup,
            groups.slice(offset, offset + 80),
          ),
        ),
      );
    siblings.forEach(({ id }) => candidateIds.add(id));
  }
  const candidateList = [...candidateIds];
  const rows = [];
  for (let offset = 0; offset < candidateList.length; offset += 80) {
    rows.push(
      ...(await db
        .select({ exhibition: exhibitions, museum: museums })
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(
          and(
            eq(exhibitions.kind, "exhibition"),
            inArray(exhibitions.id, candidateList.slice(offset, offset + 80)),
          ),
        )),
    );
  }
  const locale = resolveLocale(feed.locale, null, null);
  const events = groupExhibitionRows(rows)
    .filter(({ exhibition }) => exhibition.endDate !== null)
    .map(({ exhibition, museum }) => ({
      uid: `${exhibition.exhibitionGroup ?? `exhibition-${exhibition.id}`}@kuraattori.emialis.com`,
      endDate: exhibition.endDate!,
      startDate: exhibition.startDate,
      title: localized(exhibition, "title", locale).text,
      location: [localized(museum, "name", locale).text, museum.city]
        .filter(Boolean)
        .join(", "),
      url: new URL(`/exhibitions/${exhibition.slug}`, siteUrl).toString(),
    }));
  return new Response(
    formatCalendar(
      events,
      new Date(),
      i18nFor(locale).t.notifications.calendarEnds,
    ),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
