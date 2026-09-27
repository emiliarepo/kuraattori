import { redirect } from "next/navigation";

import { EmptyState } from "~/app/_components/EmptyState";
import { toYearReviewVisits } from "~/app/my/year/visits";
import { summarizeYear } from "~/domain/year-review";
import { getI18n } from "~/i18n/server";
import { api } from "~/trpc/server";

export default async function ProfileYearIndexPage() {
  const { t, locale } = await getI18n();
  const items = await api.my.list({
    status: "visited",
    sort: "visited-newest",
    locale,
  });
  const review = summarizeYear(toYearReviewVisits(items, locale), undefined);
  if (!review) return <EmptyState message={t.pages.my.emptyVisited} />;
  redirect(`/my/year/${review.year}`);
}
