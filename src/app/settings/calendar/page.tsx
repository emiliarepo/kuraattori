import { CalendarPanel } from "~/app/settings/CalendarPanel";
import { PushToggle } from "~/app/settings/PushToggle";
import { siteUrl } from "~/app/_lib/site-url";
import { api } from "~/trpc/server";

export default async function ProfileCalendarPage() {
  const feed = await api.profile.getCalendarFeed();

  return (
    <div className="flex flex-col gap-6">
      <CalendarPanel
        initialCalendarUrl={new URL(
          `/api/calendar/${feed.token}.ics`,
          siteUrl,
        ).toString()}
      />
      <PushToggle />
    </div>
  );
}
