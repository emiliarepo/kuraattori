import { MyStatusPage } from "~/app/my/_status-page";
import { t } from "~/i18n/fi";

export default function MyInterestedPage() {
  return (
    <MyStatusPage
      status="interested"
      emptyMessage={t.pages.my.emptyInterested}
    />
  );
}
