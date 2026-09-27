import { type Metadata } from "next";

import { HomeFeed } from "~/app/_components/HomeFeed";
import { Landing } from "~/app/_landing/Landing";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.landing.metaTitle,
    description: t.landing.metaDescription,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const session = await auth();
  return session?.user ? <HomeFeed /> : <Landing />;
}
