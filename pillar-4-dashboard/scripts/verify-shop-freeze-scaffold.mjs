#!/usr/bin/env node
/**
 * Verify Arbitrage Claw Day One freeze scaffold (Tier C preview + desk showcase).
 * Usage: node scripts/verify-shop-freeze-scaffold.mjs [baseUrl]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

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

console.log(`==> Arbitrage freeze scaffold · base=${BASE}\n`);

await check("FREEZE.md exists", async () =>
  existsSync(path.join(DASHBOARD, "..", "docs", "arbitrage-claw", "FREEZE.md")),
);

await check("RELEASE-NEXT.md exists", async () =>
  existsSync(path.join(DASHBOARD, "..", "docs", "arbitrage-claw", "RELEASE-NEXT.md")),
);

await check("digital.env.example has commerce vars", async () => {
  const example = path.join(__dirname, "dev-qa", "digital.env.example");
  if (!existsSync(example)) return false;
  const text = readFileSync(example, "utf8");
  return (
    text.includes("SHOPIFY_SHOP_DOMAIN") &&
    text.includes("EBAY_ACCESS_TOKEN") &&
    text.includes("PRINTIFY_API_TOKEN")
  );
});

await check("GET /my-shop returns 200", async () => {
  const res = await fetch(`${BASE}/my-shop`, { cache: "no-store" });
  return res.ok;
});

await check("shop bootstrap previewMode + deskShowcase", async () => {
  const { ok, json } = await postJson("/api/shop/status", { action: "dashboard_bootstrap" });
  return (
    ok &&
    json.previewMode === true &&
    json.deskShowcase &&
    typeof json.deskShowcase.mode === "string" &&
    json.shopify &&
    json.ebay &&
    json.printify
  );
});

await check("activate_desk_showcase action exists", async () => {
  const { ok, json } = await postJson("/api/shop/status", { action: "activate_desk_showcase" });
  return ok && json.bootstrap?.deskShowcase && Array.isArray(json.bootstrap.spreads);
});

await check("no shop go_live endpoint (capital-only pattern)", async () => {
  const { json } = await postJson("/api/shop/status", { action: "go_live" });
  return json.ok === false && typeof json.error === "string";
});

await check("growth L2 bootstrap has margins spreads", async () => {
  const settingsPath = path.join(__dirname, "dev-qa", "user-settings.json");
  const raw = readFileSync(settingsPath, "utf8");
  const settings = JSON.parse(raw);
  const saved = settings.appearance?.shopGrowthLevel;
  settings.appearance = { ...settings.appearance, shopGrowthLevel: "L2" };
  const { writeFileSync } = await import("node:fs");
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  try {
    const { ok, json } = await postJson("/api/shop/status", { action: "dashboard_bootstrap" });
    return ok && json.growthProfile?.growthLevel === "L2" && Array.isArray(json.spreads);
  } finally {
    if (saved === undefined) delete settings.appearance.shopGrowthLevel;
    else settings.appearance.shopGrowthLevel = saved;
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }
});

await check("capture-shop-demo.mjs exists", async () =>
  existsSync(path.join(__dirname, "capture-shop-demo.mjs")),
);

console.log(`\n==> ${pass}/${pass + fail} passed`);
if (fail > 0) process.exitCode = 1;
