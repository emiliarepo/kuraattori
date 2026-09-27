import { appendFile } from "node:fs/promises";

const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountTag || !token) throw new Error("Cloudflare account ID and API token are required");

const today = new Date().toISOString().slice(0, 10);
const query = `query D1Reads($accountTag: string!, $today: Date) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date_geq: $today, date_leq: $today }) {
        sum { rowsRead }
      }
    }
  }
}`;

const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { accountTag, today } }),
  signal: AbortSignal.timeout(10000),
});
if (!response.ok) throw new Error(`Cloudflare Analytics API returned HTTP ${response.status}`);

const body = await response.json();
if (body.errors?.length) throw new Error(`Cloudflare Analytics API returned ${body.errors.length} GraphQL error(s)`);
const accounts = body.data?.viewer?.accounts;
if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error("Expected one Cloudflare account in analytics response");
const groups = accounts[0].d1AnalyticsAdaptiveGroups;
if (!Array.isArray(groups)) throw new Error("D1 analytics groups are missing");

let rowsRead = 0;
for (const group of groups) {
  if (!Number.isFinite(group.sum?.rowsRead)) throw new Error("Invalid D1 rowsRead value");
  rowsRead += group.sum.rowsRead;
}

const summary = `## D1 reads, ${today} UTC\n\n${rowsRead.toLocaleString("en-US")} of 5,000,000 free rows read today. Alert threshold: 2,500,000.\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
if (rowsRead > 2_500_000) process.exitCode = 1;
