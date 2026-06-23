#!/usr/bin/env node
/**
 * Record ~90s Capital Claw walkthrough from Flight Command dev-qa.
 *
 * Prerequisites:
 *   npm run dev  (with dev-qa env — see docs/demo-pack/README.md)
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/record-capital-walkthrough.mjs
 *   node scripts/record-capital-walkthrough.mjs --base http://127.0.0.1:3080
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".capital-walkthrough-tmp");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "..",
  "curxor storefront",
  "public",
  "demo",
  "capital-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE =
  baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function withExperienceLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, experienceLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function slowScroll(page, steps, pauseMs) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.45)));
    await page.waitForTimeout(pauseMs);
  }
}

async function clickCapitalTab(page, tabLabel) {
  const btn = page.getByRole("button", { name: new RegExp(`^${tabLabel}$`, "i") });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(1200);
  }
}

async function primeStandardExperience(context) {
  await context.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "standard");
    localStorage.setItem("curxor-ui-mode", "standard");
  });
}

async function main() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(path.dirname(STOREFRONT_VIDEO), { recursive: true });

  await withExperienceLevel("standard", async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: TMP, size: { width: 1440, height: 900 } },
    });
    await primeStandardExperience(context);
    const page = await context.newPage();
    const url = `${BASE.replace(/\/$/, "")}/my-capital`;

    console.log(`==> Recording Capital Claw walkthrough · ${url}\n`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(8_000);

    try {
      await page.getByText("Sovereign alpha feed", { exact: false }).first().waitFor({ timeout: 20_000 });
    } catch {
      console.warn("Warning: Alpha feed not detected — clicking Alpha tab");
      await clickCapitalTab(page, "Alpha");
    }

    await page.waitForTimeout(6_000);
    await slowScroll(page, 4, 4_000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3_000);

    await clickCapitalTab(page, "Research");
    const spyChip = page.getByRole("button", { name: /^SPY$/i });
    if (await spyChip.count()) await spyChip.first().click();
    else {
      const researchBtn = page.getByRole("button", { name: /^Research$/i });
      if (await researchBtn.count()) await researchBtn.first().click();
    }
    try {
      await page.getByText("Consensus meter", { exact: false }).first().waitFor({ timeout: 20_000 });
    } catch {
      console.warn("Warning: Consensus meter not visible — continuing");
    }
    await page.waitForTimeout(5_000);
    await slowScroll(page, 3, 3_500);

    await clickCapitalTab(page, "Trade");
    try {
      await page.getByText("Go Live", { exact: false }).first().waitFor({ timeout: 15_000 });
    } catch {
      console.warn("Warning: Go Live panel not detected — continuing capture");
    }
    await page.waitForTimeout(5_000);
    await slowScroll(page, 3, 3_000);
    await page.waitForTimeout(4_000);

    await context.close();
    await browser.close();
  });

  const webm = readdirSync(TMP).find((name) => name.endsWith(".webm"));
  if (!webm) {
    throw new Error("No webm produced — check dev server and Playwright install");
  }

  const src = path.join(TMP, webm);
  copyFileSync(src, path.join(OUT, "capital-walkthrough.webm"));
  copyFileSync(src, STOREFRONT_VIDEO);
  console.log(`Saved ${path.join(OUT, "capital-walkthrough.webm")}`);
  console.log(`Copied ${STOREFRONT_VIDEO}`);
  rmSync(TMP, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
