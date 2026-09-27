import { siteUrl } from "~/app/_lib/site-url";
import { parseDayPlan } from "~/app/_lib/day-plan-params";
import { addMinutes, MAX_DAY_STOPS } from "~/domain/day-plan";
import { loadDayStops } from "~/server/api/routers/trip";
import { formatTimedCalendar, helsinkiTimeToUtc } from "~/server/calendar";
import { getDb } from "~/server/db";

const VISIT_MINUTES = 90;

/** One 90-minute event per stop, back to back from `start`, in the itinerary's order. */
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
  const events = rows.map(({ exhibition, museum }, index) => {
    const start = addMinutes(plan.start, index * VISIT_MINUTES);
    const url = new URL(`/exhibitions/${exhibition.slug}`, siteUrl).toString();
    return {
      uid: `day-${date}-${exhibition.id}@kuraattori.emialis.com`,
      start: helsinkiTimeToUtc(date, start),
      end: helsinkiTimeToUtc(date, addMinutes(start, VISIT_MINUTES)),
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
