"use client";

import { useState } from "react";

import { refreshStatusData } from "~/app/_components/refresh-status-action";
import { type ExhibitionStatus } from "~/app/_components/StatusActions";
import { useI18n } from "~/i18n/client";
import { api } from "~/trpc/react";

const GLYPH: Record<"none" | ExhibitionStatus, string> = {
  none: "♡",
  interested: "♥",
  visited: "✓",
  hidden: "♡",
};

/** Toggles Kiinnostaa on/off; a visited exhibition just shows ✓ and ignores taps. */
export function StatusHeart({
  exhibitionId,
  title,
  status,
  className = "",
}: {
  exhibitionId: number;
  title: string;
  status: ExhibitionStatus | null;
  className?: string;
}) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(status);
  const [announcement, setAnnouncement] = useState("");
  const mutation = api.userExhibition.setStatus.useMutation();

  function handleClick() {
    if (current === "visited") return;
    const previous = current;
    const next = current === "interested" ? null : "interested";
    setCurrent(next);
    setAnnouncement(
      next
        ? t.ui.status.announceSet(t.ui.status.interested)
        : t.ui.status.announceCleared,
    );
    mutation.mutate(
      { exhibitionId, status: "interested" },
      {
        onSuccess: () => void refreshStatusData(),
        onError: () => setCurrent(previous),
      },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={current === "interested"}
        aria-label={t.ui.status.heartLabel(title)}
        className={`bg-bg/85 flex h-11 w-11 items-center justify-center text-lg transition-colors duration-150 ${
          current === "interested" ? "text-signal" : "text-fg"
        } ${className}`}
      >
        <span aria-hidden="true">{GLYPH[current ?? "none"]}</span>
      </button>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
