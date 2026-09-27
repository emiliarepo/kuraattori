import { MyStatusPage } from "~/app/my/_status-page";
import { SavingsHeader } from "~/app/my/visited/SavingsHeader";
import { summarizeSavings } from "~/domain/savings";
import { getI18n } from "~/i18n/server";

export default async function MyVisitedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[]; year?: string }>;
}) {
  const { t } = await getI18n();
  const { sort, year } = await searchParams;
  const requestedYear = year && /^\d{4}$/.test(year) ? Number(year) : undefined;
  const sortParam = typeof sort === "string" ? sort : undefined;
  return (
    <MyStatusPage
      status="visited"
      emptyMessage={t.pages.my.emptyVisited}
      searchParams={searchParams}
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
        return savings && <SavingsHeader savings={savings} sort={sortParam} />;
      }}
    />
  );
}
