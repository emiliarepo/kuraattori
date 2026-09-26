import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "~/server/db/schema";

interface D1QueryResult {
  success: boolean;
  results: Record<string, unknown>[];
}

interface D1ApiResponse {
  success: boolean;
  result: D1QueryResult[];
  errors: { code: number; message: string }[];
}

/**
 * Drizzle's sqlite-proxy driver talking to Cloudflare's D1 HTTP API, for the
 * GitHub Actions run against the remote database (see docs/design.md: the
 * free plan's 10ms Workers-cron CPU limit rules out running the import as a
 * Worker, so it runs from Node against the REST API instead).
 */
export function createRemoteDb(config: {
  accountId: string;
  databaseId: string;
  apiToken: string;
}) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  async function execute(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const body = (await response.json()) as D1ApiResponse;
    if (!response.ok || !body.success) {
      const message =
        body.errors?.map((e) => e.message).join("; ") ?? response.statusText;
      throw new Error(`D1 HTTP API request failed: ${message}`);
    }
    return body.result[0]?.results ?? [];
  }

  return drizzle(
    async (sql, params, method) => {
      const rows = await execute(sql, params);
      if (method === "get") {
        return { rows: rows[0] ? Object.values(rows[0]) : [] };
      }
      return { rows: rows.map((row) => Object.values(row)) };
    },
    async (queries) => {
      const results: { rows: unknown[][] }[] = [];
      for (const query of queries) {
        const rows = await execute(query.sql, query.params);
        results.push({ rows: rows.map((row) => Object.values(row)) });
      }
      return results;
    },
    { schema },
  );
}
