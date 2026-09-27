import { CalendarPanel } from "~/app/profile/CalendarPanel";
import { siteUrl } from "~/app/_lib/site-url";
import { api } from "~/trpc/server";

export default async function ProfileCalendarPage() {
  const feed = await api.profile.getCalendarFeed();

  return (
    <CalendarPanel
      initialCalendarUrl={new URL(
        `/api/calendar/${feed.token}.ics`,
        siteUrl,
      ).toString()}
    />
  );
}
