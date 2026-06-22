#!/usr/bin/env node
/**
 * One-command local QA: start production server with dev-qa env, run smoke, stop.
 *
 * Usage:
 *   node scripts/qa-local.mjs [--rebuild] [--port 3080]
 */
import { spawn } from "node:child_process";
import net from "node:net";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const DEV_QA = path.join(DASHBOARD, "scripts", "dev-qa");

const args = process.argv.slice(2);
const rebuild = args.includes("--rebuild");
const portIdx = args.indexOf("--port");
const PORT = portIdx >= 0 ? args[portIdx + 1] : (process.env.CURXOR_QA_PORT ?? "3080");
const BASE = `http://127.0.0.1:${PORT}`;

const env = {
  ...process.env,
  CURXOR_FRE_STATE_PATH: path.join(DEV_QA, "fre-state.json"),
  CURXOR_USER_SETTINGS_PATH: path.join(DEV_QA, "user-settings.json"),
  CURXOR_LLM_CREDENTIALS_PATH: path.join(DEV_QA, "llm-credentials.json"),
  CURXOR_CLAW_CONTEXT_PATH: path.join(DEV_QA, "claw-context.json"),
  CURXOR_FAMILY_PROFILES_PATH: path.join(DEV_QA, "family-profiles.json"),
  CURXOR_VITAL_STATE_PATH: path.join(DEV_QA, "vital-health.json"),
  CURXOR_CONTENT_QUEUE_PATH: path.join(DEV_QA, "content-queue.json"),
  CURXOR_WORK_QUEUE_PATH: path.join(DEV_QA, "work-queue.json"),
  CURXOR_CAPITAL_QUEUE_PATH: path.join(DEV_QA, "capital-queue.json"),
  CURXOR_CAPITAL_PFM_PATH: path.join(DEV_QA, "capital-pfm.json"),
  CURXOR_CAPITAL_INTEL_PATH: path.join(DEV_QA, "capital-intel.json"),
  CURXOR_CAPITAL_PLAID_PATH: path.join(DEV_QA, "capital-plaid.json"),
  CURXOR_CAPITAL_SNAPTRADE_PATH: path.join(DEV_QA, "capital-snaptrade.json"),
  CURXOR_DIGITAL_ENV_PATH: path.join(DEV_QA, "digital.env"),
  CURXOR_PROVIDER_LINK_SESSIONS_PATH: path.join(DEV_QA, "provider-link-sessions.json"),
  CURXOR_CLAW_PROFILES_PATH: path.join(DEV_QA, "claw-profiles.json"),
  CURXOR_APP_FRE_DIR: path.join(DEV_QA, "app-fre"),
  CURXOR_AGENT_WORKSPACE_PATH: path.join(DEV_QA, "agent-workspace"),
  CURXOR_SCHEDULER_PATH: path.join(DEV_QA, "scheduler", "jobs.json"),
  CURXOR_CHANNELS_PATH: path.join(DEV_QA, "channels"),
  CURXOR_CCP_CONSENT_PATH: path.join(DEV_QA, "ccp-consent.json"),
  CURXOR_GARMIN_OAUTH_PATH: path.join(DEV_QA, "garmin-oauth.json"),
  CURXOR_CONTENT_AUDIT_PATH: path.join(DEV_QA, "content-audit.json"),
  CURXOR_BRIDGE_HEALTH_PATH: path.join(DEV_QA, "content-bridge-health.json"),
  CURXOR_CONTENT_OPS_PATH: path.join(DEV_QA, "content-ops.json"),
  CURXOR_MESH_BROKER_IP: "127.0.0.1",
  PORT,
  HOSTNAME: "127.0.0.1",
};

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: DASHBOARD,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${port} is already in use. Stop the other process or rerun with --port ${Number(port) + 1}`,
          ),
        );
        return;
      }
      reject(err);
    });
    probe.once("listening", () => probe.close(resolve));
    probe.listen(Number(port), "127.0.0.1");
  });
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/setup/status`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data === "object" && data.initialized === true) {
        console.log(`\n==> Server ready · ${BASE}\n`);
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${BASE}`);
}

async function main() {
  console.log(`==> CurXor local QA · port=${PORT}\n`);

  if (rebuild) {
    console.log("==> Clean rebuild (.next)\n");
    rmSync(path.join(DASHBOARD, ".next"), { recursive: true, force: true });
    const buildCode = await run("npm", ["run", "build"]);
    if (buildCode !== 0) process.exit(buildCode);
  }

  try {
    await assertPortFree(PORT);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const npmCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  // Dev server — reliable for API smoke on Windows; CI uses production `next start` on Linux.
  const server = spawn(
    npmCmd,
    ["next", "dev", "--hostname", "127.0.0.1", "--port", PORT],
    {
      cwd: DASHBOARD,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );

  server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(chunk);
    if (text.includes("EADDRINUSE")) {
      console.error(`\nPort ${PORT} is already in use. Try: npm run qa:local -- --port ${Number(PORT) + 1}\n`);
    }
  });

  let exitCode = 1;
  try {
    await waitForServer();
    exitCode = await run("node", ["scripts/qa-smoke.mjs", BASE]);
    if (exitCode === 0) {
      const capitalExit = await run("node", ["scripts/capital-checklist.mjs", BASE]);
      if (capitalExit !== 0) exitCode = capitalExit;
    }
    if (exitCode === 0) {
      const creatorExit = await run("node", ["scripts/creator-checklist.mjs", BASE]);
      if (creatorExit !== 0) exitCode = creatorExit;
    }
    if (exitCode === 0) {
      const workExit = await run("node", ["scripts/work-checklist.mjs", BASE]);
      if (workExit !== 0) exitCode = workExit;
    }
    if (exitCode === 0) {
      const scaffoldExit = await run("node", ["scripts/verify-exit-demo-scaffold.mjs", BASE]);
      if (scaffoldExit !== 0) exitCode = scaffoldExit;
    }
    if (exitCode === 0) {
      const workScaffoldExit = await run("node", ["scripts/verify-work-exit-demo-scaffold.mjs", BASE]);
      if (workScaffoldExit !== 0) exitCode = workScaffoldExit;
    }
    if (exitCode === 0) {
      const flowExit = await run("node", ["scripts/qa-user-flows.mjs", BASE]);
      if (flowExit !== 0) exitCode = flowExit;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    exitCode = 1;
  } finally {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(server.pid), "/f", "/t"], { shell: true, stdio: "ignore" });
    } else {
      server.kill("SIGTERM");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(exitCode === 0 ? "\n==> QA local passed\n" : "\n==> QA local failed\n");
  process.exit(exitCode);
}

main();
