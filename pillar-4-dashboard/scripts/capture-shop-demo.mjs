#!/usr/bin/env node
/**
 * Capture Arbitrage Claw demo screenshots (live multi-channel desk preview).
 *
 * Prerequisites:
 *   npm run dev   (dev-qa env + CURXOR_*_MOCK=1)
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/capture-shop-demo.mjs
 *   node scripts/capture-shop-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const SHOP = path.join(OUT, "shop");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withShopGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, shopGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function activateDesk(base) {
  const res = await fetch(`${base}/api/shop/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate_desk_showcase" }),
  });
  const json = await res.json();
  if (!res.ok || !json.bootstrap?.deskShowcase?.mode) {
    throw new Error(json.error ?? "activate_desk_showcase failed");
  }
  return json.bootstrap.deskShowcase.mode;
}

async function main() {
  mkdirSync(SHOP, { recursive: true });
  const base = BASE.replace(/\/$/, "");
  console.log(`==> Arbitrage live desk screenshots · base=${base}\n`);

  await withShopGrowthLevel("L2", async () => {
    console.log("==> activate_desk_showcase");
    const mode = await activateDesk(base);
    console.log(`    desk mode: ${mode}\n`);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem("curxor-experience-level", "beginner");
      localStorage.setItem("curxor-ui-mode", "simple");
    });

    console.log("==> L2 overview · live desk strip → shop/01-live-desk-overview.png");
    try {
      await page.goto(`${base}/my-shop`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(5000);
      await page.getByText("Live multi-channel arbitrage desk", { exact: false }).first().waitFor({ timeout: 20_000 });
      const dest = path.join(SHOP, "01-live-desk-overview.png");
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }

    console.log("==> L2 margins tab → shop/02-margins-live-spreads.png");
    try {
      const marginsBtn = page.getByRole("button", { name: /^Margins$/i });
      if (await marginsBtn.count()) await marginsBtn.first().click();
      await page.waitForTimeout(1200);
      const dest = path.join(SHOP, "02-margins-live-spreads.png");
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }

    console.log("==> L2 pipeline tab → shop/03-pipeline-ebay.png");
    try {
      const pipelineBtn = page.getByRole("button", { name: /^Pipeline$/i });
      if (await pipelineBtn.count()) await pipelineBtn.first().click();
      await page.waitForTimeout(1200);
      const dest = path.join(SHOP, "03-pipeline-ebay.png");
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }

    await browser.close();
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
