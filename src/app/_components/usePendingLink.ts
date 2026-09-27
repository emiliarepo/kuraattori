"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, type MouseEvent } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";

/**
 * For links whose target shares the current layout (sub-tabs, same-page
 * variants): nothing re-suspends, so without this the page sits still until
 * the server render lands. `target` is the pathname being navigated to.
 */
export function usePendingLink(): {
  target: string | null;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
} {
  const router = useRouter();
  const { start } = usePendingNavigation();
  const [target, setTarget] = useOptimistic<string | null>(null);
  return {
    target,
    onClick: (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      const url = new URL(event.currentTarget.href);
      start(() => {
        setTarget(url.pathname);
        router.push(url.pathname + url.search);
      });
    },
  };
}
