"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RegionsList } from "~/app/_components/RegionsList";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

export function RegionsTab({
  allRegions,
  initialRegions,
}: {
  allRegions: readonly string[];
  initialRegions: readonly string[];
}) {
  const [regions, setRegions] = useState<readonly string[]>(initialRegions);
  const [announcement, setAnnouncement] = useState("");
  const router = useRouter();
  const updateRegions = api.profile.updateRegions.useMutation();

  async function syncHeader() {
    setAnnouncement(t.profile.saved);
    await refreshHeaderData();
    router.refresh();
  }

  function toggleRegion(region: string) {
    const next = regions.includes(region)
      ? regions.filter((selected) => selected !== region)
      : [...regions, region];
    setRegions(next);
    updateRegions.mutate(
      { regions: next },
      { onSuccess: () => void syncHeader() },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <RegionsList
        allRegions={allRegions}
        regions={regions}
        onChange={toggleRegion}
      />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
