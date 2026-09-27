import { InterestsTab } from "~/app/profile/InterestsTab";
import { api } from "~/trpc/server";

export default async function ProfileInterestsPage() {
  const [categories, profile] = await Promise.all([
    api.category.list(),
    api.profile.get(),
  ]);

  return (
    <InterestsTab
      categories={categories.map(({ id, name }) => ({ id, name }))}
      initialInterests={profile.interests}
    />
  );
}
