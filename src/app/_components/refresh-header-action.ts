"use server";

import { revalidatePath } from "next/cache";

/** The header reads regions/interests server-side; without this a cached page can still show stale values after an edit here. */
export async function refreshHeaderData() {
  revalidatePath("/", "layout");
}
