"use client";

import { useEffect, useRef } from "react";

/**
 * While `open`, pushes a history entry so the browser back button closes the
 * sheet instead of leaving the page. Closing any other way (Escape, a
 * button) consumes that same entry via `history.back()`, so it never takes
 * a second back press to actually leave.
 */
export function useBackToClose(open: boolean, onClose: () => void): void {
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
      // Closing by navigating elsewhere (e.g. applying filters) already
      // moved past this entry; only consume it ourselves for a plain
      // dismiss, where the URL is still the one we pushed it onto.
      if (pushedRef.current && location.href === hrefAtPushRef.current) {
        history.back();
      }
      pushedRef.current = false;
    };
  }, [open]);
}
