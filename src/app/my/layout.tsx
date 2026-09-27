import { type Metadata } from "next";

import { MyTabs } from "~/app/_components/MyTabs";
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
    <div className="py-8">
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">
        {t.ui.nav.mine}
      </h1>
      <MyTabs />
      <div className="pt-2">{children}</div>
    </div>
  );
}
