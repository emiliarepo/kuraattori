import { SavedTrips } from "~/app/trip/SavedTrips";
import { TripTabs } from "~/app/trip/TripTabs";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const trips = session?.user ? await api.trip.saved() : [];

  return (
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.pages.trip.title}
      </h1>
      <SavedTrips trips={trips} />
      <TripTabs />
      {children}
    </div>
  );
}
