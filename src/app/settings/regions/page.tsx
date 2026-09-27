import { RegionsTab } from "~/app/settings/RegionsTab";
import { api } from "~/trpc/server";

export default async function ProfileRegionsPage() {
  const [allRegions, profile] = await Promise.all([
    api.system.regions(),
    api.profile.get(),
  ]);

  return (
    <RegionsTab allRegions={allRegions} initialRegions={profile.regions} />
  );
}
