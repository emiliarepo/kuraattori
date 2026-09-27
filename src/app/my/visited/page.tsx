import { MyStatusPage } from "~/app/my/_status-page";
import { SavingsHeader } from "~/app/my/visited/SavingsHeader";
import { summarizeSavings } from "~/domain/savings";
import { t } from "~/i18n/fi";

export default async function MyVisitedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const requestedYear = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
  return (
    <MyStatusPage
      status="visited"
      emptyMessage={t.pages.my.emptyVisited}
      renderHeader={(items) => {
        const savings = summarizeSavings(
          items.map((item) => ({
            title: item.titleFi,
            visitedAt: item.visitedAt,
            museumCardEligible: item.visitedCardEligible,
            admissionAdultCents: item.visitedAdmissionAdultCents,
          })),
          requestedYear,
        );
        return savings && <SavingsHeader savings={savings} />;
      }}
    />
  );
}
