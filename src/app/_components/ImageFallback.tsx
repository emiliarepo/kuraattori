"use client";

import { useState } from "react";

/** Tries each of `sources` in turn, then shows the title as a typographic placeholder. */
export function ImageFallback({
  sources,
  alt,
  title,
  aspectRatio = "4 / 3",
  priority = false,
}: {
  sources: readonly string[];
  alt: string;
  title: string;
  aspectRatio?: string;
  /** The lead story image: loads eagerly at high priority instead of lazily. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  // The mount check and onError can both report the same failure.
  const skip = (index: number) => setFailed((n) => (n === index ? n + 1 : n));

  // A same-tick 404 can fire the native error event before React attaches
  // the onError listener, so also check the already-failed state on mount.
  function handleImageRef(img: HTMLImageElement | null) {
    if (img?.complete && img.naturalWidth === 0) skip(failed);
  }

  if (!src) {
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
      {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked museot.fi images and pre-resized archive copies */}
      <img
        key={src}
        ref={handleImageRef}
        src={src}
        alt={alt}
        onError={() => skip(failed)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
