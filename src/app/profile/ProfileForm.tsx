"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  InterestControl,
  type InterestWeight,
} from "~/app/_components/InterestControl";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { groupRegions } from "~/domain/regions";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

type Category = { id: number; name: string };

export function ProfileForm({
  categories,
  allRegions,
  initialInterests,
  initialRegions,
  signOutAction,
}: {
  categories: readonly Category[];
  allRegions: readonly string[];
  initialInterests: readonly { categoryId: number; weight: number }[];
  initialRegions: readonly string[];
  signOutAction: () => Promise<void>;
}) {
  const [interests, setInterests] = useState<
    ReadonlyMap<number, InterestWeight>
  >(
    () =>
      new Map(
        initialInterests.map(({ categoryId, weight }) => [
          categoryId,
          weight as InterestWeight,
        ]),
      ),
  );
  const [regions, setRegions] = useState<readonly string[]>(initialRegions);
  const regionGroups = groupRegions(allRegions);
  const router = useRouter();

  const updateInterests = api.profile.updateInterests.useMutation();
  const updateRegions = api.profile.updateRegions.useMutation();

  async function syncHeader() {
    await refreshHeaderData();
    router.refresh();
  }

  function setInterest(categoryId: number, weight: InterestWeight | null) {
    const next = new Map(interests);
    if (weight === null) next.delete(categoryId);
    else next.set(categoryId, weight);
    setInterests(next);
    updateInterests.mutate(
      {
        interests: [...next].map(([categoryId, weight]) => ({
          categoryId,
          weight,
        })),
      },
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
        <ul className="flex flex-col gap-2.5">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="text-lg">{category.name}</span>
              <InterestControl
                categoryName={category.name}
                value={interests.get(category.id) ?? null}
                onChange={(weight) => setInterest(category.id, weight)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-kicker border-rule border-t pt-3">
          {t.profile.regionsHeading}
        </h2>
        {[regionGroups.cities, regionGroups.others]
          .filter((group) => group.length > 0)
          .map((group, index) => (
            <ul
              key={index}
              className={`flex flex-col gap-2 ${index > 0 ? "border-rule-soft mt-3 border-t pt-3" : ""}`}
            >
              {group.map((region) => (
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
          ))}
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
