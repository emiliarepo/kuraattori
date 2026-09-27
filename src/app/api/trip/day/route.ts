import { siteUrl } from "~/app/_lib/site-url";
import { parseDayPlan } from "~/app/_lib/day-plan-params";
import { MAX_DAY_STOPS, scheduleVisits } from "~/domain/day-plan";
import { hoursOn } from "~/domain/opening-hours";
import { loadDayStops } from "~/server/api/routers/trip";
import { formatTimedCalendar, helsinkiTimeToUtc } from "~/server/calendar";
import { getDb } from "~/server/db";

const VISIT_MINUTES = 90;

/** One event per stop in the itinerary's order, timed like the day page; closed or unreachable museums are left out. */
export async function GET(request: Request) {
  const plan = parseDayPlan(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (
    !plan.city ||
    !plan.date ||
    plan.ids.length === 0 ||
    plan.ids.length > MAX_DAY_STOPS
  )
    return new Response("Bad request", { status: 400 });
  const date = plan.date;

  const rows = await loadDayStops(await getDb(), plan.city, plan.ids);
  const schedule = scheduleVisits(
    rows.map(({ museum }) => hoursOn(museum.openingHours?.days, date)),
    plan.start,
    VISIT_MINUTES,
  );
  const events = rows.flatMap(({ exhibition, museum }, index) => {
    const visit = schedule[index]!;
    if (visit.kind !== "visit") return [];
    const url = new URL(`/exhibitions/${exhibition.slug}`, siteUrl).toString();
    return {
      uid: `day-${date}-${exhibition.id}@kuraattori.emialis.com`,
      start: helsinkiTimeToUtc(date, visit.start),
      end: helsinkiTimeToUtc(date, visit.end),
      title: `${exhibition.titleFi} · ${museum.name}`,
      location: [museum.name, museum.address ?? museum.city]
        .filter(Boolean)
        .join(", "),
      description: url,
      url,
    };
  });
  return new Response(formatTimedCalendar(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="museopaiva-${date}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
