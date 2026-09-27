"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { markOnboardingDone } from "~/app/welcome/onboarding-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

type Category = { id: number; name: string };
type Step = "interests" | "regions";

export function WelcomeFlow({
  categories,
  allRegions,
  initialInterestIds,
  initialRegions,
}: {
  categories: readonly Category[];
  allRegions: readonly string[];
  initialInterestIds: readonly number[];
  initialRegions: readonly string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("interests");
  const [interestIds, setInterestIds] = useState<readonly number[]>(
    initialInterestIds,
  );
  const [regions, setRegions] = useState<readonly string[]>(initialRegions);

  const updateInterests = api.profile.updateInterests.useMutation();
  const updateRegions = api.profile.updateRegions.useMutation();

  function toggleInterest(id: number) {
    setInterestIds((current) =>
      current.includes(id)
        ? current.filter((categoryId) => categoryId !== id)
        : [...current, id],
    );
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
        interests: interestIds.map((categoryId) => ({ categoryId, weight: 1 })),
      }),
      updateRegions.mutateAsync({ regions: [...regions] }),
    ]);
    await markOnboardingDone();
    router.push("/");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-headline text-3xl">
          {step === "interests"
            ? t.onboarding.interestsHeading
            : t.onboarding.regionsHeading}
        </h1>
        <button
          type="button"
          onClick={() => void skip()}
          className="text-muted hover:text-signal text-sm font-semibold"
        >
          {t.onboarding.skip}
        </button>
      </div>

      {step === "interests" ? (
        <>
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
          <button
            type="button"
            onClick={() => setStep("regions")}
            className="bg-fg text-bg w-full py-3 text-sm font-semibold"
          >
            {t.onboarding.next}
          </button>
        </>
      ) : (
        <>
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
          <button
            type="button"
            onClick={() => void finish()}
            className="bg-fg text-bg w-full py-3 text-sm font-semibold"
          >
            {t.onboarding.finish}
          </button>
        </>
      )}
    </div>
  );
}
