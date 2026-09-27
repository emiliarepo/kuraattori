import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileTabs } from "~/app/_components/ProfileTabs";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: t.profile.title,
  robots: { index: false, follow: false },
};

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/profile");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
      <h1 className="text-headline text-4xl sm:text-5xl">{t.profile.title}</h1>
      <ProfileTabs />
      {children}
    </div>
  );
}
