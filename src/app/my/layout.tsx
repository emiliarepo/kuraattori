import { type Metadata } from "next";

import { MyTabs } from "~/app/_components/MyTabs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8">
      <MyTabs />
      <div className="pt-6">{children}</div>
    </div>
  );
}
