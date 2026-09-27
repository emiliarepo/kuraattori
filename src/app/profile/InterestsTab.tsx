"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InterestsList, type Category } from "~/app/_components/InterestsList";
import { type InterestWeight } from "~/app/_components/InterestControl";
import { refreshHeaderData } from "~/app/_components/refresh-header-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

export function InterestsTab({
  categories,
  initialInterests,
}: {
  categories: readonly Category[];
  initialInterests: readonly { categoryId: number; weight: number }[];
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
  const [announcement, setAnnouncement] = useState("");
  const router = useRouter();
  const updateInterests = api.profile.updateInterests.useMutation();

  async function syncHeader() {
    setAnnouncement(t.profile.saved);
    await refreshHeaderData();
    router.refresh();
  }

  function setInterest(categoryId: number, weight: InterestWeight | null) {
    const next = new Map(interests);
    if (weight === null) next.delete(categoryId);
    else next.set(categoryId, weight);
    setInterests(next);
    setAnnouncement("");
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

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="text-kicker text-muted min-h-[1lh]">
        {announcement}
      </p>
      <InterestsList
        categories={categories}
        interests={interests}
        onChange={setInterest}
      />
    </div>
  );
}
