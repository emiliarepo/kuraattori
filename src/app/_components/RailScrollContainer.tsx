"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Restores a rail's horizontal scroll position after back navigation:
 * Next re-renders the list fresh, so the browser has nothing of its own to
 * restore here (unlike the window scroll). Keyed by path + title in
 * `sessionStorage`, so it also survives a full reload.
 */
export function RailScrollContainer({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLUListElement>(null);
  const key = `rail-scroll:${pathname}:${title}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = sessionStorage.getItem(key);
    if (saved) el.scrollLeft = Number(saved);

    function handleScroll() {
      if (el) sessionStorage.setItem(key, String(el.scrollLeft));
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [key]);

  return (
    <ul ref={ref} aria-label={title} className={className}>
      {children}
    </ul>
  );
}
