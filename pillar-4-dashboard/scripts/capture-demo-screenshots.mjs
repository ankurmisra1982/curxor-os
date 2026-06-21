#!/usr/bin/env node
/**
 * Capture Flight Command demo screenshots for GTM / pitch deck.
 *
 * Prerequisites:
 *   npm run dev   (or set CURXOR_DEMO_BASE)
 *   npx playwright install chromium   (first run only)
 *
 * Usage:
 *   node scripts/capture-demo-screenshots.mjs
 *   node scripts/capture-demo-screenshots.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

const TARGETS = [
  { path: "/home", file: "01-home.png", label: "Home hub" },
  { path: "/settings", file: "02-settings.png", label: "Settings" },
  { path: "/my-capital", file: "03-capital-claw.png", label: "Capital Claw" },
  { path: "/claw-forge", file: "04-forge.png", label: "The Forge" },
  { path: "/my-vital", file: "05-vital-claw.png", label: "Vital Claw" },
  { path: "/my-family", file: "06-kin-claw.png", label: "Kin Claw" },
  { path: "/my-work", file: "07-unified-inbox.png", label: "Unified inbox" },
  { path: "/my-content", file: "08-creator-claw.png", label: "Creator Claw" },
];

function runPlaywright(url, dest) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "playwright",
        "screenshot",
        "--browser",
        "chromium",
        "--viewport-size",
        "1440,900",
        "--wait-for-timeout",
        "2000",
        url,
        dest,
      ],
      {
        cwd: DASHBOARD,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`playwright exit ${code}`))));
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`==> Demo screenshots · base=${BASE}\n`);

  for (const target of TARGETS) {
    const url = `${BASE.replace(/\/$/, "")}${target.path}`;
    const dest = path.join(OUT, target.file);
    console.log(`==> ${target.label} → ${target.file}`);
    try {
      await runPlaywright(url, dest);
      console.log(`    saved ${dest}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  }

  console.log(`Done. Screenshots in docs/demo-pack/screenshots/`);
}

main();
