#!/usr/bin/env node
/**
 * Record ~60s Arbitrage Claw preview walkthrough from Flight Command dev-qa.
 *
 * Prerequisites:
 *   npm run dev
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/record-shop-walkthrough.mjs
 *   node scripts/record-shop-walkthrough.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".shop-walkthrough-tmp");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "..",
  "curxor storefront",
  "public",
  "demo",
  "shop-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE =
  baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withShopGrowthLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, shopGrowthLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function slowScroll(page, steps, pauseMs) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.4)));
    await page.waitForTimeout(pauseMs);
  }
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(path.dirname(STOREFRONT_VIDEO), { recursive: true });

  await withShopGrowthLevel("L2", async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
    });
    await context.addInitScript(() => {
      localStorage.setItem("curxor-experience-level", "beginner");
      localStorage.setItem("curxor-ui-mode", "simple");
    });
    const page = await context.newPage();
    const url = `${BASE.replace(/\/$/, "")}/my-shop`;

    console.log(`==> Recording Arbitrage preview walkthrough · ${url}\n`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(5000);

    try {
      await page.getByText("Preview module", { exact: false }).first().waitFor({ timeout: 20_000 });
    } catch {
      console.warn("Warning: Preview banner not detected");
    }

    const marginsBtn = page.getByRole("button", { name: /^Margins$/i });
    if (await marginsBtn.count()) {
      await marginsBtn.first().click();
      await page.waitForTimeout(4000);
    }

    await slowScroll(page, 3, 3000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    const pipelineBtn = page.getByRole("button", { name: /^Pipeline$/i });
    if (await pipelineBtn.count()) {
      await pipelineBtn.first().click();
      await page.waitForTimeout(4000);
    }

    await page.waitForTimeout(3000);
    await context.close();
    await browser.close();

    const webms = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
    if (!webms.length) {
      console.error("No video file produced");
      process.exit(1);
    }
    const src = path.join(TMP, webms[0]);
    const dest = path.join(OUT, "shop-walkthrough.webm");
    copyFileSync(src, dest);
    try {
      copyFileSync(src, STOREFRONT_VIDEO);
      console.log(`Copied to storefront: ${STOREFRONT_VIDEO}`);
    } catch {
      console.warn("Storefront path not found — dashboard copy only");
    }
    console.log(`\nSaved ${dest}`);
    rmSync(TMP, { recursive: true, force: true });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
