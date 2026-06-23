#!/usr/bin/env node
/**
 * Capture Capital Claw demo screenshots (desk + optional flows).
 *
 * Prerequisites:
 *   npm run dev   (or set CURXOR_DEMO_BASE)
 *   npx playwright install chromium   (first run only)
 *
 * Usage:
 *   node scripts/capture-capital-demo.mjs
 *   node scripts/capture-capital-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CAPITAL = path.join(OUT, "capital");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withExperienceLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, experienceLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function captureCapitalAlpha(page, base, dest) {
  await page.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "standard");
    localStorage.setItem("curxor-ui-mode", "standard");
  });
  const url = `${base}/my-capital`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(7000);
  const alphaBtn = page.getByRole("button", { name: /^Alpha$/i });
  if (await alphaBtn.count()) await alphaBtn.first().click();
  await page.waitForTimeout(1200);
  await page.getByText("Sovereign alpha feed", { exact: false }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: dest, fullPage: false });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CAPITAL, { recursive: true });
  const base = BASE.replace(/\/$/, "");
  console.log(`==> Capital demo screenshots · base=${base}\n`);

  await withExperienceLevel("standard", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem("curxor-experience-level", "standard");
      localStorage.setItem("curxor-ui-mode", "standard");
    });

    console.log("==> Capital desk (Alpha tab) → 03-capital-claw.png");
    try {
      const dest = path.join(OUT, "03-capital-claw.png");
      await captureCapitalAlpha(page, base, dest);
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }

    console.log("==> Go Live → capital/19-capital-go-live.png");
    try {
      await page.getByRole("button", { name: /^Trade$/i }).first().click();
      await page.waitForTimeout(800);
      await page.getByText("Go Live", { exact: false }).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const dest = path.join(CAPITAL, "19-capital-go-live.png");
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }

    await browser.close();
  });

  console.log("Optional:");
  console.log('  node scripts/capture-one-demo.mjs /my-capital capital/18-analytics-tab.png "Analytics" --base ' + base);
  console.log('  node scripts/capture-one-demo.mjs /my-capital capital/17-setup-wizard.png "Setup Wizard" --base ' + base);
  console.log("\nDone.");
}

main();
