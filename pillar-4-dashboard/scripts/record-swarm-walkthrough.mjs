#!/usr/bin/env node
/**
 * Record ~90s Swarm Claw walkthrough from Flight Command dev-qa.
 *
 * Usage:
 *   node scripts/record-swarm-walkthrough.mjs
 *   node scripts/record-swarm-walkthrough.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".swarm-walkthrough-tmp");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "..",
  "curxor storefront",
  "public",
  "demo",
  "swarm-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withSwarmGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, swarmGrowthLevel: level, experienceLevel: "standard" };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(path.dirname(STOREFRONT_VIDEO), { recursive: true });

  await withSwarmGrowthLevel("L3", async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    const url = `${BASE.replace(/\/$/, "")}/robotaxi`;

    console.log(`Recording Swarm Claw walkthrough at ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await page.getByText("Autonomous Robotaxi Fleet", { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const b3 = page.getByRole("button", { name: /^B3/i });
    if (await b3.count()) {
      await b3.first().click();
      await page.waitForTimeout(1200);
    }

    const assignBtn = page.getByRole("button", { name: /Assign Route/i });
    if (await assignBtn.count()) {
      await assignBtn.first().click();
      await page.waitForTimeout(2000);
    }

    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    if (await chatInput.count()) {
      await chatInput.fill("dispatch lowest latency unit to C2");
      await chatInput.press("Enter");
      await page.waitForTimeout(3500);
    }

    const pingBtn = page.getByRole("button", { name: /Ping Unit/i });
    if (await pingBtn.count()) {
      await pingBtn.first().click();
      await page.waitForTimeout(2500);
    }

    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1500);

    await context.close();
    await browser.close();
  });

  const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
  if (!webm) {
    console.error("No video captured — check dev server and /robotaxi route.");
    process.exit(1);
  }

  const dest = path.join(OUT, "swarm-walkthrough.webm");
  copyFileSync(path.join(TMP, webm), dest);
  try {
    copyFileSync(dest, STOREFRONT_VIDEO);
  } catch {
    console.warn("Storefront path missing — saved dashboard copy only.");
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`Saved ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
