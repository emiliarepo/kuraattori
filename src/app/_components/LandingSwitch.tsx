"use client";

import { usePathname } from "next/navigation";

/** Anonymous visitors at `/` see the landing page, which replaces the app chrome. */
export function useIsLanding(signedIn: boolean): boolean {
  const pathname = usePathname();
  return !signedIn && pathname === "/";
}

export function LandingSwitch({
  signedIn,
  landing,
  children,
}: {
  signedIn: boolean;
  landing: React.ReactNode;
  children: React.ReactNode;
}) {
  return useIsLanding(signedIn) ? landing : children;
}
