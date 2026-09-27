"use server";

import { revalidatePath } from "next/cache";

/** Status lives on cards/rows across many routes; without this, back navigation can show a stale badge after a change on the detail page. */
export async function refreshStatusData() {
  revalidatePath("/", "layout");
}
