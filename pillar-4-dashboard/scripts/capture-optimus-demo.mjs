#!/usr/bin/env node
/**
 * Capture Signal Claw / Humanoid Home Hub demo screenshots (5-tab workspace).
 *
 * Usage:
 *   node scripts/capture-optimus-demo.mjs
 *   node scripts/capture-optimus-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import {
  captureKnowledgeAudit,
  clickTab,
  gotoOptimus,
  prepareOptimusPage,
} from "./optimus-demo-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots", "signal");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await prepareOptimusPage(page);

  console.log(`Capturing Signal Claw at ${BASE.replace(/\/$/, "")}/optimus`);
  await gotoOptimus(page, BASE);

  await clickTab(page, "Home");
  await page.screenshot({ path: path.join(OUT, "01-home-hub.png"), fullPage: true });

  await clickTab(page, "Knowledge");
  await page.waitForTimeout(1200);
  await page.getByText(/Kin-aware robot policy/i).scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: path.join(OUT, "02-knowledge-kin-policy.png"), fullPage: true });

  try {
    await captureKnowledgeAudit(page, path.join(OUT, "03-knowledge-audit.png"));
  } catch (err) {
    console.warn(`Audit panel not captured — ${err instanceof Error ? err.message : String(err)}`);
  }

  await clickTab(page, "Routines");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "04-routines-compose.png"), fullPage: true });

  await clickTab(page, "Fleet");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "05-fleet.png"), fullPage: true });

  const pairBtn = page.getByRole("button", { name: /Pair day wizard/i });
  if (await pairBtn.count()) {
    await pairBtn.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, "06-fleet-pair-wizard.png"), fullPage: true });
    await page.getByRole("button", { name: /^Cancel$/i }).first().click({ force: true });
    await page.waitForTimeout(600);
  } else {
    await page.screenshot({ path: path.join(OUT, "06-fleet-paired-preview.png"), fullPage: true });
  }

  await clickTab(page, "Control");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "07-control-preview.png"), fullPage: true });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
