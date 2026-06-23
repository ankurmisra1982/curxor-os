#!/usr/bin/env node
/**
 * Swarm Claw growth-level API flows (L1–L5 persona matrix).
 * Usage: node scripts/qa-swarm-levels.mjs [baseUrl]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_SETTINGS = path.join(__dirname, "dev-qa", "user-settings.json");

const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function post(urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);
}

function withSwarmGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, swarmGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

console.log(`==> Swarm growth levels · base=${BASE}\n`);

for (const level of ["L1", "L2", "L3", "L4", "L5"]) {
  await withSwarmGrowthLevel(level, async () => {
    const { ok, json } = await post("/api/swarm/status", { action: "dashboard_bootstrap" });
    if (ok && json.growthProfile?.growthLevel === level) {
      pass(`${level} bootstrap profile`, json.growthProfile.growthLabel ?? level);
    } else {
      fail(`${level} bootstrap profile`, `level=${json.growthProfile?.growthLevel}`);
    }
  });
}

const { ok, json } = await post("/api/swarm/status", { action: "dashboard_bootstrap" });
if (ok && Array.isArray(json.fleet) && json.fleet.length >= 2) {
  pass("fleet bootstrap", `${json.fleet.length} units · source=${json.profileSource}`);
} else {
  fail("fleet bootstrap", `fleet=${json.fleet?.length}`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);

const pingRes = await post("/api/swarm/status", { action: "ping_unit", unitId: "RX-01" });
if (pingRes.ok && pingRes.json.ping?.rttMs > 0) {
  pass("ping_unit mesh RTT", `${pingRes.json.ping.rttMs}ms · ${pingRes.json.ping.source}`);
} else {
  fail("ping_unit mesh RTT", JSON.stringify(pingRes.json.ping));
}

const dispatchPlan = await fetch(`${BASE}/api/channels/webchat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appId: "robotaxi-fleet-manager",
    message: "dispatch lowest latency to B3",
    config: { selectedUnitId: "RX-01", targetCell: "A1", dispatchPolicy: "latency", depotGrid: "A1", fleetSize: "4" },
  }),
}).then((r) => r.json());
if (dispatchPlan.autoDispatchSkill && dispatchPlan.suggestedSkill === "assign_route") {
  pass("chat auto-dispatch", dispatchPlan.suggestedSkill);
} else {
  fail("chat auto-dispatch", dispatchPlan.suggestedSkill ?? "none");
}

const failed2 = checks.filter((c) => !c.ok);
console.log(`\n==> Final ${checks.length - failed2.length}/${checks.length} passed`);

const exitDemo = await post("/api/swarm/status", { action: "run_exit_demo" });
if (exitDemo.ok && exitDemo.json.workloads?.length >= 3) {
  pass("exit_demo scenario", `${exitDemo.json.workloads.length} workloads`);
} else {
  fail("exit_demo scenario", String(exitDemo.json.workloads?.length));
}

const workHandoff = await post("/api/work/status", {
  action: "handoff_to_swarm",
  title: "QA swarm handoff",
  targetCell: "B2",
});
if (workHandoff.ok && workHandoff.json.workloadId) {
  pass("work → swarm handoff", workHandoff.json.workloadId);
} else {
  fail("work → swarm handoff", workHandoff.json.error);
}

const final = checks.filter((c) => !c.ok);
console.log(`\n==> All ${checks.length - final.length}/${checks.length} passed`);
if (final.length > 0) process.exitCode = 1;
