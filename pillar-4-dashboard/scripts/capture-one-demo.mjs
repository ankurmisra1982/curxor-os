#!/usr/bin/env node
/**
 * Capture a single demo screenshot with Playwright (full page load).
 * Usage: node scripts/capture-one-demo.mjs /my-vital 05-vital-claw.png "Longevity protocol desk"
 *        node scripts/capture-one-demo.mjs /my-content 08-creator-claw.png "Go Live" --base http://127.0.0.1:3080
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
let base = process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080";
if (baseIdx >= 0) {
  base = args[baseIdx + 1] ?? base;
  args.splice(baseIdx, 2);
}

const [route, file, ...textParts] = args;
const waitText = textParts.join(" ").trim();

if (!route || !file) {
  console.error("Usage: node scripts/capture-one-demo.mjs <route> <file> [wait-text] [--base url]");
  process.exit(1);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = `${base.replace(/\/$/, "")}${route}`;
  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(6000);
  if (waitText) {
    try {
      await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 15_000 });
    } catch {
      console.warn(`Warning: "${waitText}" not found — saving current view`);
    }
  }
  const dest = path.join(OUT, file);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`Saved ${dest}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
