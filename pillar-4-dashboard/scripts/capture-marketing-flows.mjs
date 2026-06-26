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
 *   node scripts/capture-marketing-flows.mjs --creator-only
 *   node scripts/capture-marketing-flows.mjs --base http://127.0.0.1:3100
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CREATOR_OUT = path.join(OUT, "creator");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");
const CREATOR_ONLY = args.includes("--creator-only");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 5000;
const CREATOR_SETTLE_MS = 15_000;

async function waitForCreatorDesk(page) {
  try {
    await page
      .getByText(/Creator Claw Studio|Go Live|Welcome to Creator/i)
      .first()
      .waitFor({ timeout: 60_000 });
  } catch {
    console.warn('    Warning: Creator desk not ready — saving current view');
  }
  await page.waitForTimeout(1500);
}

async function clickCreatorTab(page, tabLabel) {
  const btn = page.locator("nav").filter({ hasText: /Plan|Create|Publish|Engage|Analytics/ }).getByRole("button", {
    name: new RegExp(`^${tabLabel}$`, "i"),
  });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(800);
  }
}

async function clickCapitalTab(page, tabLabel) {
  const btn = page.getByRole("button", { name: new RegExp(`^${tabLabel}$`, "i") });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(800);
  }
}

async function clickVitalTab(page, tabLabel) {
  const btn = page.getByRole("button", { name: new RegExp(`^${tabLabel}$`, "i") });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(800);
  }
}

async function primeStandardExperience(page) {
  await page.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "standard");
    localStorage.setItem("curxor-ui-mode", "standard");
  });
}

function withExperienceLevel(level, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, experienceLevel: level };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

/** @type {{ route: string; file: string; label: string; waitText?: string; dir?: string }[]} */
const ROUTES = [
  { route: "/home", file: "01-home.png", label: "Home hub", waitText: "Recent" },
  { route: "/settings", file: "02-settings.png", label: "Settings", waitText: "Appearance" },
  { route: "/my-capital", file: "03-capital-claw.png", label: "Capital Claw", waitText: "Capital" },
  { route: "/claw-forge", file: "04-forge.png", label: "The Forge", waitText: "Forge" },
  { route: "/my-vital", file: "05-vital-claw.png", label: "Vital Claw", waitText: "Vital" },
  { route: "/my-family", file: "06-kin-claw.png", label: "Kin Claw", waitText: "Why Kin matters" },
  { route: "/my-work", file: "07-unified-inbox.png", label: "Outreach Claw", waitText: "Outreach Desk" },
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
      const goLive = page.getByText(/Go Live/i).first();
      if (await goLive.count()) {
        await goLive.scrollIntoViewIfNeeded().catch(() => {});
      } else {
        await page.getByText(/Creator Claw/i).first().scrollIntoViewIfNeeded().catch(() => {});
      }
    },
  },
  {
    file: "10-content-calendar.png",
    label: "Content calendar",
    setup: async (page) => {
      await clickCreatorTab(page, "Plan");
      await page.getByText("Content Calendar", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "11-publish-recovery.png",
    label: "Publish recovery",
    setup: async (page) => {
      await clickCreatorTab(page, "Publish");
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
      await clickCreatorTab(page, "Publish");
      await page.getByText("Bridge Health", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "14-analytics-funnel.png",
    label: "Analytics",
    setup: async (page) => {
      await clickCreatorTab(page, "Analytics");
      await page.getByText("Analytics", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "15-engage-inbox.png",
    label: "Engage inbox",
    setup: async (page) => {
      await clickCreatorTab(page, "Engage");
      await page.getByText("Engage → Reply → Publish", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "16-content-planner.png",
    label: "Content planner",
    setup: async (page) => {
      await clickCreatorTab(page, "Plan");
      await page.getByText("Content Planner", { exact: false }).first().scrollIntoViewIfNeeded();
    },
  },
  {
    file: "17-growth-level-badge.png",
    label: "Growth level badge",
    setup: async (page) => {
      await page.getByText("Creator Claw Studio", { exact: false }).first().scrollIntoViewIfNeeded();
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
  await primeStandardExperience(page);

  let failed = 0;

  if (!CREATOR_ONLY) {
  console.log("==> Core Claw routes\n");
  for (const target of ROUTES) {
    const url = `${BASE.replace(/\/$/, "")}${target.route}`;
    const dest = path.join(OUT, target.file);
    console.log(`==> ${target.label} → ${target.file}`);
    try {
      if (target.route === "/my-capital") {
        await withExperienceLevel("standard", async () => {
          console.log(`    → ${url}`);
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
          await page.waitForTimeout(SETTLE_MS);
          if (target.waitText) await waitForText(page, target.waitText);
          await clickCapitalTab(page, "Alpha");
          await page.getByText("Sovereign alpha feed", { exact: false }).first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(1200);
          await page.screenshot({ path: dest, fullPage: false });
          console.log(`    saved ${dest} (Alpha tab)`);
        });
      } else if (target.route === "/my-vital") {
        await withExperienceLevel("standard", async () => {
          console.log(`    → ${url}`);
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
          await page.waitForTimeout(SETTLE_MS);
          if (target.waitText) await waitForText(page, target.waitText);
          await clickVitalTab(page, "Lab");
          await page.getByText("Longevity Lab", { exact: false }).first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(1200);
          await page.screenshot({ path: dest, fullPage: false });
          console.log(`    saved ${dest} (Lab tab)`);
        });
      } else {
        await capturePage(page, url, dest, target.waitText);
      }
      console.log("");
    } catch (err) {
      failed += 1;
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
  }

  console.log("==> Creator Claw flows\n");
  const creatorUrl = `${BASE.replace(/\/$/, "")}/my-content`;

  for (const flow of CREATOR_FLOWS) {
    const dest = path.join(CREATOR_OUT, flow.file);
    console.log(`==> ${flow.label} → creator/${flow.file}`);
    try {
      console.log(`    → ${creatorUrl}`);
      await page.goto(creatorUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(CREATOR_SETTLE_MS);
      await waitForCreatorDesk(page);
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

  const targetCount = (CREATOR_ONLY ? 0 : ROUTES.length) + CREATOR_FLOWS.length;
  console.log(`Done. ${targetCount} targets · ${failed} failed`);
  console.log(`  ${OUT}`);
  console.log(`  ${CREATOR_OUT}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
