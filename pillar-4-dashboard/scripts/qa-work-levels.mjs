#!/usr/bin/env node
/**
 * Work Claw growth-level API flows (WL8 persona QA matrix).
 * Usage: node scripts/qa-work-levels.mjs [baseUrl]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_SETTINGS = path.join(__dirname, "dev-qa", "user-settings.json");

const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  return { ok: res.ok, json: await res.json() };
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

function withWorkGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, workGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

console.log(`==> Work growth levels · base=${BASE}\n`);

await withWorkGrowthLevel("L1", async () => {
  const { ok, json } = await post("/api/work/status", { action: "get_growth_profile" });
  if (ok && json.growthProfile?.growthLevel === "L1") {
    pass("L1 profile", json.growthProfile.growthLabel ?? "L1");
  } else {
    fail("L1 profile", `level=${json.growthProfile?.growthLevel}`);
  }

  const pack = await post("/api/work/status", {
    action: "apply_template_pack",
    packId: "student_opportunities",
  });
  if (pack.ok) pass("L1 template pack", pack.json.packId);
  else fail("L1 template pack", pack.json.error);

  const tour = await post("/api/work/status", { action: "run_demo_tour" });
  if (tour.ok && tour.json.tourKind === "L1-explorer") pass("L1 demo tour", tour.json.mailId ?? "ok");
  else fail("L1 demo tour", tour.json.tourKind ?? tour.json.error);
});

await withWorkGrowthLevel("L2", async () => {
  const status = (await get("/api/work/status")).json;
  let leadId = status.leads?.[0]?.id;
  if (!leadId) {
    const created = await post("/api/work/status", {
      action: "create_lead",
      name: "Level Test Buyer",
      email: "buyer@example.com",
    });
    leadId = created.json.lead?.id;
  }
  if (!leadId) {
    fail("L2 mini sequence", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "create_mini_sequence",
      leadId,
      presetId: "order_checkin",
    });
    if (ok && json.sequenceId) pass("L2 mini sequence", json.sequenceId);
    else fail("L2 mini sequence", json.error ?? "failed");
  }

  const tour = await post("/api/work/status", { action: "run_demo_tour" });
  if (tour.ok && tour.json.tourKind === "L2-side-hustler") pass("L2 demo tour", tour.json.sequenceId ?? "ok");
  else fail("L2 demo tour", tour.json.tourKind ?? tour.json.error);
});

await withWorkGrowthLevel("L3", async () => {
  const status = (await get("/api/work/status")).json;
  if (status.deliverability?.reputationScore != null) {
    pass("L3 deliverability", `${status.deliverability.reputationScore}`);
  } else {
    fail("L3 deliverability", "missing");
  }

  const tour = await post("/api/work/status", { action: "run_demo_tour" });
  const pending =
    tour.json.sendId && tour.json.status?.sends
      ? tour.json.status.sends.find((s) => s.id === tour.json.sendId)
      : null;
  if (tour.ok && tour.json.tourKind === "L3-operator" && pending?.status === "pending_approval") {
    pass("L3 approval tour", pending.id);
  } else {
    fail("L3 approval tour", `status=${pending?.status}`);
  }
});

await withWorkGrowthLevel("L4", async () => {
  const { ok, json } = await post("/api/work/status", { action: "dashboard_bootstrap" });
  const vault = json.status?.connectorVault;
  if (ok && vault?.summary?.total >= 1) pass("L4 connector vault", `${vault.summary.ready}/${vault.summary.total}`);
  else fail("L4 connector vault", "missing vault");
});

await withWorkGrowthLevel("L5", async () => {
  const { ok, json } = await post("/api/work/status", { action: "get_growth_profile" });
  if (ok && json.growthProfile?.growthLevel === "L5") pass("L5 profile", json.growthProfile.growthLabel);
  else fail("L5 profile", json.growthProfile?.growthLevel);
});

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
