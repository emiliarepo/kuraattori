import { redirect } from "next/navigation";

import { EmptyState } from "~/app/_components/EmptyState";
import { toYearReviewVisits } from "~/app/profile/year/visits";
import { summarizeYear } from "~/domain/year-review";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/server";

export default async function ProfileYearIndexPage() {
  const items = await api.my.list({
    status: "visited",
    sort: "visited-newest",
  });
  const review = summarizeYear(toYearReviewVisits(items), undefined);
  if (!review) return <EmptyState message={t.pages.my.emptyVisited} />;
  redirect(`/profile/year/${review.year}`);
}
