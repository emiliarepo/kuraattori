"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { type InterestWeight } from "~/app/_components/InterestControl";
import { InterestsList, type Category } from "~/app/_components/InterestsList";
import { RegionsList } from "~/app/_components/RegionsList";
import { markOnboardingDone } from "~/app/welcome/onboarding-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

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
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
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
          <InterestsList
            categories={categories}
            interests={interests}
            onChange={setInterest}
          />
          <button
            type="button"
            onClick={() => setStep("regions")}
            className="btn btn-primary w-full"
          >
            {t.onboarding.next}
          </button>
        </>
      ) : (
        <>
          <RegionsList
            allRegions={allRegions}
            regions={regions}
            onChange={toggleRegion}
          />
          <button
            type="button"
            onClick={() => void finish()}
            className="btn btn-primary w-full"
          >
            {t.onboarding.finish}
          </button>
        </>
      )}
    </div>
  );
}
