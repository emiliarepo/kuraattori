import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "~/app/_lib/site-url";
import { LOCALE_COOKIE, resolveLocale } from "~/i18n/locales";
import { oldHostRedirect } from "~/server/old-host";
import { PATHNAME_HEADER } from "~/server/request-path";
import {
  buildMaintenanceResponse,
  getMaintenanceFlag,
} from "~/server/maintenance";

export default async function middleware(request: NextRequest) {
  const redirect = oldHostRedirect(new URL(request.url), siteUrl);
  if (redirect) return NextResponse.redirect(redirect, 308);
  const flag = await getMaintenanceFlag();
  if (flag)
    return buildMaintenanceResponse(
      flag,
      resolveLocale(
        null,
        request.cookies.get(LOCALE_COOKIE)?.value,
        request.headers.get("accept-language"),
      ),
    );
  // Layouts can't read their own path; the settings guard needs it to send a
  // signed-out visitor back to the tab they asked for.
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}
