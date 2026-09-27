"use client";

import { useEffect, useState } from "react";

import { isApplePlatform, routeHref, type RoutePoint } from "~/app/_lib/maps";
import { useI18n } from "~/i18n/client";

export function RouteLink({
  points,
  label,
  ariaLabel,
  className = "btn btn-primary",
}: {
  points: RoutePoint[];
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [apple, setApple] = useState(false);

  useEffect(() => {
    setApple(
      isApplePlatform(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      ),
    );
  }, []);

  return (
    <a
      href={routeHref(points, apple)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
    >
      {label ?? t.pages.day.showRoute}
    </a>
  );
}
