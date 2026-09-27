"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  InterestControl,
  type InterestWeight,
} from "~/app/_components/InterestControl";
import { markOnboardingDone } from "~/app/welcome/onboarding-action";
import { groupRegions } from "~/domain/regions";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

type Category = { id: number; name: string };
type Step = "interests" | "regions";

export function WelcomeFlow({
  categories,
  allRegions,
  initialInterests,
  initialRegions,
}: {
  categories: readonly Category[];
  allRegions: readonly string[];
  initialInterests: readonly { categoryId: number; weight: number }[];
  initialRegions: readonly string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("interests");
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

  const updateInterests = api.profile.updateInterests.useMutation();
  const updateRegions = api.profile.updateRegions.useMutation();

  function setInterest(categoryId: number, weight: InterestWeight | null) {
    setInterests((current) => {
      const next = new Map(current);
      if (weight === null) next.delete(categoryId);
      else next.set(categoryId, weight);
      return next;
    });
  }

  function toggleRegion(region: string) {
    setRegions((current) =>
      current.includes(region)
        ? current.filter((selected) => selected !== region)
        : [...current, region],
    );
  }

  async function skip() {
    await markOnboardingDone();
    router.push("/");
  }

  async function finish() {
    await Promise.all([
      updateInterests.mutateAsync({
        interests: [...interests].map(([categoryId, weight]) => ({
          categoryId,
          weight,
        })),
      }),
      updateRegions.mutateAsync({ regions: [...regions] }),
    ]);
    await markOnboardingDone();
    router.push("/");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-headline text-4xl">
          {step === "interests"
            ? t.onboarding.interestsHeading
            : t.onboarding.regionsHeading}
        </h1>
        <button
          type="button"
          onClick={() => void skip()}
          className="text-muted hover:text-signal flex-none font-sans text-sm font-semibold"
        >
          {t.onboarding.skip}
        </button>
      </div>

      {step === "interests" ? (
        <>
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
          <button
            type="button"
            onClick={() => setStep("regions")}
            className="bg-fg text-bg w-full py-3 font-sans text-sm font-semibold"
          >
            {t.onboarding.next}
          </button>
        </>
      ) : (
        <>
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
          <button
            type="button"
            onClick={() => void finish()}
            className="bg-fg text-bg w-full py-3 font-sans text-sm font-semibold"
          >
            {t.onboarding.finish}
          </button>
        </>
      )}
    </div>
  );
}
