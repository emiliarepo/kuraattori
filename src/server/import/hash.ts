import { createHash } from "node:crypto";

/** Stable hash of a listing payload, used to detect whether it changed since the last run. */
export function hashListingPayload(
  fields: Record<string, string | undefined>,
): string {
  const stable = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key] ?? ""}`)
    .join("\n");
  return createHash("sha256").update(stable).digest("hex");
}
