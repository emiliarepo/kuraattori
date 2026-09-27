import { FollowedMuseumsSection } from "~/app/profile/FollowedMuseumsSection";
import { InterestsTab } from "~/app/profile/InterestsTab";
import { localized } from "~/domain/localized";
import { getI18n } from "~/i18n/server";
import { api } from "~/trpc/server";

export default async function ProfileInterestsPage() {
  const [categories, profile, followedMuseums, { locale }] = await Promise.all([
    api.category.list(),
    api.profile.get(),
    api.museum.followed(),
    getI18n(),
  ]);

  return (
    <>
      <InterestsTab
        categories={categories.map((category) => {
          const name = localized(category, "name", locale);
          return { id: category.id, name: name.text, lang: name.lang };
        })}
        initialInterests={profile.interests}
      />
      <FollowedMuseumsSection
        initialMuseums={followedMuseums.map((museum) => {
          const name = localized(museum, "name", locale);
          return { ...museum, name: name.text, lang: name.lang };
        })}
      />
    </>
  );
}
