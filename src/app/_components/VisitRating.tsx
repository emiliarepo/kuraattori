"use client";

import { useRef, useState } from "react";

import { type VisitRating as Rating } from "~/domain/rating-nudges";
import type { Messages } from "~/i18n";
import { useI18n } from "~/i18n/client";
import { api } from "~/trpc/react";

const options = (
  t: Messages,
): readonly { value: Rating; glyph: string; label: string }[] => [
  { value: "up", glyph: "👍", label: t.ui.rating.up },
  { value: "down", glyph: "👎", label: t.ui.rating.down },
];

export function VisitRating({
  exhibitionId,
  initialRating,
}: {
  exhibitionId: number;
  initialRating: Rating | null;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(initialRating);
  const [announcement, setAnnouncement] = useState("");
  const [failed, setFailed] = useState(false);
  const saved = useRef(initialRating);
  const latest = useRef(0);
  const mutation = api.userExhibition.setRating.useMutation();

  function handleClick(value: Rating) {
    const next = rating === value ? null : value;
    const request = ++latest.current;
    setRating(next);
    setFailed(false);
    setAnnouncement(
      next
        ? t.ui.rating.announceSet(
            options(t).find((option) => option.value === next)!.label,
          )
        : t.ui.rating.announceCleared,
    );
    mutation.mutate(
      { exhibitionId, rating: next },
      {
        onSuccess: () => {
          saved.current = next;
        },
        onError: () => {
          if (request !== latest.current) return;
          setRating(saved.current);
          setFailed(true);
          setAnnouncement(t.ui.rating.saveError);
        },
      },
    );
  }

  return (
    <div className="flex items-center gap-3 font-sans text-sm">
      <RatingButtons rating={rating} onChoose={handleClick} />
      {mutation.isPending ? (
        <span className="text-muted">{t.ui.updating}</span>
      ) : (
        failed && <span className="text-signal">{t.ui.rating.saveError}</span>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

export function RatingButtons({
  rating,
  onChoose,
}: {
  rating: Rating | null;
  onChoose: (value: Rating) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.ui.rating.group}
      className="border-rule flex border"
    >
      {options(t).map(({ value, glyph, label }, index) => {
        const pressed = rating === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            aria-label={label}
            title={label}
            onClick={() => onChoose(value)}
            className={`border-rule flex h-11 w-11 items-center justify-center text-lg transition-colors duration-150 ${
              index > 0 ? "border-l" : ""
            } ${pressed ? "bg-signal" : "hover:bg-surface"}`}
          >
            <span aria-hidden className="block translate-y-0.5 leading-none">
              {glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
