import { redirect } from "next/navigation";

import { WelcomeFlow } from "~/app/welcome/WelcomeFlow";
import { hasCompletedOnboarding } from "~/app/welcome/onboarding-cookie";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/welcome");
  if (await hasCompletedOnboarding()) redirect("/");

  const [categories, allRegions, profile] = await Promise.all([
    api.category.list(),
    api.system.regions(),
    api.profile.get(),
  ]);

  return (
    <WelcomeFlow
      categories={categories.map(({ id, name }) => ({ id, name }))}
      allRegions={allRegions}
      initialInterestIds={profile.interests.map(({ categoryId }) => categoryId)}
      initialRegions={profile.regions}
    />
  );
}
