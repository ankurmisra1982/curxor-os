#!/usr/bin/env node
/**
 * Record ~100s Humanoid Home Hub walkthrough (Wave S1 GTM beats).
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { clickTab, dismissOverlays, gotoOptimus, prepareOptimusPage } from "./optimus-demo-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack");
const TMP = path.join(OUT, ".optimus-walkthrough-tmp");
const STOREFRONT_VIDEO = path.resolve(
  DASHBOARD,
  "..",
  "..",
  "curxor storefront",
  "public",
  "demo",
  "optimus-walkthrough.webm",
);

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

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
  await prepareOptimusPage(page);

  console.log(`Recording Humanoid Home Hub at ${BASE.replace(/\/$/, "")}/optimus`);
  await gotoOptimus(page, BASE);

  // Home · relationship + readiness (default tab)
  const callInput = page.getByPlaceholder(/Operator, Ankur/i);
  if (await callInput.count()) {
    await callInput.fill("Operator");
    await page.getByRole("button", { name: /Save relationship/i }).click();
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(1500);

  // Knowledge · Kin policy + audit + rule + mesh push
  await clickTab(page, "Knowledge");
  await page.waitForTimeout(1500);

  const toneSelect = page.locator("select").first();
  if (await toneSelect.count()) {
    await toneSelect.selectOption("warm");
    await page.waitForTimeout(1200);
  }

  const auditBtn = page.getByRole("button", { name: /View audit/i });
  if (await auditBtn.count()) {
    await page.getByText(/Pair-day memory audit/i).scrollIntoViewIfNeeded();
    await auditBtn.first().click();
    await page.waitForTimeout(2500);
  }

  const ruleInput = page.getByPlaceholder(/Shoes off/i);
  if (await ruleInput.count()) {
    await ruleInput.fill("Shoes off at the door — preview rule");
    await page.getByRole("button", { name: /Teach rule/i }).click();
    await page.waitForTimeout(1500);
  }

  const pushMesh = page.getByRole("button", { name: /Push to mesh/i });
  if (await pushMesh.count()) {
    await pushMesh.first().click();
    await page.waitForTimeout(2000);
  }

  // Routines · NL compose
  await clickTab(page, "Routines");
  await page.waitForTimeout(1500);

  const composeArea = page.getByPlaceholder(/kids get home from school/i);
  if (await composeArea.count()) {
    await composeArea.fill(
      "When guests arrive, greet them warmly by name and offer to take coats in the entryway.",
    );
    await page.getByRole("button", { name: /Compose & arm/i }).click();
    await page.waitForTimeout(2500);
  }

  // Fleet · pair-day wizard preview
  await clickTab(page, "Fleet");
  await page.waitForTimeout(2000);

  const pairBtn = page.getByRole("button", { name: /Pair day wizard/i });
  if (await pairBtn.count()) {
    await pairBtn.first().click();
    await page.waitForTimeout(1000);
    const startBtn = page.getByRole("button", { name: /Start discovery/i });
    if (await startBtn.count()) {
      await startBtn.click();
      await page.waitForTimeout(1500);
    }
    for (let i = 0; i < 4; i++) {
      const cont = page.getByRole("button", { name: /Continue/i });
      if (await cont.count()) {
        await cont.first().click();
        await page.waitForTimeout(1200);
      }
    }
    const finish = page.getByRole("button", { name: /Finish preview pair/i });
    if (await finish.count()) {
      await finish.click();
      await page.waitForTimeout(1500);
    }
  }
  await dismissOverlays(page);

  await clickTab(page, "Control");
  await page.waitForTimeout(2500);

  await context.close();
  await browser.close();

  const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
  if (!webm) {
    console.error("No video captured — check dev server and /optimus route.");
    process.exit(1);
  }

  const dest = path.join(OUT, "optimus-walkthrough.webm");
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
