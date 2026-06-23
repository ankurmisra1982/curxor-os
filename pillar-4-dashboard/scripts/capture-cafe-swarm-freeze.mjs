#!/usr/bin/env node
/**
 * Capture Claw Cafe ascension + Swarm Robotaxi horizon freeze screenshots.
 *
 * Usage:
 *   node scripts/capture-cafe-swarm-freeze.mjs
 *   node scripts/capture-cafe-swarm-freeze.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CAFE_OUT = path.join(OUT, "cafe");
const SWARM_OUT = path.join(OUT, "swarm");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 5000;

async function primeStandardExperience(page) {
  await page.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "standard");
    localStorage.setItem("curxor-ui-mode", "standard");
  });
}

function withSettingsPatch(patch, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, ...patch };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function primeSession(page, base) {
  const homeUrl = `${base.replace(/\/$/, "")}/home`;
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(3000);
  if (page.url().includes("/setup")) {
    await page.waitForURL((url) => !url.pathname.startsWith("/setup"), { timeout: 30_000 });
    await page.waitForTimeout(1500);
  }
}

async function gotoApp(page, base, route) {
  const url = `${base.replace(/\/$/, "")}${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  if (!page.url().includes(route)) {
    await primeSession(page, base);
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
  }
}

async function clickTab(page, label) {
  const btn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(1200);
  }
}

async function main() {
  mkdirSync(CAFE_OUT, { recursive: true });
  mkdirSync(SWARM_OUT, { recursive: true });

  console.log(`==> Cafe + Swarm freeze captures · base=${BASE}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await primeStandardExperience(page);

  let failed = 0;

  try {
    await withSettingsPatch({ experienceLevel: "standard", workGamificationOptOut: false }, async () => {
      const cafeUrl = `${BASE.replace(/\/$/, "")}/claw-cafe`;
      console.log(`==> Claw Cafe Ascension → cafe/18-ascension-tab.png`);
      console.log(`    → ${cafeUrl}`);
      await gotoApp(page, BASE, "/claw-cafe");
      await clickTab(page, "Ascension");
      await page.getByText("Spatial room", { exact: false }).first().waitFor({ timeout: 20_000 });
      await page.getByText("ascension XP", { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(1500);
      const cafeDest = path.join(CAFE_OUT, "18-ascension-tab.png");
      await page.screenshot({ path: cafeDest, fullPage: false });
      console.log(`    saved ${cafeDest}\n`);
    });
  } catch (err) {
    failed += 1;
    console.error(`    FAILED cafe: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  try {
    await withSettingsPatch({ experienceLevel: "standard", swarmGrowthLevel: "L3" }, async () => {
      const swarmUrl = `${BASE.replace(/\/$/, "")}/robotaxi`;
      console.log(`==> Swarm Robotaxi horizon → swarm/19-robotaxi-horizon.png`);
      console.log(`    → ${swarmUrl}`);
      await gotoApp(page, BASE, "/robotaxi");
      await page.getByText("Autonomous Robotaxi Fleet", { exact: false }).first().scrollIntoViewIfNeeded();
      await page.getByText("Coming Soon", { exact: false }).first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      const swarmDest = path.join(SWARM_OUT, "19-robotaxi-horizon.png");
      await page.screenshot({ path: swarmDest, fullPage: false });
      console.log(`    saved ${swarmDest}\n`);
    });
  } catch (err) {
    failed += 1;
    console.error(`    FAILED swarm: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  await browser.close();

  console.log(`Done · ${failed} failed`);
  console.log(`  ${CAFE_OUT}`);
  console.log(`  ${SWARM_OUT}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
