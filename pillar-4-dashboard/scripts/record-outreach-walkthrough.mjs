#!/usr/bin/env node
/**
 * Record ~90s Work Claw walkthrough from Flight Command dev-qa.
 *
 * Usage:
 *   node scripts/record-outreach-walkthrough.mjs
 *   node scripts/record-outreach-walkthrough.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".outreach-walkthrough-tmp");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "curxor storefront",
  "public",
  "demo",
  "outreach-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

async function slowScroll(page, steps, pauseMs) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.45)));
    await page.waitForTimeout(pauseMs);
  }
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const url = `${BASE.replace(/\/$/, "")}/my-work`;

  console.log(`==> Recording Work Claw walkthrough · ${url}\n`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(8000);
  await slowScroll(page, 4, 2000);
  await page.getByText("Outreach", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(5000);
  await slowScroll(page, 3, 2000);
  await page.getByText("Comms", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByText("Start", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(6000);

  await context.close();
  await browser.close();

  const files = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    console.error("No video file produced");
    process.exit(1);
  }
  const src = path.join(TMP, files[0]);
  const dest = path.join(OUT, "outreach-walkthrough.webm");
  copyFileSync(src, dest);
  mkdirSync(path.dirname(STOREFRONT_VIDEO), { recursive: true });
  copyFileSync(src, STOREFRONT_VIDEO);
  rmSync(TMP, { recursive: true, force: true });
  console.log(`Saved ${dest}`);
  console.log(`Copied ${STOREFRONT_VIDEO}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
