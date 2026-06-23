#!/usr/bin/env node
/**
 * Swarm Claw freeze demo captures — horizon, grid, workloads.
 *
 * Usage:
 *   node scripts/capture-swarm-freeze.mjs
 *   node scripts/capture-swarm-freeze.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots", "swarm");
const USER_SETTINGS = path.join(DASHBOARD, "scripts", "dev-qa", "user-settings.json");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

const VIEWPORT = { width: 1440, height: 900 };
const SETTLE_MS = 5000;

async function primeStandardExperience(page) {
  await page.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "standard");
    localStorage.setItem("curxor-ui-mode", "standard");
  });
}

function withSettingsPatch(patch, fn) {
  const raw = readFileSync(USER_SETTINGS, "utf8");
  const settings = JSON.parse(raw);
  settings.appearance = { ...settings.appearance, ...patch };
  writeFileSync(USER_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return fn().finally(() => {
    writeFileSync(USER_SETTINGS, raw, "utf8");
  });
}

async function primeSession(page, base) {
  const homeUrl = `${base.replace(/\/$/, "")}/home`;
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(3000);
  if (page.url().includes("/setup")) {
    await page.waitForURL((url) => !url.pathname.startsWith("/setup"), { timeout: 30_000 });
    await page.waitForTimeout(1500);
  }
}

async function gotoApp(page, base, route) {
  const url = `${base.replace(/\/$/, "")}${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(SETTLE_MS);
  if (!page.url().includes(route)) {
    await primeSession(page, base);
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(SETTLE_MS);
  }
}

async function seedExitDemo(base) {
  await fetch(`${base.replace(/\/$/, "")}/api/swarm/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "run_exit_demo" }),
  });
}

async function capture(page, dest) {
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`    saved ${dest}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`==> Swarm freeze captures · base=${BASE}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await primeStandardExperience(page);

  let failed = 0;

  await withSettingsPatch({ experienceLevel: "standard", swarmGrowthLevel: "L3" }, async () => {
    await seedExitDemo(BASE);

    const shots = [
      {
        file: "19-robotaxi-horizon.png",
        label: "Robotaxi horizon",
        setup: async () => {
          await page.getByText("Autonomous Robotaxi Fleet", { exact: false }).first().scrollIntoViewIfNeeded();
          await page.getByText("Coming Soon", { exact: false }).first().waitFor({ timeout: 20_000 });
        },
      },
      {
        file: "20-swarm-grid.png",
        label: "Geospatial grid",
        setup: async () => {
          const b3 = page.getByRole("button", { name: /^B3/i });
          if (await b3.count()) await b3.first().click();
          await page.getByText("Geospatial Grid", { exact: false }).first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(800);
        },
      },
      {
        file: "21-swarm-workloads.png",
        label: "Cross-Claw workloads",
        setup: async () => {
          await page.getByText("Cross-Claw Workloads", { exact: false }).first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(800);
        },
      },
    ];

    for (const shot of shots) {
      console.log(`==> ${shot.label} → swarm/${shot.file}`);
      try {
        await gotoApp(page, BASE, "/robotaxi");
        await shot.setup();
        await page.waitForTimeout(1200);
        await capture(page, path.join(OUT, shot.file));
        console.log("");
      } catch (err) {
        failed += 1;
        console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  });

  await browser.close();
  console.log(`Done · ${failed} failed · ${OUT}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
