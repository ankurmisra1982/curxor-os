#!/usr/bin/env node
/**
 * Vital Claw growth-level API flows (L1–L5 persona matrix).
 * Usage: node scripts/qa-vital-levels.mjs [baseUrl]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_SETTINGS = path.join(__dirname, "dev-qa", "user-settings.json");

const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function get(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, { cache: "no-store" });
  return { ok: res.ok, json: await res.json() };
}

async function post(urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

function withVitalGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, vitalGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

console.log(`==> Vital growth levels · base=${BASE}\n`);

for (const level of ["L1", "L2", "L3", "L4", "L5"]) {
  await withVitalGrowthLevel(level, async () => {
    const { ok, json } = await get("/api/vital/status");
    if (ok && json.growthProfile?.growthLevel === level) {
      pass(`${level} status profile`, json.growthProfile.growthLabel);
    } else {
      fail(`${level} status profile`, `level=${json.growthProfile?.growthLevel}`);
    }
    if (ok && Array.isArray(json.protocol) && json.protocol.length >= 1) {
      pass(`${level} protocol seed`, `${json.protocol.length} steps`);
    } else {
      fail(`${level} protocol seed`, "empty protocol");
    }
  });
}

{
  const { ok, json } = await get("/api/vital/lab");
  if (ok && json.lab?.features?.protocolDiff) pass("vital lab features", "production wave");
  else fail("vital lab features", "missing");
}

{
  const { ok, json } = await post("/api/vital/lab", {
    action: "ask",
    query: "Zone 2 cardio for my resting HR",
    expertLens: "attia",
  });
  if (ok && json.answer?.length > 10) pass("vital lab ask", json.mode ?? "ok");
  else fail("vital lab ask", json.error ?? "empty");
}

{
  const { ok, json } = await get("/api/vital/garmin");
  if (ok && typeof json.linked === "boolean") pass("garmin status route", json.linked ? "linked" : "not linked");
  else fail("garmin status route", "bad response");
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
