#!/usr/bin/env node
/**
 * Creator Claw growth-level API flows (L1–L5 persona matrix).
 * Usage: node scripts/qa-creator-levels.mjs [baseUrl]
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

async function get(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, { cache: "no-store" });
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

function withCreatorGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, creatorGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

console.log(`==> Creator growth levels · base=${BASE}\n`);

await withCreatorGrowthLevel("L1", async () => {
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.growthProfile?.growthLevel === "L1") {
    pass("L1 bootstrap profile", json.growthProfile.growthLabel ?? "Explorer");
  } else {
    fail("L1 bootstrap profile", `level=${json.growthProfile?.growthLevel}`);
  }
});

await withCreatorGrowthLevel("L2", async () => {
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.growthProfile?.growthLevel === "L2") pass("L2 bootstrap profile", json.growthProfile.growthLabel);
  else fail("L2 bootstrap profile", json.growthProfile?.growthLevel);
});

await withCreatorGrowthLevel("L3", async () => {
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.growthProfile?.growthLevel === "L3") pass("L3 bootstrap profile", json.growthProfile.growthLabel);
  else fail("L3 bootstrap profile", json.growthProfile?.growthLevel);
});

await withCreatorGrowthLevel("L4", async () => {
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.growthProfile?.growthLevel === "L4") pass("L4 bootstrap profile", json.growthProfile.growthLabel);
  else fail("L4 bootstrap profile", json.growthProfile?.growthLevel);
});

await withCreatorGrowthLevel("L5", async () => {
  const { ok, json } = await post("/api/content/status", { action: "dashboard_bootstrap" });
  if (ok && json.growthProfile?.growthLevel === "L5") pass("L5 bootstrap profile", json.growthProfile.growthLabel);
  else fail("L5 bootstrap profile", json.growthProfile?.growthLevel);
});

{
  const { ok, json } = await get("/api/agent-workspace/my-content-creator");
  const soul = json.workspace?.app?.["SOUL.md"];
  if (ok && typeof soul === "string" && soul.includes("Creator Claw")) {
    pass("agent workspace seed", `${json.workspace?.skillFiles?.length ?? 0} skills`);
  } else {
    fail("agent workspace seed", "missing SOUL.md");
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
