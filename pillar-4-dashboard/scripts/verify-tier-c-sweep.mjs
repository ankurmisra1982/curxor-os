#!/usr/bin/env node
/**
 * v0.3.10 Tier C honesty sweep gate — all five preview claws.
 * Usage: node scripts/verify-tier-c-sweep.mjs [baseUrl]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const REPO = path.resolve(DASHBOARD, "..");
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

const PREVIEW_ROUTES = [
  { slug: "my-shop", freeze: "docs/arbitrage-claw/FREEZE.md" },
  { slug: "optimus", freeze: "docs/signal-claw/FREEZE.md" },
  { slug: "robotaxi", freeze: "docs/swarm-claw/FREEZE.md" },
  { slug: "my-vital", freeze: "docs/vital-claw/FREEZE.md" },
  { slug: "my-family", freeze: "docs/kin-claw/FREEZE.md" },
];

const PREVIEW_APP_IDS = [
  "my-shop",
  "tesla-optimus-engine",
  "robotaxi-fleet-manager",
  "my-vital",
  "my-family",
];

let pass = 0;
let fail = 0;

async function check(name, fn) {
  try {
    if (await fn()) {
      console.log(`PASS · ${name}`);
      pass++;
    } else {
      console.log(`FAIL · ${name}`);
      fail++;
    }
  } catch (err) {
    console.log(`FAIL · ${name} (${err instanceof Error ? err.message : String(err)})`);
    fail++;
  }
}

async function postJson(urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

console.log(`==> Tier C sweep (v0.3.10) · base=${BASE}\n`);

await check("DAY-ONE-BUILD-PLAN.md exists", async () =>
  existsSync(path.join(REPO, "docs", "curxor-os", "DAY-ONE-BUILD-PLAN.md")),
);

await check("claw-preview-apps.ts lists five preview claws", async () => {
  const src = readFileSync(path.join(DASHBOARD, "lib", "claw-preview-apps.ts"), "utf8");
  return PREVIEW_APP_IDS.every((id) => src.includes(`"${id}"`));
});

await check("PreviewModuleBanner + ComingSoonBadge components", async () =>
  existsSync(path.join(DASHBOARD, "components", "app-shared", "PreviewModuleBanner.tsx")) &&
  existsSync(path.join(DASHBOARD, "components", "app-shared", "ComingSoonBadge.tsx")),
);

await check("app-agent-assist wires preview prompt block", async () => {
  const src = readFileSync(path.join(DASHBOARD, "lib", "app-agent-assist.ts"), "utf8");
  return src.includes("previewAgentPromptBlock") && src.includes("isPreviewApp");
});

for (const { slug, freeze } of PREVIEW_ROUTES) {
  await check(`FREEZE.md · ${slug}`, async () => existsSync(path.join(REPO, freeze)));

  await check(`GET /${slug} returns 200`, async () => {
    const res = await fetch(`${BASE}/${slug}`, { cache: "no-store" });
    return res.ok;
  });
}

await check("shop bootstrap previewMode", async () => {
  const { ok, json } = await postJson("/api/shop/status", { action: "dashboard_bootstrap" });
  return ok && json.previewMode === true;
});

await check("shop rejects production go_live action", async () => {
  const { json } = await postJson("/api/shop/status", { action: "go_live" });
  return json.ok === false && typeof json.error === "string";
});

await check("swarm bootstrap has growth + fleet (preview)", async () => {
  const { ok, json } = await postJson("/api/swarm/status", { action: "dashboard_bootstrap" });
  return (
    ok &&
    json.growthProfile?.growthLevel &&
    Array.isArray(json.fleet) &&
    json.goLive &&
    typeof json.goLive.demoReady === "boolean"
  );
});

await check("vital status has growth profile + protocol", async () => {
  const res = await fetch(`${BASE}/api/vital/status`, { cache: "no-store" });
  const json = await res.json();
  return (
    res.ok &&
    json.growthProfile?.growthLevel &&
    Array.isArray(json.protocol) &&
    json.goLive &&
    typeof json.goLive.demoReady === "boolean"
  );
});

await check("humanoid hub GET (Signal preview)", async () => {
  const res = await fetch(`${BASE}/api/humanoid/hub`, { cache: "no-store" });
  const json = await res.json();
  const units = json.hub?.units ?? json.units;
  return res.ok && json.ok === true && Array.isArray(units);
});

await check("family profiles GET (Kin preview)", async () => {
  const res = await fetch(`${BASE}/api/family`, { cache: "no-store" });
  const json = await res.json();
  return res.ok && Array.isArray(json.members) && json.members.length >= 1;
});

await check("vital lab route live", async () => {
  const res = await fetch(`${BASE}/api/vital/lab`, { cache: "no-store" });
  const json = await res.json();
  return res.ok && json.lab?.features;
});

console.log(`\n==> Tier C sweep: ${pass}/${pass + fail} passed`);
if (fail > 0) process.exitCode = 1;
