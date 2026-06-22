#!/usr/bin/env node
/**
 * Capture Forge demo screenshots (Mint + Fleet + Templates for L4).
 *
 * Usage:
 *   node scripts/capture-forge-demo.mjs
 *   node scripts/capture-forge-demo.mjs --base http://127.0.0.1:3080
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const OUT = path.join(DASHBOARD, "docs", "demo-pack", "screenshots");
const FORGE_OUT = path.join(OUT, "forge");
const DEV_QA = path.join(DASHBOARD, "scripts", "dev-qa");

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
      { cwd: DASHBOARD, stdio: "inherit", shell: process.platform === "win32" },
    );
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`playwright exit ${code}`))));
  });
}

function patchForgeGrowth(level) {
  const frePath = path.join(DEV_QA, "app-fre", "claw-forge.json");
  const fre = JSON.parse(readFileSync(frePath, "utf8"));
  fre.config = { ...fre.config, growthLevel: level, forgeGrowthIntent: level === "L4" ? "templates_import" : "first_claw" };
  writeFileSync(frePath, `${JSON.stringify(fre, null, 2)}\n`);
}

async function main() {
  mkdirSync(FORGE_OUT, { recursive: true });
  const base = BASE.replace(/\/$/, "");

  console.log(`==> Forge demo captures · base=${base}\n`);

  patchForgeGrowth("L1");
  await runPlaywright(`${base}/claw-forge`, path.join(OUT, "04-forge.png"), 8000);
  console.log("==> 04-forge.png (L1 Mint)\n");

  patchForgeGrowth("L2");
  await runPlaywright(`${base}/claw-forge`, path.join(FORGE_OUT, "30-forge-fleet.png"), 8000);
  console.log("==> forge/30-forge-fleet.png\n");

  patchForgeGrowth("L4");
  await runPlaywright(`${base}/claw-forge`, path.join(FORGE_OUT, "31-forge-templates.png"), 8000);
  console.log("==> forge/31-forge-templates.png\n");

  patchForgeGrowth("L5");
  await runPlaywright(`${base}/claw-forge`, path.join(FORGE_OUT, "32-forge-ops.png"), 8000);
  console.log("==> forge/32-forge-ops.png\n");

  console.log("Done · forge screenshots in docs/demo-pack/screenshots/forge/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
