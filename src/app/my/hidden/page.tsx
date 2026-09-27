import { MyStatusPage } from "~/app/my/_status-page";
import { t } from "~/i18n/fi";

export default function MyHiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  return (
    <MyStatusPage
      status="hidden"
      emptyMessage={t.pages.my.emptyHidden}
      searchParams={searchParams}
    />
  );
}
