"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { t } from "~/i18n/fi";

const TRIP_KEYS = ["place", "from", "to"] as const;

export function TripTabs() {
  const pathname = usePathname();
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
      active: pathname === "/trip",
    },
    {
      href: "/trip/day",
      label: t.pages.trip.tabDay,
      active: pathname.startsWith("/trip/day"),
    },
  ];

  return (
    <nav
      aria-label={t.pages.trip.tabs}
      className="border-rule-soft mb-8 flex border-b"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={query ? `${tab.href}?${query}` : tab.href}
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
