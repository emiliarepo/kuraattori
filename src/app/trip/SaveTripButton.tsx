"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "~/i18n/client";
import { api, type RouterInputs } from "~/trpc/react";

export function SaveTripButton({
  trip,
}: {
  trip: RouterInputs["trip"]["save"];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const save = api.trip.save.useMutation({
    onSuccess: () => {
      setMessage(t.pages.trip.saved);
      router.refresh();
    },
    onError: () => setMessage(t.pages.trip.saveError),
  });

  return (
    <div className="flex flex-wrap items-center gap-3 font-sans text-sm">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={save.isPending}
        onClick={() => {
          setMessage("");
          save.mutate(trip);
        }}
      >
        {save.isPending ? t.pages.trip.saving : t.pages.trip.save}
      </button>
      <p aria-live="polite" className="text-muted">
        {message}
      </p>
    </div>
  );
}
