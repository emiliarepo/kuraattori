"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export function Hero({
  imageUrl,
  imageAlt,
  title,
  museum,
  href,
}: {
  imageUrl?: string | null;
  imageAlt: string;
  title: string;
  museum: string;
  href: string;
}) {
  const [broken, setBroken] = useState(false);
  const checkedRef = useRef(false);
  const showImage = Boolean(imageUrl) && !broken;

  // A same-tick 404 can fire the native error event before React attaches
  // the onError listener, so also check the already-failed state on mount.
  function handleImageRef(img: HTMLImageElement | null) {
    if (img && !checkedRef.current) {
      checkedRef.current = true;
      if (img.complete && img.naturalWidth === 0) setBroken(true);
    }
  }

  return (
    <Link
      href={href}
      className="bg-surface relative block aspect-[4/5] w-full overflow-hidden sm:aspect-[21/9]"
    >
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked museot.fi images, not under our domain */}
          <img
            ref={handleImageRef}
            src={imageUrl ?? undefined}
            alt={imageAlt}
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <p className="text-headline text-3xl text-white sm:text-5xl">
              {title}
            </p>
            <p className="mt-1 text-sm text-white/80 sm:text-base">{museum}</p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-6 text-center">
          <p className="text-headline text-fg text-3xl">{title}</p>
          <p className="text-muted text-sm">{museum}</p>
        </div>
      )}
    </Link>
  );
}
