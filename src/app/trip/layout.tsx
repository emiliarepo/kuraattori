import { TabbedPage } from "~/app/_components/TabbedPage";
import { SavedTrips } from "~/app/trip/SavedTrips";
import { TripTabs } from "~/app/trip/TripTabs";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  const session = await auth();
  const trips = session?.user ? await api.trip.saved() : [];

  return (
    <TabbedPage
      title={t.pages.trip.title}
      tabs={
        <>
          <SavedTrips trips={trips} />
          <TripTabs />
        </>
      }
    >
      {children}
    </TabbedPage>
  );
}
