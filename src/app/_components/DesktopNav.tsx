"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, NAV_ITEMS } from "~/app/_components/nav";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Päänavigaatio" className="hidden gap-6 sm:flex">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`text-kicker hover:text-signal transition-colors duration-150 ${
              active ? "text-signal" : ""
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
