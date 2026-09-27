"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * For links that appear in long lists: prefetching every one on viewport
 * entry fires dozens of requests per page, so these prefetch on intent
 * (pointer, focus or touch start) instead.
 */
export function HoverPrefetchLink({
  onPointerEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
