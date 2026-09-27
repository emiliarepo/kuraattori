"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const updateInterests = api.profile.updateInterests.useMutation();
  const updateRegions = api.profile.updateRegions.useMutation();

  async function syncHeader() {
    await refreshHeaderData();
    router.refresh();
  }

  function toggleInterest(id: number) {
    const next = interestIds.includes(id)
      ? interestIds.filter((categoryId) => categoryId !== id)
      : [...interestIds, id];
    setInterestIds(next);
    updateInterests.mutate(
      { interests: next.map((categoryId) => ({ categoryId, weight: 1 })) },
      { onSuccess: () => void syncHeader() },
    );
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
    <div className="mx-auto flex max-w-lg flex-col gap-8 py-12">
      <h1 className="text-headline text-4xl sm:text-5xl">{t.profile.title}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-kicker border-rule border-t pt-3">
          {t.profile.interestsHeading}
        </h2>
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <label className="flex items-center gap-2.5 text-lg">
                <input
                  type="checkbox"
                  checked={interestIds.includes(category.id)}
                  onChange={() => toggleInterest(category.id)}
                  className="accent-signal h-4 w-4 flex-none"
                />
                {category.name}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-kicker border-rule border-t pt-3">
          {t.profile.regionsHeading}
        </h2>
        <ul className="flex flex-col gap-2">
          {allRegions.map((region) => (
            <li key={region}>
              <label className="flex items-center gap-2.5 text-lg">
                <input
                  type="checkbox"
                  checked={regions.includes(region)}
                  onChange={() => toggleRegion(region)}
                  className="accent-signal h-4 w-4 flex-none"
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
          className="border-rule hover:bg-surface border px-4 py-2.5 font-sans text-sm font-semibold"
        >
          {t.auth.signOut}
        </button>
      </form>
    </div>
  );
}
