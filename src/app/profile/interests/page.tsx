import { FollowedMuseumsSection } from "~/app/profile/FollowedMuseumsSection";
import { InterestsTab } from "~/app/profile/InterestsTab";
import { api } from "~/trpc/server";

export default async function ProfileInterestsPage() {
  const [categories, profile, followedMuseums] = await Promise.all([
    api.category.list(),
    api.profile.get(),
    api.museum.followed(),
  ]);

  return (
    <>
      <InterestsTab
        categories={categories.map(({ id, name }) => ({ id, name }))}
        initialInterests={profile.interests}
      />
      <FollowedMuseumsSection initialMuseums={followedMuseums} />
    </>
  );
}
