// Mirrors wrangler.jsonc's kv_namespaces[0].id; not a secret.
const KV_NAMESPACE_ID = "90ab6e16443148e0a8ab33f924c64fea";
const MAINTENANCE_KV_KEY = "maintenance";

function usage(): never {
  throw new Error('usage: tsx scripts/maintenance.ts on "<reason>" | off');
}

const [mode, ...reasonParts] = process.argv.slice(2);
if (mode !== "on" && mode !== "off") usage();

const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountTag || !token) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required (token needs Workers KV Storage: Edit)",
  );
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountTag}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${MAINTENANCE_KV_KEY}`;

if (mode === "off") {
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to clear the maintenance flag: HTTP ${response.status}`,
    );
  }
  console.log("Maintenance flag cleared.");
} else {
  const reason = reasonParts.join(" ").trim();
  if (!reason) usage();

  const now = new Date();
  const expiresAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );

  const url = new URL(endpoint);
  url.searchParams.set(
    "expiration",
    String(Math.floor(expiresAt.getTime() / 1000)),
  );
  const form = new FormData();
  form.set(
    "value",
    JSON.stringify({ reason, expiresAt: expiresAt.toISOString() }),
  );

  const response = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to write the maintenance flag to KV: HTTP ${response.status}`,
    );
  }
  console.log(
    `Maintenance flag set until ${expiresAt.toISOString()}: ${reason}`,
  );
}
