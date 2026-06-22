#!/usr/bin/env node
/**
 * Manual API checklist — Outreach Claw demo flows.
 * Usage: node scripts/work-checklist.mjs [baseUrl]
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

console.log(`==> Outreach checklist · base=${BASE}\n`);

// 1. Status bootstrap
{
  const { ok, json } = await get("/api/work/status");
  if (ok && Array.isArray(json.leads) && Array.isArray(json.sequences)) {
    pass("status bootstrap", `${json.leads.length} leads · source=${json.source ?? "demo"}`);
  } else {
    fail("status bootstrap", "missing leads or sequences");
  }
}

// 2. dashboard_bootstrap
{
  const { ok, json } = await post("/api/work/status", { action: "dashboard_bootstrap" });
  if (ok && json.goLive?.steps?.length >= 4 && json.status?.leads) {
    pass("dashboard_bootstrap", `${json.goLive.steps.length} go-live steps`);
  } else {
    fail("dashboard_bootstrap", `steps=${json.goLive?.steps?.length}`);
  }
}

// 3. draft_sequence
{
  const status = (await get("/api/work/status")).json;
  const leadId = status.leads?.[0]?.id;
  if (!leadId) {
    fail("draft_sequence", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "draft_sequence",
      leadId,
      name: "Checklist sequence",
    });
    if (ok && typeof json.sequenceId === "string") {
      pass("draft_sequence", json.sequenceId);
    } else {
      fail("draft_sequence", `sequenceId=${json.sequenceId}`);
    }
  }
}

// 4. run_demo_tour → simulated send
{
  const { ok, json } = await post("/api/work/status", { action: "run_demo_tour" });
  const tourSend =
    json.sendId && json.status?.sends
      ? json.status.sends.find((s) => s.id === json.sendId)
      : null;
  const sendOk = tourSend?.status === "simulated" || tourSend?.status === "sent";
  if (ok && json.ok && json.sequenceId && Array.isArray(json.steps) && json.steps.length >= 4 && sendOk) {
    pass("run_demo_tour", `${json.sendId} · ${tourSend?.status}`);
  } else {
    fail("run_demo_tour", `ok=${ok} tourOk=${json.ok} send=${tourSend?.status} steps=${json.steps?.length}`);
  }
}

// 5. go_live demoReady
{
  const { ok, json } = await post("/api/work/status", { action: "go_live" });
  if (ok && typeof json.goLive?.demoReady === "boolean" && json.goLive.demoReady === true) {
    pass("go_live demoReady", `${json.goLive.progress.complete}/${json.goLive.progress.total}`);
  } else {
    fail("go_live demoReady", `demoReady=${json.goLive?.demoReady}`);
  }
}

// 6. Outbound send path (simulated when SMTP unconfigured)
{
  const status = (await get("/api/work/status")).json;
  const proven = status.sends?.find((s) => s.status === "simulated" || s.status === "sent");
  if (proven) {
    pass("send path smoke", `${proven.id} · ${proven.status}`);
  } else {
    const seq = status.sequences?.find((s) => s.status === "active") ?? status.sequences?.[0];
    if (!seq?.id) {
      fail("send path smoke", "no sequence");
    } else {
      const { ok, json } = await post("/api/work/status", { action: "send_step", sequenceId: seq.id });
      const st = json.send?.status;
      if (ok && json.ok && (st === "simulated" || st === "sent" || st === "pending_approval" || st === "queued")) {
        pass("send path smoke", st ?? "ok");
      } else {
        fail("send path smoke", `status=${st} ok=${json.ok} err=${json.error ?? ""}`);
      }
    }
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
