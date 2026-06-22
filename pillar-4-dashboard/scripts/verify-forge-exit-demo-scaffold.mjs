#!/usr/bin/env node
/**
 * Verify Forge exit-demo scaffold without live inference dependencies.
 * Usage: node scripts/verify-forge-exit-demo-scaffold.mjs [baseUrl]
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
  return { ok: res.ok, status: res.status, json: await res.json() };
}

console.log(`==> Forge exit-demo scaffold · base=${BASE}\n`);

await check("EXIT-DEMO.md exists", async () => {
  return existsSync(path.join(REPO, "docs", "forge", "EXIT-DEMO.md"));
});

await check("record-forge-exit-demo script exists", async () => {
  return existsSync(path.join(__dirname, "record-forge-exit-demo.mjs"));
});

await check("capture-forge-demo script exists", async () => {
  return existsSync(path.join(__dirname, "capture-forge-demo.mjs"));
});

await check("forge go_live report shape", async () => {
  const json = await getJson("/api/forge/status");
  const gl = json.goLive;
  return (
    json.ok === true &&
    gl &&
    typeof gl.demoReady === "boolean" &&
    Array.isArray(gl.steps) &&
    gl.steps.length >= 3
  );
});

await check("forge demo tour mints desk", async () => {
  const { ok, json } = await postJson("/api/forge/status", { action: "run_demo_tour" });
  return ok && json.tour?.ok === true && (json.tour.forgedHref || json.tour.profileId);
});

await check("forge L4 persona work desk tour", async () => {
  const { ok, json } = await postJson("/api/forge/status", { action: "run_demo_tour", persona: "L4" });
  return ok && json.tour?.persona === "L4" && json.tour?.ok === true && json.tour?.forgedHref;
});

await check("forged work desk API round-trip", async () => {
  const prov = await postJson("/api/claw/provision-app", {
    intent: "Exit demo scaffold work desk",
    templateId: "work-desk",
    name: "Exit Demo Work",
    budgetTier: "balanced",
  });
  const appId = prov.json.forgedApp?.id;
  if (!prov.ok || !appId) return false;
  const create = await postJson(`/api/forged/${appId}/status`, {
    action: "create_lead",
    name: "Exit Lead",
    email: `exit-${Date.now()}@forged.local`,
  });
  return create.ok && create.json.lead?.id;
});

await check("forge create island-only contract documented", async () => {
  const example = path.join(REPO, "docs", "forge", "BEST-IN-CLASS-BUILD-PLAN.md");
  if (!existsSync(example)) return false;
  const text = readFileSync(example, "utf8");
  return text.includes("Island rule") && text.includes("provision-app");
});

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
