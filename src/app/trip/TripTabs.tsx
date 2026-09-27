"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { usePendingLink } from "~/app/_components/usePendingLink";
import { useI18n } from "~/i18n/client";

const TRIP_KEYS = ["place", "from", "to"] as const;

export function TripTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { target, onClick } = usePendingLink();
  const current = target ?? pathname;
  const searchParams = useSearchParams();
  const trip = new URLSearchParams();
  for (const key of TRIP_KEYS) {
    const value = searchParams.get(key);
    if (value) trip.set(key, value);
  }
  const query = trip.toString();
  const tabs = [
    {
      href: "/trip",
      label: t.pages.trip.tabTrip,
      active: current === "/trip",
    },
    {
      href: "/trip/day",
      label: t.pages.trip.tabDay,
      active: current.startsWith("/trip/day"),
    },
  ];

  return (
    <nav
      aria-label={t.pages.trip.tabs}
      className="border-rule-soft flex border-b"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={query ? `${tab.href}?${query}` : tab.href}
          onClick={onClick}
          aria-current={tab.active ? "page" : undefined}
          className={`text-kicker -mb-px border-b-2 px-3 py-3.5 whitespace-nowrap transition-colors duration-150 first:pl-0 focus-visible:-outline-offset-2 sm:px-4 ${
            tab.active ? "border-b-signal text-signal" : "border-b-transparent"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
