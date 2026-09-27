"use client";

import { useState } from "react";

import {
  InterestControl,
  type InterestWeight,
} from "~/app/_components/InterestControl";
import { RatingButtons } from "~/app/_components/VisitRating";
import { type VisitRating } from "~/domain/rating-nudges";
import { useI18n } from "~/i18n/client";

/** The real controls with local state only: nothing is saved for an anonymous visitor. */
export function ForYouDemo({ categories }: { categories: string[] }) {
  const { t } = useI18n();
  const [weights, setWeights] = useState<(InterestWeight | null)[]>(() =>
    categories.map((_, index) => (index === 0 ? 2 : 1)),
  );
  const [rating, setRating] = useState<VisitRating | null>("up");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-kicker">{t.landing.forYou.weights}</p>
      <ul className="flex flex-col gap-3">
        {categories.map((name, index) => (
          <li
            key={name}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="font-sans text-sm">{name}</span>
            <InterestControl
              categoryName={name}
              value={weights[index] ?? null}
              onChange={(weight) =>
                setWeights((current) =>
                  current.map((w, i) => (i === index ? weight : w)),
                )
              }
            />
          </li>
        ))}
      </ul>
      <div className="border-rule-soft flex items-center justify-between gap-4 border-t pt-4">
        <span className="text-muted text-sm italic">
          {t.landing.forYou.rating}
        </span>
        <RatingButtons
          rating={rating}
          onChoose={(value) =>
            setRating((current) => (current === value ? null : value))
          }
        />
      </div>
    </div>
  );
}
