"use client";

import { useEffect, useRef } from "react";

/**
 * While `open`, pushes a history entry so the browser back button closes the
 * sheet instead of leaving the page. Closing any other way (Escape, a
 * button) consumes that same entry via `history.back()`, so it never takes
 * a second back press to actually leave.
 *
 * Call the returned function before closing to navigate instead: the pushed
 * entry is left for the caller's `router.replace` to overwrite, since a
 * `history.back()` here would cancel that navigation.
 */
export function useBackToClose(open: boolean, onClose: () => void): () => void {
  const pushedRef = useRef(false);
  const hrefAtPushRef = useRef("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    history.pushState({ sheet: true }, "");
    pushedRef.current = true;
    hrefAtPushRef.current = location.href;

    function handlePopState() {
      pushedRef.current = false;
      onCloseRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current && location.href === hrefAtPushRef.current) {
        history.back();
      }
      pushedRef.current = false;
    };
  }, [open]);

  return () => {
    pushedRef.current = false;
  };
}
