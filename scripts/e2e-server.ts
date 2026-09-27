import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Runs `wrangler dev` as a child process, timestamping every stdout/stderr
 * line into a log file as it's echoed through: Playwright's `webServer`
 * doesn't expose a running server's output to tests, but the Playwright
 * suite needs it to check issues/23's D1 read-budget guard per page (the
 * guard logs to the Worker's own console, which `wrangler dev` prints to
 * this process's stdout, not the browser's).
 *
 * Usage: tsx scripts/e2e-server.ts <log-path> -- <wrangler dev args...>
 */
const [rawLogPath, ...rest] = process.argv.slice(2);
if (!rawLogPath) {
  throw new Error("usage: e2e-server.ts <log-path> -- <wrangler dev args...>");
}
const logPath: string = rawLogPath;
const wranglerArgs = rest[0] === "--" ? rest.slice(1) : rest;

mkdirSync(dirname(logPath), { recursive: true });
rmSync(logPath, { force: true });

function logChunk(chunk: Buffer) {
  const text = chunk.toString("utf-8");
  process.stdout.write(text);
  const time = Date.now();
  const lines = text.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) return;
  appendFileSync(logPath, lines.map((line) => `${time} ${line}\n`).join(""));
}

const child = spawn("wrangler", ["dev", ...wranglerArgs], {
  stdio: ["inherit", "pipe", "pipe"],
});
child.stdout.on("data", logChunk);
child.stderr.on("data", logChunk);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
