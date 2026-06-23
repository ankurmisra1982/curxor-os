#!/usr/bin/env node
/**
 * Record Swarm Claw EXIT-DEMO walkthrough — cross-claw fleet scenario.
 *
 * Usage:
 *   node scripts/record-swarm-exit-demo.mjs
 *   node scripts/record-swarm-exit-demo.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".swarm-exit-demo-tmp");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withSwarmL4(fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, swarmGrowthLevel: "L4", experienceLevel: "standard" };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => writeFileSync(USER_SETTINGS, raw, "utf8"));
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  await withSwarmL4(async () => {
    await fetch(`${BASE}/api/swarm/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_exit_demo" }),
    }).catch(() => {});

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    const url = `${BASE.replace(/\/$/, "")}/robotaxi`;

    console.log(`==> Recording Swarm EXIT-DEMO · ${url}\n`);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const exitBtn = page.getByRole("button", { name: /Run exit-demo scenario/i });
    if (await exitBtn.count()) {
      await exitBtn.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
    }

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(2000);

    const routeBtn = page.getByRole("button", { name: /^Route$/i });
    if (await routeBtn.count()) {
      await routeBtn.first().click();
      await page.waitForTimeout(2500);
    }

    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    if (await chatInput.count()) {
      await chatInput.fill("rebalance the swarm");
      await chatInput.press("Enter");
      await page.waitForTimeout(3000);
    }

    await context.close();
    await browser.close();
  });

  const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
  if (!webm) {
    console.error("No video captured — check dev server and /robotaxi route.");
    process.exit(1);
  }

  const dest = path.join(OUT, "swarm-exit-walkthrough.webm");
  copyFileSync(path.join(TMP, webm), dest);
  rmSync(TMP, { recursive: true, force: true });
  console.log(`Saved ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
