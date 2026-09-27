"use client";

import { FeedShortcut } from "~/app/_components/FeedShortcut";
import { useI18n } from "~/i18n/client";
import { requestLocateOnArrival } from "./locate-intent";

export function NearbyBanner() {
  const { t } = useI18n();
  return (
    <FeedShortcut
      href="/nearby"
      title={t.pages.nearby.banner}
      hint={t.pages.nearby.bannerHint}
      onClick={requestLocateOnArrival}
    />
  );
}
