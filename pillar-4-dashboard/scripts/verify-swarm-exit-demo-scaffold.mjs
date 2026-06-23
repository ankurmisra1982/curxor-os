#!/usr/bin/env node
/**
 * Verify Swarm Claw exit-demo scaffold without live mesh hardware.
 * Usage: node scripts/verify-swarm-exit-demo-scaffold.mjs [baseUrl]
 */
import { existsSync } from "node:fs";
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

async function postJson(p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, json: await res.json() };
}

console.log(`==> Swarm exit-demo scaffold · base=${BASE}\n`);

await check("record-swarm-exit-demo script exists", async () => {
  return existsSync(path.join(__dirname, "record-swarm-exit-demo.mjs"));
});

await check("record-swarm-walkthrough script exists", async () => {
  return existsSync(path.join(__dirname, "record-swarm-walkthrough.mjs"));
});

await check("swarm go_live report shape", async () => {
  const { ok, json } = await postJson("/api/swarm/status", { action: "go_live" });
  const gl = json.goLive;
  return (
    ok &&
    gl &&
    typeof gl.demoReady === "boolean" &&
    Array.isArray(gl.steps) &&
    gl.steps.some((s) => s.id === "workloads")
  );
});

await check("run_exit_demo seeds workloads", async () => {
  const { ok, json } = await postJson("/api/swarm/status", { action: "run_exit_demo" });
  return ok && json.ok && Array.isArray(json.workloads) && json.workloads.length >= 3;
});

await check("handoff_from_claw capital", async () => {
  const { ok, json } = await postJson("/api/swarm/status", {
    action: "handoff_from_claw",
    source: "my-capital",
    title: "Scaffold capital sweep",
    targetCell: "C2",
  });
  return ok && json.workloads?.length >= 1;
});

await check("work handoff_to_swarm proxy", async () => {
  const { ok, json } = await postJson("/api/work/status", {
    action: "handoff_to_swarm",
    title: "Scaffold work batch",
    targetCell: "B2",
  });
  return ok && json.workloadId;
});

await check("capital handoff_to_swarm proxy", async () => {
  const { ok, json } = await postJson("/api/capital/status", {
    action: "handoff_to_swarm",
    title: "Scaffold rule sweep",
    ticker: "SPY",
  });
  return ok && json.workloadId;
});

await check("swarm xp events after ping", async () => {
  const boot = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  const unitId = boot.json.fleet?.[0]?.id ?? "RX-01";
  await postJson("/api/swarm/status", { action: "ping_unit", unitId });
  const after = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  return Array.isArray(after.json.xpEvents) && after.json.xpEvents.length >= 1;
});

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
