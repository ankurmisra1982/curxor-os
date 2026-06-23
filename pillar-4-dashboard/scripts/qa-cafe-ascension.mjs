#!/usr/bin/env node
/**
 * Claw Cafe ascension + spatial hooks QA.
 * Usage: node scripts/qa-cafe-ascension.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

const checks = [];
function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

console.log(`==> Cafe ascension hooks · base=${BASE}\n`);

const bootstrap = await get("/api/cafe/status");
if (bootstrap.ok && bootstrap.json.ascension?.tier) {
  pass("GET /api/cafe/status", `${bootstrap.json.ascension.title} · ${bootstrap.json.ascension.ascensionXp} XP`);
} else {
  fail("GET /api/cafe/status", JSON.stringify(bootstrap.json));
}

if (bootstrap.ok && Array.isArray(bootstrap.json.characters)) {
  pass("spatial characters", `${bootstrap.json.characters.length} patrons`);
} else {
  fail("spatial characters", "missing characters array");
}

const sync = await post("/api/cafe/status", { action: "sync" });
if (sync.ok && typeof sync.json.ingested === "number") {
  pass("sync sources", `ingested=${sync.json.ingested}`);
} else {
  fail("sync sources", JSON.stringify(sync.json));
}

const ingest = await post("/api/cafe/status", {
  action: "ingest",
  kind: "app.tour_complete",
  appId: "claw-cafe",
  xp: { ascension: 10, knowledge: 5 },
  bubble: "QA tour complete",
});
if (ingest.ok && ingest.json.event?.id) {
  pass("manual ingest", ingest.json.event.id);
} else {
  fail("manual ingest", JSON.stringify(ingest.json));
}

if (ingest.ok && ingest.json.ascension?.ascensionXp >= bootstrap.json.ascension?.ascensionXp) {
  pass("ascension XP updated", String(ingest.json.ascension.ascensionXp));
} else {
  fail("ascension XP updated", "XP did not increase");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length > 0) process.exitCode = 1;
