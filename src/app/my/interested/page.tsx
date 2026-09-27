import { CalendarPrompt } from "~/app/my/interested/CalendarPrompt";
import { MyStatusPage } from "~/app/my/_status-page";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MyInterestedPage() {
  const session = await auth();
  const feed = session?.user
    ? await api.profile.getExistingCalendarFeed()
    : null;

  return (
    <>
      {feed && <CalendarPrompt token={feed.token} />}
      <MyStatusPage
        status="interested"
        emptyMessage={t.pages.my.emptyInterested}
      />
    </>
  );
}
