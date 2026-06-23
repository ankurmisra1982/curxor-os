#!/usr/bin/env node
/**
 * Arbitrage Claw growth-level API flows (L1–L5 persona matrix).
 * Usage: node scripts/qa-shop-levels.mjs [baseUrl]
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

function withShopGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, shopGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

console.log(`==> Arbitrage growth levels · base=${BASE}\n`);

for (const level of ["L1", "L2", "L3", "L4", "L5"]) {
  await withShopGrowthLevel(level, async () => {
    const { ok, json } = await post("/api/shop/status", { action: "dashboard_bootstrap" });
    if (ok && json.growthProfile?.growthLevel === level) {
      pass(`${level} bootstrap profile`, json.growthProfile.growthLabel);
    } else {
      fail(`${level} bootstrap profile`, `level=${json.growthProfile?.growthLevel}`);
    }
    if (ok && json.previewMode === true) pass(`${level} previewMode flag`, "true");
    else fail(`${level} previewMode flag`, String(json.previewMode));
  });
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n==> ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
