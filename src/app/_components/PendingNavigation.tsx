"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";

const PendingCountContext = createContext<{
  count: number;
  adjust: (delta: number) => void;
}>({ count: 0, adjust: () => undefined });

export function PendingNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);
  const adjust = useCallback(
    (delta: number) => setCount((value) => value + delta),
    [],
  );
  return (
    <PendingCountContext.Provider value={{ count, adjust }}>
      {children}
    </PendingCountContext.Provider>
  );
}

/** Dims while any control's navigation is pending. */
export function PendingContent({ children }: { children: React.ReactNode }) {
  const { count } = useContext(PendingCountContext);
  const pending = count > 0;
  return (
    <div
      aria-busy={pending}
      className={`transition-opacity duration-150 ${pending ? "opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

/**
 * Wrap a control's `router.push` / `replace` / `refresh` in `start` so the
 * page content dims until the new server render lands; `pending` is for the
 * control's own "Päivitetään…" label.
 */
export function usePendingNavigation(): {
  pending: boolean;
  start: (navigate: () => void | Promise<void>) => void;
} {
  const [pending, startTransition] = useTransition();
  const { adjust } = useContext(PendingCountContext);
  useEffect(() => {
    if (!pending) return;
    adjust(1);
    return () => adjust(-1);
  }, [pending, adjust]);
  return { pending, start: startTransition };
}
