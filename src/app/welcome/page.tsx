import { redirect } from "next/navigation";

import { WelcomeFlow } from "~/app/welcome/WelcomeFlow";
import { hasCompletedOnboarding } from "~/app/welcome/onboarding-cookie";
import { localized } from "~/domain/localized";
import { getI18n } from "~/i18n/server";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { type Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.onboarding.title,
    robots: { index: false, follow: false },
  };
}

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/welcome");
  if (await hasCompletedOnboarding()) redirect("/");

  const [categories, allRegions, profile, { locale }] = await Promise.all([
    api.category.list(),
    api.system.regions(),
    api.profile.get(),
    getI18n(),
  ]);

  return (
    <WelcomeFlow
      categories={categories.map((category) => {
        const name = localized(category, "name", locale);
        return { id: category.id, name: name.text, lang: name.lang };
      })}
      allRegions={allRegions}
      initialInterests={profile.interests}
      initialRegions={profile.regions}
    />
  );
}
