import { type Metadata } from "next";

import { HomeFeed } from "~/app/_components/HomeFeed";
import { getI18n } from "~/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.app.name,
    description: t.pages.meta.home,
    alternates: { canonical: "/feed" },
  };
}

export default function FeedPage() {
  return <HomeFeed />;
}
