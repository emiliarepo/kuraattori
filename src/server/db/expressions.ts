import { sql } from "drizzle-orm";

import { exhibitions } from "./schema";

/** Matches `exhibition_kind_end_idx`; filters and ordering must use this exact expression for the index to apply. */
export const endDateOrFar = sql`coalesce(${exhibitions.endDate}, '9999-12-31')`;
