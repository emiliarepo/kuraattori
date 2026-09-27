"use client";

import Link from "next/link";

import { useI18n } from "~/i18n/client";
import { requestLocateOnArrival } from "./locate-intent";

export function NearbyBanner() {
  const { t } = useI18n();
  return (
    <Link
      href="/nearby"
      onClick={requestLocateOnArrival}
      className="group flex min-h-11 items-center gap-3"
    >
      <span className="text-headline group-hover:text-signal text-lg italic sm:text-xl">
        {t.pages.nearby.banner} →
      </span>
      <span className="text-muted hidden font-sans text-sm sm:inline">
        {t.pages.nearby.bannerHint}
      </span>
    </Link>
  );
}
