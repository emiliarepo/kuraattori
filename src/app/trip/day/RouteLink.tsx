"use client";

import { useEffect, useState } from "react";

import { isApplePlatform, routeHref, type RoutePoint } from "~/app/_lib/maps";
import { t } from "~/i18n/fi";

export function RouteLink({ points }: { points: RoutePoint[] }) {
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
      className="btn btn-primary"
    >
      {t.pages.day.showRoute}
    </a>
  );
}
