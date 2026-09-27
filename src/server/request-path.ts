import { headers } from "next/headers";

export const PATHNAME_HEADER = "x-kuraattori-pathname";

/** The sign-in URL that brings a signed-out visitor back to this request's page. */
export async function signInHereUrl(fallback: string): Promise<string> {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? fallback;
  return `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`;
}
