import { describe, expect, it } from "vitest";

import {
  METRICS,
  compareToBudgets,
  nextMidnightUtc,
  readBudgetsFromEnv,
} from "./check-usage-budgets.mjs";

const usage = {
  workerRequests: 100,
  workerCpuMs: 1000,
  d1RowsRead: 500,
  d1RowsWritten: 50,
  kvReads: 20,
  kvWrites: 5,
  r2ClassA: 1,
  r2ClassB: 1,
};

const budgets = {
  workerRequests: 200,
  workerCpuMs: 2000,
  d1RowsRead: 400,
  d1RowsWritten: 100,
  kvReads: 50,
  kvWrites: 10,
  r2ClassA: 10,
  r2ClassB: 10,
};

describe("compareToBudgets", () => {
  it("flags only the metrics over their budget", () => {
    const result = compareToBudgets(usage, budgets);
    expect(result).toHaveLength(METRICS.length);
    expect(result.find((r) => r.key === "d1RowsRead")).toMatchObject({
      value: 500,
      budget: 400,
      exceeded: true,
    });
    expect(result.filter((r) => r.exceeded).map((r) => r.key)).toEqual([
      "d1RowsRead",
    ]);
  });

  it("treats usage exactly at budget as not exceeded", () => {
    const result = compareToBudgets({ ...usage, workerRequests: 200 }, budgets);
    expect(result.find((r) => r.key === "workerRequests")?.exceeded).toBe(
      false,
    );
  });
});

describe("nextMidnightUtc", () => {
  it("returns the following UTC midnight", () => {
    expect(
      nextMidnightUtc(new Date("2026-09-27T10:15:00Z")).toISOString(),
    ).toBe("2026-09-28T00:00:00.000Z");
  });

  it("rolls over a month boundary", () => {
    expect(
      nextMidnightUtc(new Date("2026-09-30T23:59:59Z")).toISOString(),
    ).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("readBudgetsFromEnv", () => {
  const validEnv: Record<string, string> = Object.fromEntries(
    METRICS.map(({ budgetEnv }: { budgetEnv: string }) => [budgetEnv, "1000"]),
  );

  it("parses every budget from its repository variable", () => {
    const result = readBudgetsFromEnv(validEnv) as Record<string, number>;
    for (const { key } of METRICS) expect(result[key]).toBe(1000);
  });

  it("throws when a budget variable is missing", () => {
    const { BUDGET_WORKER_REQUESTS: _drop, ...rest } = validEnv;
    expect(() => readBudgetsFromEnv(rest)).toThrow(/BUDGET_WORKER_REQUESTS/);
  });

  it("throws when a budget variable isn't a positive number", () => {
    expect(() =>
      readBudgetsFromEnv({ ...validEnv, BUDGET_KV_WRITES: "0" }),
    ).toThrow(/BUDGET_KV_WRITES/);
  });
});
