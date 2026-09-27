// @ts-nocheck — a dependency-free ops script (health.yml runs it with bare
// `node`, no install step), not typed application code.
import { appendFile } from "node:fs/promises";

// Mirrors wrangler.jsonc; both are public identifiers (not secrets), so
// there's no repository variable/secret for them.
export const SCRIPT_NAME = "kuraattori";
export const KV_NAMESPACE_ID = "90ab6e16443148e0a8ab33f924c64fea";
export const MAINTENANCE_KV_KEY = "maintenance";

// See Cloudflare's R2 pricing docs for this split; the app doesn't use R2
// today (see open-next.config.ts), so in practice these stay near zero.
const R2_CLASS_A_ACTIONS = new Set([
  "ListBuckets",
  "PutBucket",
  "ListObjects",
  "PutObject",
  "CopyObject",
  "CompleteMultipartUpload",
  "CreateMultipartUpload",
  "LifecycleStorageTierTransition",
  "ListMultipartUploads",
  "UploadPart",
  "UploadPartCopy",
  "ListParts",
  "PutBucketEncryption",
  "PutBucketCors",
  "PutBucketLifecycleConfiguration",
]);
const R2_CLASS_B_ACTIONS = new Set([
  "HeadBucket",
  "HeadObject",
  "GetObject",
  "UsageSummary",
  "GetBucketEncryption",
  "GetBucketLocation",
  "GetBucketCors",
  "GetBucketLifecycleConfiguration",
]);

export const METRICS = [
  { key: "workerRequests", label: "Worker requests", budgetEnv: "BUDGET_WORKER_REQUESTS" },
  {
    key: "workerCpuMs",
    label: "Worker CPU ms (requests × median CPU time; GraphQL has no daily total)",
    budgetEnv: "BUDGET_WORKER_CPU_MS",
  },
  { key: "d1RowsRead", label: "D1 rows read", budgetEnv: "BUDGET_D1_ROWS_READ" },
  { key: "d1RowsWritten", label: "D1 rows written", budgetEnv: "BUDGET_D1_ROWS_WRITTEN" },
  { key: "kvReads", label: "KV reads", budgetEnv: "BUDGET_KV_READS" },
  { key: "kvWrites", label: "KV writes", budgetEnv: "BUDGET_KV_WRITES" },
  { key: "r2ClassA", label: "R2 Class A operations", budgetEnv: "BUDGET_R2_CLASS_A" },
  { key: "r2ClassB", label: "R2 Class B operations", budgetEnv: "BUDGET_R2_CLASS_B" },
];

/** The next UTC midnight strictly after `now` — the flag's expiry. */
export function nextMidnightUtc(now) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/** Pure comparison: no network, no environment — easy to unit test. */
export function compareToBudgets(usage, budgets) {
  return METRICS.map(({ key, label }) => {
    const value = usage[key];
    const budget = budgets[key];
    return { key, label, value, budget, exceeded: value > budget };
  });
}

export function readBudgetsFromEnv(env) {
  const budgets = {};
  for (const { key, budgetEnv } of METRICS) {
    const raw = env[budgetEnv];
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Repository variable ${budgetEnv} is missing or not a positive number`);
    }
    budgets[key] = parsed;
  }
  return budgets;
}

function summaryTable(comparisons) {
  const rows = comparisons.map(
    ({ label, value, budget, exceeded }) =>
      `| ${label} | ${value.toLocaleString("en-US")} | ${budget.toLocaleString("en-US")} | ${exceeded ? "⚠️ over" : "ok"} |`,
  );
  return [
    `## Usage vs budget, ${new Date().toISOString().slice(0, 10)} UTC (since 00:00)`,
    "",
    "| Metric | Today | Budget | Status |",
    "| --- | ---: | ---: | :--- |",
    ...rows,
    "",
  ].join("\n");
}

