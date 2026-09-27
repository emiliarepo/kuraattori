"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { t } from "~/i18n/fi";

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
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = sessionStorage.getItem(key);
    if (saved) el.scrollLeft = Number(saved);

    function update() {
      if (!el) return;
      setEdges({
        start: el.scrollLeft <= 1,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      });
    }
    function handleScroll() {
      if (!el) return;
      sessionStorage.setItem(key, String(el.scrollLeft));
      update();
    }
    update();
    el.addEventListener("scroll", handleScroll, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [key]);

  function scrollByPage(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  const button =
    "border-rule bg-bg/90 hover:bg-surface text-fg absolute top-[8.25rem] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border font-sans text-xl disabled:pointer-events-none disabled:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:flex";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t.ui.rail.previous(title)}
        disabled={edges.start}
        onClick={() => scrollByPage(-1)}
        className={`${button} -left-2 sm:-left-4`}
      >
        <span aria-hidden>‹</span>
      </button>
      <ul ref={ref} aria-label={title} className={className}>
        {children}
      </ul>
      <button
        type="button"
        aria-label={t.ui.rail.next(title)}
        disabled={edges.end}
        onClick={() => scrollByPage(1)}
        className={`${button} -right-2 sm:-right-4`}
      >
        <span aria-hidden>›</span>
      </button>
    </div>
  );
}
