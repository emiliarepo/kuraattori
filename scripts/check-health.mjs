import { appendFile } from "node:fs/promises";

const origin = "https://kuraattori.emiliarepo.dev";
const rows = [];
let failed = false;

function record(url, status, elapsedMs) {
  rows.push(`| ${url} | ${status} | ${elapsedMs === null ? "n/a" : `${elapsedMs} ms`} |`);
}

async function check(url) {
  const started = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const elapsedMs = Math.round(performance.now() - started);
    record(url, response.status, elapsedMs);
    if (response.status < 200 || response.status >= 400 || elapsedMs > 5000) failed = true;
    return response;
  } catch (error) {
    record(url, error instanceof Error ? error.name : "request failed", Math.round(performance.now() - started));
    failed = true;
    return undefined;
  }
}

const sitemap = await check(`${origin}/sitemap.xml`);
let exhibitionUrl;
if (sitemap?.ok) {
  const xml = await sitemap.text();
  const match = xml.match(/<loc>https:\/\/kuraattori\.emiliarepo\.dev\/exhibitions\/([^<]+)<\/loc>/);
  if (match) exhibitionUrl = `${origin}/exhibitions/${match[1]}`;
  else {
    record("Exhibition URL in sitemap", "missing", null);
    failed = true;
  }
} else {
  record("Exhibition URL in sitemap", "unavailable", null);
}

for (const url of [
  `${origin}/`,
  `${origin}/exhibitions`,
  exhibitionUrl,
  `${origin}/api/auth/providers`,
  `${origin}/robots.txt`,
]) {
  if (url) await check(url);
}

const summary = ["## Site health", "", "| URL | Status | Time |", "| --- | ---: | ---: |", ...rows, ""].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
if (failed) process.exitCode = 1;
