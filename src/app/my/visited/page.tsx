import { MyStatusPage } from "~/app/my/_status-page";
import { t } from "~/i18n/fi";

export default function MyVisitedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  return (
    <MyStatusPage
      status="visited"
      emptyMessage={t.pages.my.emptyVisited}
      searchParams={searchParams}
    />
  );
}
