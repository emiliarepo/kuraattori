"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { type InterestWeight } from "~/app/_components/InterestControl";
import { InterestsList, type Category } from "~/app/_components/InterestsList";
import { RegionsList } from "~/app/_components/RegionsList";
import { markOnboardingDone } from "~/app/welcome/onboarding-action";
import { useI18n } from "~/i18n/client";
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
  const { t } = useI18n();
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
  const { pending, start } = usePendingNavigation();
  const [leaving, setLeaving] = useState<"skip" | "finish" | null>(null);

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

  function leave(kind: "skip" | "finish", work: () => Promise<void>) {
    setLeaving(kind);
    start(async () => {
      await work();
      router.push("/");
    });
  }

  async function skip() {
    await markOnboardingDone();
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
          onClick={() => leave("skip", skip)}
          disabled={pending}
          className="text-muted hover:text-signal inline-flex min-h-11 flex-none items-center font-sans text-sm font-semibold"
        >
          {pending && leaving === "skip" ? t.ui.updating : t.onboarding.skip}
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
            onClick={() => leave("finish", finish)}
            disabled={pending}
            className="btn btn-primary w-full"
          >
            {pending && leaving === "finish"
              ? t.ui.updating
              : t.onboarding.finish}
          </button>
        </>
      )}
    </div>
  );
}
