#!/usr/bin/env node
/**
 * Verify Capital exit-demo scaffold without broker credentials.
 * Usage: node scripts/verify-exit-demo-scaffold.mjs [baseUrl]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  return { ok: res.ok, json: await res.json() };
}

console.log(`==> Exit-demo scaffold · base=${BASE}\n`);

await check("digital.env.example has Alpaca + Plaid + SnapTrade", async () => {
  const example = path.join(__dirname, "dev-qa", "digital.env.example");
  if (!existsSync(example)) return false;
  const text = readFileSync(example, "utf8");
  return (
    text.includes("ALPACA_API_KEY_ID") &&
    text.includes("PLAID_CLIENT_ID") &&
    text.includes("SNAPTRADE_CLIENT_ID") &&
    text.includes("WEBULL_CLIENT_ID") &&
    text.includes("ETRADE_CONSUMER_KEY")
  );
});

await check("capital go_live report shape", async () => {
  const { ok, json } = await postJson("/api/capital/status", { action: "go_live" });
  const gl = json.goLive;
  return (
    ok &&
    gl &&
    typeof gl.demoReady === "boolean" &&
    typeof gl.paperReady === "boolean" &&
    Array.isArray(gl.steps) &&
    gl.steps.some((s) => s.id === "alpaca")
  );
});

await check("capital tools get_go_live_report", async () => {
  const json = await getJson("/api/capital/tools?tool=get_go_live_report");
  return json.ok && json.goLive?.steps?.length > 0;
});

await check("broker registry lists alpaca webull etrade snaptrade", async () => {
  const json = await getJson("/api/capital/status");
  const ids = (json.brokers ?? []).map((b) => b.id);
  return ids.includes("alpaca") && ids.includes("webull") && ids.includes("etrade") && ids.includes("snaptrade");
});

await check("snaptrade oauth status route", async () => {
  const json = await getJson("/api/capital/snaptrade");
  return json.ok !== false && typeof json.clientConfigured === "boolean";
});

await check("plaid status route", async () => {
  const json = await getJson("/api/capital/plaid");
  return json.ok !== false;
});

await check("webull + etrade oauth status routes", async () => {
  const webull = await getJson("/api/capital/webull");
  const etrade = await getJson("/api/capital/etrade");
  return webull.ok !== false && etrade.ok !== false;
});

await check("configure-capital-keys script exists", async () => {
  return existsSync(path.join(__dirname, "configure-capital-keys.mjs"));
});

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
