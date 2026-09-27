/**
 * Cloudflare D1 surfaces failures (row-limit hits, timeouts, connection
 * loss) as an `Error` whose message is prefixed `D1_ERROR:`, often trailed
 * by a `SQLITE_*` code. Used to flag these specifically in logs.
 */
const D1_ERROR_PREFIX = /^D1_ERROR:/i;
const D1_ERROR_CODE = /\b(SQLITE_\w+)\b/;

export function describeD1Error(error: unknown): {
  isD1Error: boolean;
  code: string | null;
} {
  const message = error instanceof Error ? error.message : String(error);
  if (!D1_ERROR_PREFIX.test(message)) return { isD1Error: false, code: null };
  return { isD1Error: true, code: D1_ERROR_CODE.exec(message)?.[1] ?? null };
}

/**
 * Logs a server-side failure with enough context to diagnose it from
 * `wrangler tail`/Workers Logs alone: where it happened, whether a user was
 * signed in, and the D1 error code when the failure came from D1.
 */
export function logServerError(
  source: string,
  error: unknown,
  context: { userId?: string | null } = {},
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const { isD1Error, code } = describeD1Error(err);
  console.error("[server-error]", {
    source,
    userIdPresent: Boolean(context.userId),
    errorName: err.name,
    errorMessage: err.message,
    d1ErrorCode: isD1Error ? (code ?? "unknown") : null,
  });
}
