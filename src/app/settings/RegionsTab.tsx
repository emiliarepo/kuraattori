"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RegionsList } from "~/app/_components/RegionsList";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { useI18n } from "~/i18n/client";
import { api } from "~/trpc/react";

export function RegionsTab({
  allRegions,
  initialRegions,
}: {
  allRegions: readonly string[];
  initialRegions: readonly string[];
}) {
  const { t } = useI18n();
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
    setAnnouncement("");
    updateRegions.mutate(
      { regions: next },
      { onSuccess: () => void syncHeader() },
    );
  }

  return (
    <div className="relative flex flex-col gap-3">
      <p
        aria-live="polite"
        className="text-kicker text-muted absolute -top-5 right-0"
      >
        {announcement}
      </p>
      <RegionsList
        allRegions={allRegions}
        regions={regions}
        onChange={toggleRegion}
      />
    </div>
  );
}
