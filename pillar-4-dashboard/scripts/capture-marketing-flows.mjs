#!/usr/bin/env node
/**
 * Capture Flight Command + Creator Claw marketing screenshots.
 *
 * Prerequisites:
 *   Dev server with dev-qa env (see docs/demo-pack/README.md)
 *   npx playwright install chromium   (first run)
 *
 * Usage:
 *   node scripts/capture-marketing-flows.mjs
 *   node scripts/capture-marketing-flows.mjs --base http://127.0.0.1:3100
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CREATOR_OUT = path.join(OUT, "creator");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 5000;

/** @type {{ route: string; file: string; label: string; waitText?: string; dir?: string }[]} */
const ROUTES = [
  { route: "/home", file: "01-home.png", label: "Home hub", waitText: "Recent" },
  { route: "/settings", file: "02-settings.png", label: "Settings", waitText: "Appearance" },
  { route: "/my-capital", file: "03-capital-claw.png", label: "Capital Claw", waitText: "Capital" },
  { route: "/claw-forge", file: "04-forge.png", label: "The Forge", waitText: "Forge" },
  { route: "/my-vital", file: "05-vital-claw.png", label: "Vital Claw", waitText: "Vital" },
  { route: "/my-family", file: "06-kin-claw.png", label: "Kin Claw", waitText: "Kin" },
  { route: "/my-work", file: "07-unified-inbox.png", label: "Unified inbox", waitText: "Comms desk" },
  {
    route: "/my-content",
    file: "08-creator-claw.png",
    label: "Creator Claw overview",
    waitText: "Go Live",
  },
];

/** @type {{ file: string; label: string; setup: (page: import('playwright').Page) => Promise<void> }[]} */
const CREATOR_FLOWS = [
  {
    file: "09-go-live-checklist.png",
    label: "Go Live checklist",
    setup: async (page) => {
      await page.getByText("Go Live", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "10-content-calendar.png",
    label: "Content calendar",
    setup: async (page) => {
      await page.getByText("Content Calendar", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "11-publish-recovery.png",
    label: "Publish recovery",
    setup: async (page) => {
      await page.getByText("Publish Recovery", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "12-creation-wizard.png",
    label: "Creation wizard",
    setup: async (page) => {
      await page.getByRole("button", { name: /Creation wizard/i }).first().click();
      await page.getByText(/Creation wizard ·/i).waitFor({ timeout: 10_000 });
    },
  },
  {
    file: "13-bridge-health.png",
    label: "Bridge health",
    setup: async (page) => {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(300);
      await page.getByText("Bridge Health", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "14-analytics-funnel.png",
    label: "Analytics",
    setup: async (page) => {
      await page.getByText("Analytics", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "15-engage-inbox.png",
    label: "Engage inbox",
    setup: async (page) => {
      await page.getByText("Engage → Reply → Publish", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "16-content-planner.png",
    label: "Content planner",
    setup: async (page) => {
      await page.getByText("Content Planner", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
];

async function waitForText(page, text) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 20_000 });
  } catch {
    console.warn(`    Warning: "${text}" not found — saving current view`);
  }
}

async function capturePage(page, url, dest, waitText) {
  console.log(`    → ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  if (waitText) await waitForText(page, waitText);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`    saved ${dest}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CREATOR_OUT, { recursive: true });

  console.log(`==> Marketing screenshots · base=${BASE}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  let failed = 0;

  console.log("==> Core Claw routes\n");
  for (const target of ROUTES) {
    const url = `${BASE.replace(/\/$/, "")}${target.route}`;
    const dest = path.join(OUT, target.file);
    console.log(`==> ${target.label} → ${target.file}`);
    try {
      await capturePage(page, url, dest, target.waitText);
      console.log("");
    } catch (err) {
      failed += 1;
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log("==> Creator Claw flows\n");
  const creatorUrl = `${BASE.replace(/\/$/, "")}/my-content`;
  console.log(`==> Loading ${creatorUrl}`);
  await page.goto(creatorUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  await waitForText(page, "Creator Claw Studio");

  for (const flow of CREATOR_FLOWS) {
    const dest = path.join(CREATOR_OUT, flow.file);
    console.log(`==> ${flow.label} → creator/${flow.file}`);
    try {
      await flow.setup(page);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      failed += 1;
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  await browser.close();

  console.log(`Done. ${ROUTES.length + CREATOR_FLOWS.length} targets · ${failed} failed`);
  console.log(`  ${OUT}`);
  console.log(`  ${CREATOR_OUT}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
