/**
 * Dev-only instrumentation for the D1 read budget (issues/23): logs
 * `rows_read` per statement and warns when a burst of statements — a rough
 * stand-in for "one request", since Workers gives no cheap request-scoped
 * hook here — crosses the budget. Never wired in production (see `getDb`).
 */
const ROW_BUDGET = 5000;
const NEW_BURST_GAP_MS = 500;

let burstRowsRead = 0;
let burstStatementCount = 0;
let lastStatementAt = 0;
let warnedThisBurst = false;

function preview(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, 100);
}

function record(sql: string, rowsRead: number): void {
  const now = Date.now();
  if (now - lastStatementAt > NEW_BURST_GAP_MS) {
    burstRowsRead = 0;
    burstStatementCount = 0;
    warnedThisBurst = false;
  }
  lastStatementAt = now;
  burstRowsRead += rowsRead;
  burstStatementCount += 1;

  console.log(
    `[d1-budget] +${rowsRead} rows (running total ${burstRowsRead} over ${burstStatementCount} statements) :: ${preview(sql)}`,
  );
  if (burstRowsRead > ROW_BUDGET && !warnedThisBurst) {
    warnedThisBurst = true;
    console.warn(
      `[d1-budget] budget exceeded: ${burstRowsRead} rows read (budget ${ROW_BUDGET}). See issues/23-performance-and-back-navigation.md.`,
    );
  }
}

function wrapStatement(
  stmt: D1PreparedStatement,
  sql: string,
): D1PreparedStatement {
  return new Proxy(stmt, {
    get(target, prop, receiver) {
      if (prop === "bind") {
        return (...args: unknown[]) => wrapStatement(target.bind(...args), sql);
      }
      if (prop === "all") {
        return async () => {
          const result = await target.all();
          record(sql, result.meta.rows_read);
          return result;
        };
      }
      if (prop === "run") {
        return async () => {
          const result = await target.run();
          record(sql, result.meta.rows_read);
          return result;
        };
      }
      if (prop === "raw") {
        // Drizzle routes joined/nested selects (duplicate column names
        // across tables, e.g. exhibitions.id and museums.id) through
        // raw(), which D1 doesn't attach `meta` to. Re-running as run()
        // for its meta would double the real D1 read cost, and object-
        // keyed rows can't safely stand in for raw()'s positional arrays
        // when column names collide, so this logs the returned row count
        // as a lower-bound estimate and calls the real raw() untouched.
        return async () => {
          const result = await target.raw();
          record(`${sql} -- rows_read unavailable via raw()`, result.length);
          return result;
        };
      }
      const value: unknown = Reflect.get(target, prop, receiver);
      return value;
    },
  });
}

export function wrapD1ForReadBudget(db: D1Database): D1Database {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === "prepare") {
        return (query: string) => wrapStatement(target.prepare(query), query);
      }
      const value: unknown = Reflect.get(target, prop, receiver);
      return value;
    },
  });
}
