#!/usr/bin/env node
/**
 * Runs all qa:local integration suites in one process (spawnSync loop).
 * Avoids Windows Node 24 libuv crash from many sequential child spawns in qa-local.mjs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const BASE = process.argv[2];
if (!BASE) {
  console.error("Usage: node scripts/qa-local-suites.mjs <baseUrl>");
  process.exitCode = 1;
} else {
  const suites = [
    ["scripts/qa-smoke.mjs", BASE],
    ["scripts/capital-checklist.mjs", BASE],
    ["scripts/creator-checklist.mjs", BASE],
    ["scripts/work-checklist.mjs", BASE],
    ["scripts/qa-forge-levels.mjs"],
    ["scripts/forge-checklist.mjs", BASE],
    ["scripts/qa-work-levels.mjs", BASE],
    ["scripts/verify-exit-demo-scaffold.mjs", BASE],
    ["scripts/verify-work-exit-demo-scaffold.mjs", BASE],
    ["scripts/verify-work-live-proof.mjs", BASE],
    ["scripts/verify-forge-exit-demo-scaffold.mjs", BASE],
    ["scripts/qa-user-flows.mjs", BASE],
    ["scripts/qa-cafe-ascension.mjs", BASE],
    ["scripts/qa-swarm-levels.mjs", BASE],
    ["scripts/verify-swarm-exit-demo-scaffold.mjs", BASE],
    ["scripts/qa-shop-levels.mjs", BASE],
    ["scripts/qa-shop-bridges.mjs", BASE],
    ["scripts/verify-shop-freeze-scaffold.mjs", BASE],
    ["scripts/qa-kin-levels.mjs", BASE],
    ["scripts/qa-vital-levels.mjs", BASE],
    ["scripts/verify-tier-c-sweep.mjs", BASE],
  ];

  let exitCode = 0;
  for (const args of suites) {
    const script = args[0];
    const scriptArgs = args.slice(1);
    const result = spawnSync(
      process.execPath,
      [path.join(DASHBOARD, script), ...scriptArgs],
      { cwd: DASHBOARD, env: process.env, stdio: "inherit", windowsHide: true },
    );
    if (result.status !== 0) {
      exitCode = result.status ?? 1;
      break;
    }
  }
  if (exitCode !== 0) process.exitCode = exitCode;
}
