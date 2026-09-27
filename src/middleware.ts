import { NextResponse } from "next/server";

import {
  buildMaintenanceResponse,
  getMaintenanceFlag,
} from "~/server/maintenance";

export default async function middleware() {
  const flag = await getMaintenanceFlag();
  if (flag) return buildMaintenanceResponse(flag);
  return NextResponse.next();
}
