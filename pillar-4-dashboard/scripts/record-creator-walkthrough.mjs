#!/usr/bin/env node
/**
 * Record ~90s Creator Claw walkthrough from Flight Command dev-qa.
 *
 * Prerequisites:
 *   npm run dev  (with dev-qa env — see docs/demo-pack/README.md)
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/record-creator-walkthrough.mjs
 *   node scripts/record-creator-walkthrough.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".walkthrough-video-tmp");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "..",
  "curxor storefront",
  "public",
  "demo",
  "creator-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE =
  baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

async function slowScroll(page, steps, pauseMs) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.45)));
    await page.waitForTimeout(pauseMs);
  }
}

async function clickCreatorTab(page, tabLabel) {
  const btn = page.locator("nav").filter({ hasText: /Plan|Create|Publish|Engage|Analytics/ }).getByRole("button", {
    name: new RegExp(`^${tabLabel}$`, "i"),
  });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(1200);
  }
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(path.dirname(STOREFRONT_VIDEO), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const url = `${BASE.replace(/\/$/, "")}/my-content`;

  console.log(`==> Recording Creator Claw walkthrough · ${url}\n`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(10_000);

  try {
    await page.getByText("Go Live", { exact: false }).first().waitFor({ timeout: 20_000 });
  } catch {
    console.warn("Warning: Go Live panel not detected — continuing capture");
  }

  await page.waitForTimeout(8_000);
  for (const tab of ["Plan", "Create", "Publish", "Engage", "Analytics"]) {
    await clickCreatorTab(page, tab);
    await slowScroll(page, 2, 2_500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2_000);
  }
  await slowScroll(page, 4, 4_000);
  await page.waitForTimeout(5_000);

  await context.close();
  await browser.close();

  const webm = readdirSync(TMP).find((name) => name.endsWith(".webm"));
  if (!webm) {
    throw new Error("No webm produced — check dev server and Playwright install");
  }

  const src = path.join(TMP, webm);
  copyFileSync(src, path.join(OUT, "creator-walkthrough.webm"));
  copyFileSync(src, STOREFRONT_VIDEO);
  console.log(`Saved ${path.join(OUT, "creator-walkthrough.webm")}`);
  console.log(`Copied ${STOREFRONT_VIDEO}`);
  rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
