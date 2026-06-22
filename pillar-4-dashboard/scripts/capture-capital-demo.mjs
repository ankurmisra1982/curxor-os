#!/usr/bin/env node
/**
 * Capture Capital Claw demo screenshots (desk + optional flows).
 *
 * Prerequisites:
 *   npm run dev   (or set CURXOR_DEMO_BASE)
 *   npx playwright install chromium   (first run only)
 *
 * Usage:
 *   node scripts/capture-capital-demo.mjs
 *   node scripts/capture-capital-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const CAPITAL = path.join(OUT, "capital");

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_DEMO_BASE ?? "http://127.0.0.1:3080");

function runPlaywright(url, dest, waitMs = 6000) {
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
        String(waitMs),
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
  mkdirSync(CAPITAL, { recursive: true });
  const base = BASE.replace(/\/$/, "");
  console.log(`==> Capital demo screenshots · base=${base}\n`);

  const targets = [
    { url: `${base}/my-capital`, file: path.join(OUT, "03-capital-claw.png"), label: "Capital desk" },
    {
      url: `${base}/my-capital`,
      file: path.join(CAPITAL, "19-capital-go-live.png"),
      label: "Go Live (scroll may need manual recapture for Standard+)",
    },
  ];

  for (const t of targets) {
    console.log(`==> ${t.label} → ${path.basename(t.file)}`);
    try {
      await runPlaywright(t.url, t.file, 7000);
      console.log(`    saved ${t.file}\n`);
    } catch (err) {
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  }

  console.log("Optional: set experienceLevel=standard in dev-qa/user-settings.json, then:");
  console.log('  node scripts/capture-one-demo.mjs /my-capital capital/18-analytics-tab.png "Analytics" --base ' + base);
  console.log('  node scripts/capture-one-demo.mjs /my-capital capital/17-setup-wizard.png "Setup Wizard" --base ' + base);
  console.log("\nDone.");
}

main();
