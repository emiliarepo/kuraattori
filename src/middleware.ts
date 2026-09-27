import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "~/app/_lib/site-url";
import { LOCALE_COOKIE, resolveLocale } from "~/i18n/locales";
import { oldHostRedirect } from "~/server/old-host";
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
  return NextResponse.next();
}
