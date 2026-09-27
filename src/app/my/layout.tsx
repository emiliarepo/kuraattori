import { type Metadata } from "next";

import { MyTabs } from "~/app/_components/MyTabs";
import { TabbedPage } from "~/app/_components/TabbedPage";
import { getI18n } from "~/i18n/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  return (
    <TabbedPage title={t.ui.nav.mine} tabs={<MyTabs />}>
      {children}
    </TabbedPage>
  );
}
