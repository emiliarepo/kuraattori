import { readFileSync } from "node:fs";

const ROWS_PATTERN = /\[d1-budget\] \+\d+ rows \(running total (\d+) over/;
const EXCEEDED_PATTERN = /\[d1-budget\] budget exceeded/;

/**
 * `scripts/e2e-server.ts` timestamps every stdout/stderr line from the app
 * server as `<epoch-ms> <line>` before appending it to `logPath`; this reads
 * only the lines written since `sinceMs`.
 */
function linesSince(logPath: string, sinceMs: number): string[] {
  let content: string;
  try {
    content = readFileSync(logPath, "utf-8");
  } catch {
    return [];
  }
  return content
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      const spaceIndex = line.indexOf(" ");
      const time = Number(line.slice(0, spaceIndex));
      return time >= sinceMs ? [line.slice(spaceIndex + 1)] : [];
    });
}

export interface ReadBudgetResult {
  /** True if any burst (roughly: one page's worth of statements) exceeded issues/23's row budget. */
  exceeded: boolean;
  /** The highest single-burst running total seen, for failure messages. */
  maxRunningTotal: number;
  offendingLines: string[];
}

/** Reads the app server's log since `sinceMs` and checks it against issues/23's dev read-budget guard (`src/server/db/read-budget.ts`). */
export function checkReadBudget(
  logPath: string,
  sinceMs: number,
): ReadBudgetResult {
  const lines = linesSince(logPath, sinceMs);
  const offendingLines = lines.filter((line) => EXCEEDED_PATTERN.test(line));
  const maxRunningTotal = lines.reduce((max, line) => {
    const match = ROWS_PATTERN.exec(line);
    return match?.[1] ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return {
    exceeded: offendingLines.length > 0,
    maxRunningTotal,
    offendingLines,
  };
}
