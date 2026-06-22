#!/usr/bin/env node
/**
 * Record Work Claw EXIT-DEMO walkthrough — live mail path emphasis.
 *
 * Usage:
 *   node scripts/record-work-exit-demo.mjs
 *   node scripts/record-work-exit-demo.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".work-exit-demo-tmp");

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
  const url = `${BASE.replace(/\/$/, "")}/my-work`;

  console.log(`==> Recording Work EXIT-DEMO walkthrough · ${url}\n`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(6000);

  await page.getByText("Go live", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(4000);
  await page.getByText("Exit demo mode", { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(3000);
  await page.getByText("Setup wizard", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(2000);
  await page.getByText("Integrations", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(5000);

  await context.close();
  await browser.close();

  const files = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    console.error("No video file produced");
    process.exit(1);
  }
  const src = path.join(TMP, files[0]);
  const dest = path.join(OUT, "work-exit-walkthrough.webm");
  copyFileSync(src, dest);
  rmSync(TMP, { recursive: true, force: true });
  console.log(`Saved ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
