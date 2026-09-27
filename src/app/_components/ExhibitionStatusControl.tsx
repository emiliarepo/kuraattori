"use client";

import { useState } from "react";

import {
  StatusActions,
  type ExhibitionStatus,
} from "~/app/_components/StatusActions";
import { api } from "~/trpc/react";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";

const visitDateFormat = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function ExhibitionStatusControl({
  exhibitionId,
  initialStatus,
  startDate,
  initialVisitedAt,
  initialNote,
}: {
  exhibitionId: number;
  initialStatus: ExhibitionStatus | null;
  startDate: string;
  initialVisitedAt: Date | null;
  initialNote: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [visitedOn, setVisitedOn] = useState(
    initialVisitedAt ? todayInHelsinki(initialVisitedAt) : todayInHelsinki(),
  );
  const [note, setNote] = useState(initialNote ?? "");
  const mutation = api.userExhibition.setStatus.useMutation();
  const updateVisit = api.userExhibition.updateVisit.useMutation();

  function handleChange(next: ExhibitionStatus | null) {
    // StatusActions already toggled locally: `next` is null exactly when the
    // pressed button was the active one, so `status` (pre-update) is the
    // value the button represents.
    const requested = next ?? status;
    if (!requested) return;
    if (
      requested !== "visited" &&
      status === "visited" &&
      note &&
      !window.confirm(t.pages.detail.clearVisitConfirm)
    )
      return;
    const previous = status;
    setStatus(next);
    mutation.mutate(
      { exhibitionId, status: requested },
      { onError: () => setStatus(previous) },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <StatusActions
        status={status}
        onChange={handleChange}
        disabledStatuses={startDate > todayInHelsinki() ? ["visited"] : []}
      />
      {status === "visited" && (
        <div className="border-rule-soft flex flex-col gap-3 border-b pb-4 font-sans text-sm">
          <p className="text-kicker text-muted">
            {t.pages.detail.visitedOn(
              visitDateFormat.format(new Date(`${visitedOn}T12:00:00Z`)),
            )}
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-kicker text-muted">
              {t.pages.detail.visitDate}
            </span>
            <input
              type="date"
              min={startDate}
              max={todayInHelsinki()}
              value={visitedOn}
              onChange={(event) => setVisitedOn(event.target.value)}
              className="border-rule-soft bg-bg text-fg w-full border px-2 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-kicker text-muted">
              {t.pages.detail.visitNote}
            </span>
            <textarea
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="border-rule-soft bg-bg text-fg w-full border px-2 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              updateVisit.mutate({ exhibitionId, visitedOn, note })
            }
            disabled={updateVisit.isPending}
            className="bg-fg text-bg self-start px-4 py-2 font-semibold disabled:opacity-60"
          >
            {updateVisit.isPending
              ? t.pages.detail.saving
              : t.pages.detail.saveVisit}
          </button>
          {updateVisit.isSuccess && (
            <p role="status">{t.pages.detail.visitSaved}</p>
          )}
          {updateVisit.isError && (
            <p role="alert">{t.pages.detail.visitSaveError}</p>
          )}
        </div>
      )}
    </div>
  );
}
