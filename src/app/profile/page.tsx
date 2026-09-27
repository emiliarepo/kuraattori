import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProfileForm } from "~/app/profile/ProfileForm";
import { auth, signOut } from "~/server/auth";
import { api } from "~/trpc/server";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Profiili",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/profile");

  const [categories, allRegions, profile] = await Promise.all([
    api.category.list(),
    api.system.regions(),
    api.profile.get(),
  ]);

  return (
    <ProfileForm
      categories={categories.map(({ id, name }) => ({ id, name }))}
      allRegions={allRegions}
      initialInterests={profile.interests}
      initialRegions={profile.regions}
      signOutAction={async () => {
        "use server";
        revalidatePath("/", "layout");
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}
