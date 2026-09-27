"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Anonymous visitors at `/` see the landing page, whose cover title replaces the logo. */
export function MastheadTitle({
  name,
  signedIn,
}: {
  name: string;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  if (!signedIn && pathname === "/") {
    return (
      <h1 className="landing-rise text-headline text-center text-[20vw] leading-[0.85] tracking-[-0.04em] italic sm:text-[9.5rem]">
        {name}
      </h1>
    );
  }
  return (
    <Link
      href="/"
      className="font-serif text-[2rem] leading-none tracking-tight italic sm:text-5xl"
    >
      {name}
    </Link>
  );
}
