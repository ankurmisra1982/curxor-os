#!/usr/bin/env node
/**
 * Record Forge exit-demo walkthrough — Mint → Fleet → forged desk.
 *
 * Usage:
 *   node scripts/record-forge-exit-demo.mjs
 *   node scripts/record-forge-exit-demo.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".forge-exit-demo-tmp");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

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
  const forgeUrl = `${BASE.replace(/\/$/, "")}/claw-forge`;

  console.log(`==> Recording Forge exit-demo walkthrough · ${forgeUrl}\n`);
  await page.goto(forgeUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(5000);

  await page.getByText("Go live", { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Run demo tour/i }).first().click().catch(() => {});
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: /^Fleet$/i }).first().click().catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByText("Open desk", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(6000);

  await context.close();
  await browser.close();

  const videos = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
  const src = videos[0] ? path.join(TMP, videos[0]) : null;
  const dest = path.join(OUT, "forge-exit-walkthrough.webm");
  if (src) {
    copyFileSync(src, dest);
    console.log(`Saved ${dest}`);
  } else {
    console.log("No video captured — check Playwright install and dev server.");
    process.exit(1);
  }
  rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
