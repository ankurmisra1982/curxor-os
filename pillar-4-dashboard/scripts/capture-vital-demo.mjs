#!/usr/bin/env node
/**
 * Capture Vital Claw demo screenshots (desk + tab flows).
 *
 * Prerequisites:
 *   npm run dev   (with dev-qa env — see docs/demo-pack/README.md)
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/capture-vital-demo.mjs
 *   node scripts/capture-vital-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const VITAL = path.join(OUT, "vital");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withExperienceLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = {
    ...settings.appearance,
    experienceLevel: level,
    vitalGrowthLevel: "L4",
  };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function clickVitalTab(page, tabLabel) {
  const btn = page.getByRole("button", { name: new RegExp(`^${tabLabel}$`, "i") });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(900);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(VITAL, { recursive: true });
  const base = BASE.replace(/\/$/, "");
  console.log(`==> Vital demo screenshots · base=${base}\n`);

  await withExperienceLevel("standard", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem("curxor-experience-level", "standard");
      localStorage.setItem("curxor-ui-mode", "standard");
    });

    const url = `${base}/my-vital`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(6000);

    console.log("==> Vital Lab (hero) → 05-vital-claw.png");
    await clickVitalTab(page, "Lab");
    await page.getByText("Longevity Lab", { exact: false }).first().scrollIntoViewIfNeeded();
    const askBtn = page.getByRole("button", { name: /Ask \(local\)/i });
    if (await askBtn.count()) {
      await page.getByPlaceholder(/Given my sleep score/i).fill("What should I prioritize for longevity?");
      await askBtn.first().click();
      await page.waitForTimeout(2500);
    }
    const labHeroDest = path.join(OUT, "05-vital-claw.png");
    await page.screenshot({ path: labHeroDest, fullPage: false });
    console.log(`    saved ${labHeroDest}\n`);

    console.log("==> Go Live checklist → vital/19-go-live.png");
    await page.getByText("Go Live", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "19-go-live.png"), fullPage: false });

    console.log("==> Vital overview → vital/17-overview-tab.png");
    await clickVitalTab(page, "Overview");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "17-overview-tab.png"), fullPage: false });

    console.log("==> Lab tab → vital/20-longevity-lab.png");
    await clickVitalTab(page, "Lab");
    await page.getByText("Longevity Lab", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "20-longevity-lab.png"), fullPage: false });

    console.log("==> Protocol tab → vital/21-protocol-tab.png");
    await clickVitalTab(page, "Protocol");
    await page.getByText("Active longevity protocol", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "21-protocol-tab.png"), fullPage: false });

    console.log("==> Bridges tab → vital/22-bridges-tab.png");
    await clickVitalTab(page, "Bridges");
    await page.getByText("Garmin Connect OAuth", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "22-bridges-tab.png"), fullPage: false });

    console.log("==> Reports tab → vital/23-reports-tab.png");
    await clickVitalTab(page, "Reports");
    await page.getByText("Medical report vault", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "23-reports-tab.png"), fullPage: false });

    console.log("==> Analytics tab → vital/24-analytics-tab.png");
    await clickVitalTab(page, "Analytics");
    await page.getByText("Longevity analytics", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(VITAL, "24-analytics-tab.png"), fullPage: false });

    await browser.close();
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
