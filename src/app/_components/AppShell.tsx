"use client";

import { useState } from "react";

import { BottomTabBar } from "~/app/_components/BottomTabBar";
import { Header } from "~/app/_components/Header";

// Placeholder region set and local-only selection state until regions are
// persisted per profile/cookie (ticket 05/06).
const DEFAULT_REGIONS = [
  { id: "pk-seutu", label: "Pk-seutu" },
  { id: "tampere", label: "Tampere" },
  { id: "turku", label: "Turku" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);

  const regions = DEFAULT_REGIONS.map((region) => ({
    ...region,
    selected: selectedRegionIds.includes(region.id),
  }));

  return (
    <>
      <Header regions={regions} onRegionsChange={setSelectedRegionIds} />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-8">
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
