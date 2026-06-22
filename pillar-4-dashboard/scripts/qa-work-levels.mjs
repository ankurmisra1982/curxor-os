#!/usr/bin/env node
/**
 * Work Claw growth-level API flows (WL6).
 * Usage: node scripts/qa-work-levels.mjs [baseUrl]
 */

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

console.log(`==> Work growth levels · base=${BASE}\n`);

// L1 opportunity path: growth profile + template pack
{
  const { ok, json } = await post("/api/work/status", { action: "get_growth_profile" });
  if (ok && json.growthProfile?.growthLevel) {
    pass("L1 profile", json.growthProfile.growthLabel ?? json.growthProfile.growthLevel);
  } else {
    fail("L1 profile", "missing growthProfile");
  }
}

{
  const { ok, json } = await post("/api/work/status", {
    action: "apply_template_pack",
    packId: "student_opportunities",
  });
  if (ok) pass("L1 template pack", json.packId);
  else fail("L1 template pack", json.error);
}

// L2 mini sequence path
{
  const status = (await get("/api/work/status")).json;
  let leadId = status.leads?.[0]?.id;
  if (!leadId) {
    const created = await post("/api/work/status", {
      action: "create_lead",
      name: "Level Test Buyer",
      email: "buyer@example.com",
    });
    leadId = created.json.status?.leads?.slice(-1)[0]?.id;
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
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
