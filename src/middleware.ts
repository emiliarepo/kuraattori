import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, resolveLocale } from "~/i18n/locales";
import {
  buildMaintenanceResponse,
  getMaintenanceFlag,
} from "~/server/maintenance";

export default async function middleware(request: NextRequest) {
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
