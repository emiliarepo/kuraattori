import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { signInHereUrl } from "~/server/request-path";

import { ProfileTabs } from "~/app/_components/ProfileTabs";
import { TabbedPage } from "~/app/_components/TabbedPage";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.profile.title,
    robots: { index: false, follow: false },
  };
}

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  const session = await auth();
  if (!session?.user) redirect(await signInHereUrl("/settings"));

  return (
    <TabbedPage
      title={t.profile.title}
      tabs={<ProfileTabs />}
      className="mx-auto max-w-lg"
    >
      {children}
    </TabbedPage>
  );
}
