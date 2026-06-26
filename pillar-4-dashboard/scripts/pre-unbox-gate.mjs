#!/usr/bin/env node
/**
 * Pre-unbox gate — typecheck, build, qa:local, artifact checks.
 * Usage: node scripts/pre-unbox-gate.mjs [--port 3081] [--skip-qa]
 */
import { spawnSync } from "node:child_process";
import net from "node:net";
import { existsSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(DASHBOARD, "..");

const args = process.argv.slice(2);
const skipQa = args.includes("--skip-qa");
const portIdx = args.indexOf("--port");
const PORT_ARG = portIdx >= 0 ? args[portIdx + 1] : null;

async function findFreePort(start = 3081, end = 3099) {
  for (let p = Number(start); p <= end; p++) {
    const ok = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (ok) return String(p);
  }
  throw new Error(`no free port in ${start}–${end}`);
}

const steps = [];
let failed = false;

function step(name, fn) {
  process.stdout.write(`\n▶ ${name}…\n`);
  try {
    fn();
    steps.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    failed = true;
    steps.push({ name, ok: false, error: String(err?.message ?? err) });
    console.error(`✗ ${name}: ${err?.message ?? err}`);
  }
}

function runNpm(script, extraArgs = []) {
  const r = spawnSync("npm", ["run", script, "--", ...extraArgs], {
    cwd: DASHBOARD,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`npm run ${script} exited ${r.status}`);
}

step("version.json pin", () => {
  const vPath = path.join(REPO_ROOT, "version.json");
  if (!existsSync(vPath)) throw new Error("missing version.json");
  const v = JSON.parse(readFileSync(vPath, "utf8"));
  if (v.version !== "0.9.1") {
    throw new Error(`expected 0.9.1, got ${v.version}`);
  }
});

step("curxor-data-dir production path", () => {
  const p = path.join(DASHBOARD, "lib", "curxor-data-dir.ts");
  if (!existsSync(p)) throw new Error("missing curxor-data-dir.ts");
  const src = readFileSync(p, "utf8");
  if (!src.includes('return "/etc/curxor"')) {
    throw new Error("production path /etc/curxor not found");
  }
});

step("seed-appliance-data.sh", () => {
  const p = path.join(REPO_ROOT, "scripts", "seed-appliance-data.sh");
  if (!existsSync(p)) throw new Error("missing seed script");
});

step("verify-unbox-day.sh", () => {
  const p = path.join(REPO_ROOT, "scripts", "verify-unbox-day.sh");
  if (!existsSync(p)) throw new Error("missing verify-unbox-day.sh");
});

step("typecheck", () => runNpm("typecheck"));
step("production build", () => runNpm("build"));

async function main() {
  const PORT = PORT_ARG ?? (await findFreePort());
  if (!PORT_ARG) {
    console.log(`\n==> Auto-selected free port ${PORT} for qa:local\n`);
  }

  if (!skipQa) {
    step(`qa:local (port ${PORT})`, () => runNpm("qa:local", ["--port", PORT]));
  }

  const logPath = path.join(REPO_ROOT, "docs", "curxor-os", "pre-unbox-gate-log.txt");
  const ts = new Date().toISOString();
  const summary = [
    "",
    `=== pre-unbox gate ${ts} ===`,
    `port: ${PORT}`,
    `result: ${failed ? "FAIL" : "PASS"}`,
    ...steps.map((s) => `  ${s.ok ? "PASS" : "FAIL"}  ${s.name}${s.error ? ` — ${s.error}` : ""}`),
    "",
  ].join("\n");

  appendFileSync(logPath, summary);
  console.log(summary);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
