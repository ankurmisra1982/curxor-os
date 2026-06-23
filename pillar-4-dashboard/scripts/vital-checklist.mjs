#!/usr/bin/env node
/**
 * Manual API checklist — Vital Claw day-one demo flows.
 * Usage: node scripts/vital-checklist.mjs [baseUrl]
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

console.log(`==> Vital checklist · base=${BASE}\n`);

// 1. Status bootstrap + go-live shape
{
  const { ok, json } = await get("/api/vital/status");
  if (ok && json.version === 1 && Array.isArray(json.vitals) && json.goLive?.steps?.length >= 4) {
    pass("status + go_live shape", `${json.goLive.steps.length} steps`);
  } else {
    fail("status + go_live shape", `steps=${json.goLive?.steps?.length}`);
  }
}

// 2. Lab ask (local RAG)
{
  const { ok, json } = await post("/api/vital/lab", {
    action: "ask",
    query: "What should I prioritize for sleep and Zone 2?",
  });
  if (ok && typeof json.answer === "string" && json.citations?.length >= 1) {
    pass("lab ask", `${json.citations.length} citations`);
  } else {
    fail("lab ask", `answer=${typeof json.answer}`);
  }
}

// 3. Sync wearables (demo on-box)
{
  const { ok, json } = await post("/api/vital/status", { action: "sync_wearables" });
  if (ok && json.vitals?.length >= 4 && json.meta?.lastWearableSyncAt) {
    pass("sync wearables demo", json.meta.lastWearableSyncAt);
  } else {
    fail("sync wearables demo", `vitals=${json.vitals?.length}`);
  }
}

// 4. Ingest report (vault, no OCR)
{
  const before = (await get("/api/vital/status")).json.reports?.length ?? 0;
  const { ok, json } = await post("/api/vital/status", {
    action: "ingest_report",
    summary: "Checklist metabolic panel — A1c 5.4%, LDL 98",
  });
  const after = json.reports?.length ?? 0;
  if (ok && after > before && json.report?.id) {
    pass("ingest report", json.report.id);
  } else {
    fail("ingest report", `before=${before} after=${after}`);
  }
}

// 5. Update protocol
{
  const { ok, json } = await post("/api/vital/status", { action: "update_protocol", focus: "cardio" });
  if (ok && json.protocol?.length >= 2 && json.protocol.some((s) => s.category === "movement")) {
    pass("update protocol", `${json.protocol.length} steps`);
  } else {
    fail("update protocol", `steps=${json.protocol?.length}`);
  }
}

// 6. Demo tour → demoReady
{
  const { ok, json } = await post("/api/vital/status", { action: "run_demo_tour" });
  const gl = json.goLive;
  if (ok && json.tour?.ok && gl?.demoReady === true) {
    pass("demo tour → demoReady", `${gl.progress.complete}/${gl.progress.total}`);
  } else {
    fail("demo tour → demoReady", `demoReady=${gl?.demoReady} tourOk=${json.tour?.ok}`);
  }
}

// 7. Clinician export
{
  const { ok, json } = await post("/api/vital/lab", { action: "clinician_export" });
  if (ok && typeof json.markdown === "string" && json.markdown.includes("Vital Claw")) {
    pass("clinician export", `${json.markdown.length} chars`);
  } else {
    fail("clinician export", "missing markdown");
  }
}

// 8. Kin/Optimus mesh read after vital publish
{
  const { ok, json } = await get("/api/mesh/context?appId=tesla-optimus-engine");
  if (ok && json.ok === true && json.context != null) {
    pass("optimus mesh context route", "readable after vital publish");
  } else {
    fail("optimus mesh context route", `http=${ok} apiOk=${json.ok}`);
  }
}

// 9. Protocol diff
{
  const { ok, json } = await post("/api/vital/lab", { action: "protocol_diff", expertLens: "attia" });
  if (ok && json.diff?.expertLens && Array.isArray(json.diff.aligned)) {
    pass("protocol diff", json.diff.expertLabel ?? json.diff.expertLens);
  } else {
    fail("protocol diff", "missing diff");
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
