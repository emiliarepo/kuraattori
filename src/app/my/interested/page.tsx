import { CalendarPrompt } from "~/app/my/interested/CalendarPrompt";
import { MyStatusPage } from "~/app/my/_status-page";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function MyInterestedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { t } = await getI18n();
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
        searchParams={searchParams}
      />
    </>
  );
}
