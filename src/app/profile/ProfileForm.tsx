"use client";

import { useState } from "react";

import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

type Category = { id: number; name: string };

export function ProfileForm({
  categories,
  allRegions,
  initialInterestIds,
  initialRegions,
  signOutAction,
}: {
  categories: readonly Category[];
  allRegions: readonly string[];
  initialInterestIds: readonly number[];
  initialRegions: readonly string[];
  signOutAction: () => Promise<void>;
}) {
  const [interestIds, setInterestIds] =
    useState<readonly number[]>(initialInterestIds);
  const [regions, setRegions] = useState<readonly string[]>(initialRegions);

  const updateInterests = api.profile.updateInterests.useMutation();
  const updateRegions = api.profile.updateRegions.useMutation();

  function toggleInterest(id: number) {
    const next = interestIds.includes(id)
      ? interestIds.filter((categoryId) => categoryId !== id)
      : [...interestIds, id];
    setInterestIds(next);
    updateInterests.mutate(
      { interests: next.map((categoryId) => ({ categoryId, weight: 1 })) },
      { onSuccess: () => void refreshHeaderData() },
    );
  }

  function toggleRegion(region: string) {
    const next = regions.includes(region)
      ? regions.filter((selected) => selected !== region)
      : [...regions, region];
    setRegions(next);
    updateRegions.mutate(
      { regions: next },
      { onSuccess: () => void refreshHeaderData() },
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 py-12">
      <h1 className="text-headline text-3xl">{t.profile.title}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.profile.interestsHeading}</h2>
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={interestIds.includes(category.id)}
                  onChange={() => toggleInterest(category.id)}
                  className="accent-fg h-4 w-4"
                />
                {category.name}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.profile.regionsHeading}</h2>
        <ul className="flex flex-col gap-2">
          {allRegions.map((region) => (
            <li key={region}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={regions.includes(region)}
                  onChange={() => toggleRegion(region)}
                  className="accent-fg h-4 w-4"
                />
                {region}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="border-rule border py-2 text-sm font-semibold"
        >
          {t.auth.signOut}
        </button>
      </form>
    </div>
  );
}
