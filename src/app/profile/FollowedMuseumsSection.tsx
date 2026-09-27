"use client";

import { useState } from "react";

import { FollowToggle } from "~/app/_components/FollowToggle";
import { t } from "~/i18n/fi";

export interface FollowedMuseum {
  id: number;
  name: string;
  slug: string;
  city: string | null;
}

export function FollowedMuseumsSection({
  initialMuseums,
}: {
  initialMuseums: readonly FollowedMuseum[];
}) {
  const [museums, setMuseums] = useState(initialMuseums);

  return (
    <div className="border-rule-soft mt-6 flex flex-col gap-3 border-t pt-4">
      <h2 className="text-kicker text-muted">{t.profile.museums.heading}</h2>
      {museums.length === 0 ? (
        <p className="text-muted text-sm">{t.profile.museums.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {museums.map((museum) => (
            <li
              key={museum.id}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-lg">
                {museum.name}
                {museum.city && (
                  <span className="text-muted ml-2 text-sm italic">
                    {museum.city}
                  </span>
                )}
              </span>
              <FollowToggle
                museumId={museum.id}
                museumName={museum.name}
                initialFollowing
                onChange={(following) => {
                  if (!following)
                    setMuseums((current) =>
                      current.filter((entry) => entry.id !== museum.id),
                    );
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
