#!/usr/bin/env node
/**
 * Capture Outreach Claw demo screenshots (desk tabs + Go Live).
 *
 * Usage:
 *   node scripts/capture-work-demo.mjs
 *   node scripts/capture-work-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const OUTREACH = path.join(OUT, "outreach");

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
  mkdirSync(OUTREACH, { recursive: true });
  const base = BASE.replace(/\/$/, "");
  console.log(`==> Outreach demo screenshots · base=${base}\n`);

  const targets = [
    { url: `${base}/my-work`, file: path.join(OUT, "07-unified-inbox.png"), label: "Outreach desk (Start tab)" },
    { url: `${base}/my-work`, file: path.join(OUTREACH, "20-go-live.png"), label: "Go Live panel" },
    { url: `${base}/my-work`, file: path.join(OUTREACH, "21-pipeline.png"), label: "Pipeline tab (manual: switch to Outreach)" },
    { url: `${base}/my-work`, file: path.join(OUTREACH, "22-sequences.png"), label: "Sequences" },
    { url: `${base}/my-work`, file: path.join(OUTREACH, "23-analytics.png"), label: "Analytics (Standard+ Ops tab)" },
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

  console.log("Tip: set experienceLevel=standard for Comms/Ops tabs; expert for Integrations vault.");
  console.log("\nDone.");
}

main();
