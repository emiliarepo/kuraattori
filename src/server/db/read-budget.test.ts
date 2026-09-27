import { describe, expect, it, vi } from "vitest";

import { wrapD1ForReadBudget } from "./read-budget";

/**
 * A minimal D1-shaped stub. The critical case: two joined "tables" with a
 * colliding column name (`id`), which is exactly why Drizzle routes such
 * queries through `raw()` (positional arrays) instead of `all()`/`run()`
 * (object-keyed rows, where the second `id` would silently overwrite the
 * first) — the wrapper must never substitute one for the other.
 */
function fakeStatement(sql: string) {
  return {
    bind: vi.fn(() => fakeStatement(sql)),
    raw: vi.fn(async () => [
      [1, "a-source", 2, "b-source"],
      [3, "c-source", 4, "d-source"],
    ]),
    all: vi.fn(async () => ({
      success: true as const,
      meta: { rows_read: 7, rows_written: 0 },
      results: [{ id: 1, name: "a" }],
    })),
    run: vi.fn(async () => ({
      success: true as const,
      meta: { rows_read: 3, rows_written: 1 },
      results: [],
    })),
  };
}

function fakeDb() {
  return {
    prepare: vi.fn((sql: string) => fakeStatement(sql)),
  };
}

describe("wrapD1ForReadBudget", () => {
  it("returns raw()'s positional rows untouched, never reconstructed from an object-keyed run()", async () => {
    const db = fakeDb();
    const wrapped = wrapD1ForReadBudget(db as unknown as D1Database);
    const stmt = wrapped.prepare("select * from a join b").bind();
    const rows = await stmt.raw();
    expect(rows).toEqual([
      [1, "a-source", 2, "b-source"],
      [3, "c-source", 4, "d-source"],
    ]);
  });

  it("passes all() and run() results through unchanged", async () => {
    const db = fakeDb();
    const wrapped = wrapD1ForReadBudget(db as unknown as D1Database);
    const allResult = await wrapped.prepare("select 1").bind().all();
    expect(allResult.results).toEqual([{ id: 1, name: "a" }]);

    const runResult = await wrapped
      .prepare("insert into a values (1)")
      .bind()
      .run();
    expect(runResult.meta.rows_read).toBe(3);
  });
});
