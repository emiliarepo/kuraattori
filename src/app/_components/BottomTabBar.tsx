"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "~/app/_components/nav";

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Päänavigaatio"
      className="border-rule bg-bg fixed inset-x-0 bottom-0 z-10 flex border-t sm:hidden"
    >
      {NAV_ITEMS.map((item, index) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`border-rule flex-1 border-t-2 px-2 py-3 text-center text-xs font-semibold transition-colors duration-150 ${
              index > 0 ? "border-l" : ""
            } ${active ? "border-t-signal text-signal" : "border-t-transparent"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
