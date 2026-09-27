import { MyStatusPage } from "~/app/my/_status-page";
import { getI18n } from "~/i18n/server";

export default async function MyHiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { t } = await getI18n();
  return (
    <MyStatusPage
      status="hidden"
      emptyMessage={t.pages.my.emptyHidden}
      searchParams={searchParams}
    />
  );
}
