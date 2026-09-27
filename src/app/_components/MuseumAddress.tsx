"use client";

import { useEffect, useState } from "react";

import { isApplePlatform, mapHref } from "~/app/_lib/maps";
import { useI18n } from "~/i18n/client";

export function MuseumAddress({
  name,
  address,
}: {
  name: string;
  address: string;
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
