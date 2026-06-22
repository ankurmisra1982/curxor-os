#!/usr/bin/env node
/**
 * Verify Work Claw exit-demo scaffold without live credentials.
 * Usage: node scripts/verify-work-exit-demo-scaffold.mjs [baseUrl]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
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

async function getJson(p) {
  const res = await fetch(`${BASE}${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postJson(p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, json: await res.json() };
}

console.log(`==> Work exit-demo scaffold · base=${BASE}\n`);

await check("digital.env.example has SMTP IMAP Google Twenty", async () => {
  const example = path.join(REPO, "config", "digital", "digital.env.example");
  if (!existsSync(example)) return false;
  const text = readFileSync(example, "utf8");
  return (
    text.includes("SMTP_HOST") &&
    text.includes("IMAP_HOST") &&
    text.includes("CURXOR_GOOGLE_OAUTH_CLIENT_ID") &&
    text.includes("TWENTY_API_URL")
  );
});

await check("work go_live report shape", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "go_live" });
  const gl = json.goLive;
  return (
    ok &&
    gl &&
    typeof gl.demoReady === "boolean" &&
    typeof gl.liveReady === "boolean" &&
    Array.isArray(gl.steps) &&
    gl.steps.some((s) => s.id === "smtp")
  );
});

await check("connector vault bootstrap", async () => {
  const { ok, json } = await postJson("/api/work/status", { action: "dashboard_bootstrap" });
  const vault = json.status?.connectorVault;
  return ok && vault?.connectors?.length >= 10;
});

await check("work google oauth status route", async () => {
  const json = await getJson("/api/work/google");
  return json.ok !== false && typeof json.clientConfigured === "boolean";
});

await check("work notion oauth status route", async () => {
  const json = await getJson("/api/work/notion");
  return json.ok !== false;
});

await check("work mcp GET", async () => {
  const json = await getJson("/api/work/mcp");
  return json.ok && Array.isArray(json.tools) && json.tools.length >= 5;
});

await check("work microsoft oauth status route", async () => {
  const json = await getJson("/api/work/microsoft");
  return json.ok !== false && typeof json.clientConfigured === "boolean";
});

await check("setup-work-env script exists", async () => {
  return existsSync(path.join(__dirname, "setup-work-env.mjs"));
});

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
