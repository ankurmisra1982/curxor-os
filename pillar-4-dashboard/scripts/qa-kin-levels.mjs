#!/usr/bin/env node
/**
 * Kin growth-level + family API flows.
 * Usage: node scripts/qa-kin-levels.mjs [baseUrl]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_FRE = path.join(__dirname, "dev-qa", "app-fre", "my-family.json");
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

console.log(`==> Kin growth levels · base=${BASE}\n`);

{
  const { ok, json } = await get("/api/family");
  if (ok && Array.isArray(json.members) && json.members.length >= 1) {
    pass("family profiles seed", `${json.members.length} member(s)`);
  } else {
    fail("family profiles seed", `status members=${json.members?.length}`);
  }
}

{
  const freRaw = readFileSync(APP_FRE, "utf8");
  const fre = JSON.parse(freRaw);
  const config = {
    ...fre.config,
    growthIntent: "household_coordinator",
    householdName: "QA Household",
  };
  const { ok, json } = await post("/api/app-fre/my-family", { config });
  if (ok && json.state?.config?.growthLevel === "L3") {
    pass("FRE growthIntent → L3", json.state.config.growthLevel);
  } else {
    fail("FRE growthIntent → L3", `growthLevel=${json.state?.config?.growthLevel}`);
  }
  writeFileSync(APP_FRE, freRaw, "utf8");
}

{
  const { ok, json } = await get("/api/mesh/context?registry=1");
  const kinPub = json.registry?.publications?.find((p) => p.appId === "my-family");
  if (ok && kinPub?.scopes?.includes("family")) {
    pass("CCP registry kin publish", kinPub.keys?.join(", "));
  } else {
    fail("CCP registry kin publish", "missing family publication");
  }
}

{
  const { ok } = await post("/api/mesh/context", { resyncFamily: true });
  if (ok) pass("family mesh resync");
  else fail("family mesh resync");
}

{
  const settingsRaw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(settingsRaw);
  settings.appearance = { ...settings.appearance, kinGrowthLevel: "L4" };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  const { ok, json } = await get("/api/settings");
  if (ok && json.settings?.appearance?.kinGrowthLevel === "L4") {
    pass("settings kinGrowthLevel override", "L4");
  } else {
    fail("settings kinGrowthLevel override", json.settings?.appearance?.kinGrowthLevel);
  }
  writeFileSync(USER_SETTINGS, settingsRaw, "utf8");
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
