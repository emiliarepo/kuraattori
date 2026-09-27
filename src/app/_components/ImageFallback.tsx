"use client";

import { useRef, useState } from "react";

export function ImageFallback({
  src,
  alt,
  title,
  aspectRatio = "4 / 3",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  title: string;
  aspectRatio?: string;
  /** The lead story image: loads eagerly at high priority instead of lazily. */
  priority?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const checkedRef = useRef(false);

  // A same-tick 404 can fire the native error event before React attaches
  // the onError listener, so also check the already-failed state on mount.
  function handleImageRef(img: HTMLImageElement | null) {
    if (img && !checkedRef.current) {
      checkedRef.current = true;
      if (img.complete && img.naturalWidth === 0) setBroken(true);
    }
  }

  if (!src || broken) {
    return (
      <div
        className="bg-surface flex items-center justify-center overflow-hidden p-3"
        style={{ aspectRatio }}
      >
        <p className="text-headline text-fg text-center text-base">{title}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden" style={{ aspectRatio }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked museot.fi images, not under our domain */}
      <img
        ref={handleImageRef}
        src={src}
        alt={alt}
        onError={() => setBroken(true)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
