"use client";

import { useState } from "react";

import { refreshStatusData } from "~/app/_components/refresh-status-action";
import { t } from "~/i18n/fi";
import { api } from "~/trpc/react";

export function FollowToggle({
  museumId,
  museumName,
  initialFollowing,
  onChange,
  className = "",
}: {
  museumId: number;
  museumName: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  className?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [announcement, setAnnouncement] = useState("");
  const follow = api.museum.follow.useMutation();
  const unfollow = api.museum.unfollow.useMutation();

  function handleClick() {
    const previous = following;
    const next = !previous;
    setFollowing(next);
    onChange?.(next);
    setAnnouncement(
      next
        ? t.ui.follow.announceFollowed(museumName)
        : t.ui.follow.announceUnfollowed(museumName),
    );
    (next ? follow : unfollow).mutate(
      { museumId },
      {
        onSuccess: () => void refreshStatusData(),
        onError: () => {
          setFollowing(previous);
          onChange?.(previous);
        },
      },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={following}
        aria-label={
          following
            ? t.ui.follow.unfollowLabel(museumName)
            : t.ui.follow.followLabel(museumName)
        }
        className={`border-rule min-h-11 border px-3 py-1.5 font-sans text-sm font-semibold transition-colors duration-150 ${
          following ? "bg-signal text-on-signal" : "hover:bg-surface"
        } ${className}`}
      >
        {following ? t.ui.follow.following : t.ui.follow.follow}
      </button>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
