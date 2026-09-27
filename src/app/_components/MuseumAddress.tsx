"use client";

import { useEffect, useState } from "react";

import { isApplePlatform, mapHref } from "~/app/_lib/maps";
import { t } from "~/i18n/fi";

export function MuseumAddress({
  name,
  address,
}: {
  name: string;
  address: string;
}) {
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
    <div className="font-sans text-sm">
      <p>{address}</p>
      <a
        href={mapHref(name, address, apple)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${t.pages.museums.showOnMap}: ${name}`}
        className="hover:text-signal inline-block py-2 underline underline-offset-4"
      >
        {t.pages.museums.showOnMap}
      </a>
    </div>
  );
}
