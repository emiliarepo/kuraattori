"use client";

import { useState } from "react";

import {
  StatusActions,
  type ExhibitionStatus,
} from "~/app/_components/StatusActions";
import { api } from "~/trpc/react";

export function ExhibitionStatusControl({
  exhibitionId,
  initialStatus,
}: {
  exhibitionId: number;
  initialStatus: ExhibitionStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const mutation = api.userExhibition.setStatus.useMutation();

  function handleChange(next: ExhibitionStatus | null) {
    // StatusActions already toggled locally: `next` is null exactly when the
    // pressed button was the active one, so `status` (pre-update) is the
    // value the button represents.
    const requested = next ?? status;
    if (!requested) return;
    const previous = status;
    setStatus(next);
    mutation.mutate(
      { exhibitionId, status: requested },
      { onError: () => setStatus(previous) },
    );
  }

  return <StatusActions status={status} onChange={handleChange} />;
}
