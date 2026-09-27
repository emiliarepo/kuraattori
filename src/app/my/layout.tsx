import { type Metadata } from "next";

import { MyTabs } from "~/app/_components/MyTabs";
import { t } from "~/i18n/fi";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8">
      <h1 className="text-headline mb-4 text-4xl sm:text-5xl">
        {t.ui.nav.mine}
      </h1>
      <MyTabs />
      <div className="pt-2">{children}</div>
    </div>
  );
}
