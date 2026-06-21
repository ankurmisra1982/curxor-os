#!/usr/bin/env node
/**
 * Cross-platform dashboard QA smoke tests.
 * Usage: node scripts/qa-smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

let pass = 0;
let fail = 0;

async function check(name, fn) {
  try {
    if (await fn()) {
      console.log(`PASS · ${name}`);
      pass++;
    } else {
      console.log(`FAIL · ${name}`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL · ${name} (${err instanceof Error ? err.message : String(err)})`);
    fail++;
  }
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

console.log(`==> QA smoke · base=${BASE}\n`);

await check("setup status", async () => {
  const data = await getJson("/api/setup/status");
  return typeof data.initialized === "boolean";
});

await check("settings GET", async () => {
  const data = await getJson("/api/settings");
  return data.settings?.version === 1 && Array.isArray(data.providers);
});

await check("settings claws POST", async () => {
  const current = await getJson("/api/settings");
  const apps = current.settings?.selectedApps ?? ["my-capital"];
  const { ok, json } = await postJson("/api/settings/claws", { selectedApps: apps });
  return ok && json.settings?.selectedApps?.length >= 1;
});

await check("settings llm link-session (openai oauth)", async () => {
  const { ok, json } = await postJson("/api/settings/llm/link-session", {
    providerId: "openai",
    frontierModel: "gpt-4o-mini",
  });
  return ok && typeof json.linkPath === "string" && json.linkMode === "oauth" && typeof json.authorizeUrl === "string";
});

await check("capital status", async () => {
  const data = await getJson("/api/capital/status");
  return Array.isArray(data.rules) && typeof data.tradingMode === "string";
});

await check("app-agent assist (outreach)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-work",
    message: "hello",
  });
  return typeof json.reply === "string" && json.reply.length > 0;
});

await check("app-agent assist (capital digital skill)", async () => {
  const { json } = await postJson("/api/app-agent/assist", {
    appId: "my-capital",
    skillId: "execute_trade",
    config: { tradingMode: "paper", selectedAsset: "BTC-USD" },
  });
  return typeof json.reply === "string";
});

await check("claw assist", async () => {
  const { json } = await postJson("/api/claw/assist", {
    message: "forge a sorting claw",
  });
  return typeof json.reply === "string" && json.reply.length > 0;
});

await check("mesh motor route", async () => {
  const { json } = await postJson("/api/mesh/motor", { x: 0.1, y: 0, z: 0.2 });
  return typeof json.ok === "boolean";
});

await check("mesh digital route", async () => {
  const { json } = await postJson("/api/mesh/digital", {
    tool: "capital.execute_trade",
    payload: { ticker: "BTC-USD", qty: 1, action: "buy" },
  });
  return typeof json.ok === "boolean";
});

await check("compute metrics", async () => {
  const data = await getJson("/api/metrics/compute");
  return data.backend === "ollama" || data.backend === "vllm" || data.backend === "unknown";
});

await check("claw profiles", async () => {
  const data = await getJson("/api/claw/profiles");
  return Array.isArray(data.claws);
});

await check("vital status", async () => {
  const data = await getJson("/api/vital/status");
  return data.version === 1 && Array.isArray(data.protocol);
});

await check("family profiles GET", async () => {
  const data = await getJson("/api/family");
  return Array.isArray(data.members) && data.members.length >= 1;
});

await check("mesh context registry", async () => {
  const data = await getJson("/api/mesh/context?registry=1");
  return Array.isArray(data.registry?.publications) && Array.isArray(data.registry?.subscriptions);
});

await check("mesh context for optimus", async () => {
  const data = await getJson("/api/mesh/context?appId=tesla-optimus-engine");
  return data.ok === true && typeof data.context === "object";
});

const appIds = [
  "my-shop",
  "my-content-creator",
  "my-vital",
  "my-family",
  "tesla-optimus-engine",
  "robotaxi-fleet-manager",
  "claw-cafe",
  "claw-forge",
];

for (const appId of appIds) {
  await check(`app-agent assist (${appId})`, async () => {
    const { json } = await postJson("/api/app-agent/assist", { appId, message: "status" });
    return typeof json.reply === "string" && json.reply.length > 0;
  });
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