async function graphql(token, query, variables) {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Cloudflare Analytics API returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(`Cloudflare Analytics API returned: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  const accounts = body.data?.viewer?.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1) {
    throw new Error("Expected one Cloudflare account in analytics response");
  }
  return accounts[0];
}

async function fetchWorkerUsage({ accountTag, token, today }) {
  const account = await graphql(
    token,
    `query($accountTag: string!, $scriptName: string!, $today: Date) {
      viewer { accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(limit: 100, filter: { scriptName: $scriptName, date_geq: $today, date_leq: $today }) {
          sum { requests }
          quantiles { cpuTimeP50 }
        }
      } }
    }`,
    { accountTag, scriptName: SCRIPT_NAME, today },
  );
  const groups = account.workersInvocationsAdaptive ?? [];
  const requests = groups.reduce((sum, g) => sum + g.sum.requests, 0);
  // cpuTimeP50 is per-request microseconds; there's no daily-total field, so
  // this is a median-based estimate, not a real sum (see METRICS' label).
  const cpuMsEstimate = groups.reduce(
    (sum, g) => sum + g.sum.requests * ((g.quantiles?.cpuTimeP50 ?? 0) / 1000),
    0,
  );
  return { workerRequests: requests, workerCpuMs: Math.round(cpuMsEstimate) };
}

async function fetchD1Usage({ accountTag, token, databaseId, today }) {
  const account = await graphql(
    token,
    `query($accountTag: string!, $databaseId: string, $today: Date) {
      viewer { accounts(filter: { accountTag: $accountTag }) {
        d1AnalyticsAdaptiveGroups(limit: 100, filter: { databaseId: $databaseId, date_geq: $today, date_leq: $today }) {
          sum { rowsRead rowsWritten }
        }
      } }
    }`,
    { accountTag, databaseId, today },
  );
  const groups = account.d1AnalyticsAdaptiveGroups ?? [];
  return {
    d1RowsRead: groups.reduce((sum, g) => sum + g.sum.rowsRead, 0),
    d1RowsWritten: groups.reduce((sum, g) => sum + g.sum.rowsWritten, 0),
  };
}

async function fetchKvUsage({ accountTag, token, today }) {
  const account = await graphql(
    token,
    `query($accountTag: string!, $namespaceId: string, $today: Date) {
      viewer { accounts(filter: { accountTag: $accountTag }) {
        kvOperationsAdaptiveGroups(limit: 100, filter: { namespaceId: $namespaceId, date_geq: $today, date_leq: $today }) {
          dimensions { actionType }
          sum { requests }
        }
      } }
    }`,
    { accountTag, namespaceId: KV_NAMESPACE_ID, today },
  );
  const groups = account.kvOperationsAdaptiveGroups ?? [];
  const sumFor = (actionType) =>
    groups
      .filter((g) => g.dimensions.actionType === actionType)
      .reduce((sum, g) => sum + g.sum.requests, 0);
  return { kvReads: sumFor("read"), kvWrites: sumFor("write") };
}

async function fetchR2Usage({ accountTag, token, today }) {
  const account = await graphql(
    token,
    `query($accountTag: string!, $start: Time, $end: Time) {
      viewer { accounts(filter: { accountTag: $accountTag }) {
        r2OperationsAdaptiveGroups(limit: 1000, filter: { datetime_geq: $start, datetime_leq: $end }) {
          dimensions { actionType }
          sum { requests }
        }
      } }
    }`,
    { accountTag, start: `${today}T00:00:00Z`, end: `${today}T23:59:59Z` },
  );
  const groups = account.r2OperationsAdaptiveGroups ?? [];
  let classA = 0;
  let classB = 0;
  for (const g of groups) {
    if (R2_CLASS_A_ACTIONS.has(g.dimensions.actionType)) classA += g.sum.requests;
    else if (R2_CLASS_B_ACTIONS.has(g.dimensions.actionType)) classB += g.sum.requests;
  }
  return { r2ClassA: classA, r2ClassB: classB };
}

async function tripMaintenanceFlag({ accountTag, token, reason, expiresAt }) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountTag}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${MAINTENANCE_KV_KEY}`;
  const url = new URL(endpoint);
  url.searchParams.set("expiration", String(Math.floor(expiresAt.getTime() / 1000)));

  const form = new FormData();
  form.set("value", JSON.stringify({ reason, expiresAt: expiresAt.toISOString() }));

  const response = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to write the maintenance flag to KV: HTTP ${response.status}`);
  }
}

async function main() {
  const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;
  if (!accountTag || !token || !databaseId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and D1_DATABASE_ID are required");
  }
  const budgets = readBudgetsFromEnv(process.env);
  const today = new Date().toISOString().slice(0, 10);

  const [worker, d1, kv, r2] = await Promise.all([
    fetchWorkerUsage({ accountTag, token, today }),
    fetchD1Usage({ accountTag, token, databaseId, today }),
    fetchKvUsage({ accountTag, token, today }),
    fetchR2Usage({ accountTag, token, today }),
  ]);
  const usage = { ...worker, ...d1, ...kv, ...r2 };

  const comparisons = compareToBudgets(usage, budgets);
  const summary = summaryTable(comparisons);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);

  const exceeded = comparisons.filter((c) => c.exceeded);
  if (exceeded.length === 0) return;

  const expiresAt = nextMidnightUtc(new Date());
  const reason = exceeded.map((c) => `${c.label}: ${c.value} > ${c.budget}`).join("; ");
  await tripMaintenanceFlag({ accountTag, token, reason, expiresAt });
  console.error(`Maintenance flag set until ${expiresAt.toISOString()}: ${reason}`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
