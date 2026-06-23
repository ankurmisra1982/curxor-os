#!/usr/bin/env node
/**
 * One-command local QA: start production server with dev-qa env, run smoke, stop.
 *
 * Usage:
 *   node scripts/qa-local.mjs [--rebuild] [--port 3080]
 */
import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import { existsSync, rmSync } from "node:fs";
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
  CURXOR_HUMANOID_HUB_PATH: path.join(DEV_QA, "humanoid-hub.json"),
  CURXOR_VITAL_STATE_PATH: path.join(DEV_QA, "vital-health.json"),
  CURXOR_CONTENT_QUEUE_PATH: path.join(DEV_QA, "content-queue.json"),
  CURXOR_WORK_QUEUE_PATH: path.join(DEV_QA, "work-queue.json"),
  CURXOR_WORK_OUTBOUND_LOCK: path.join(DEV_QA, "work-outbound.lock"),
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
  CURXOR_FORGED_APPS_PATH: path.join(DEV_QA, "forged-apps.json"),
  CURXOR_SCHEDULER_PATH: path.join(DEV_QA, "scheduler", "jobs.json"),
  CURXOR_CHANNELS_PATH: path.join(DEV_QA, "channels"),
  CURXOR_CCP_CONSENT_PATH: path.join(DEV_QA, "ccp-consent.json"),
  CURXOR_GARMIN_OAUTH_PATH: path.join(DEV_QA, "garmin-oauth.json"),
  CURXOR_CONTENT_AUDIT_PATH: path.join(DEV_QA, "content-audit.json"),
  CURXOR_BRIDGE_HEALTH_PATH: path.join(DEV_QA, "content-bridge-health.json"),
  CURXOR_CONTENT_OPS_PATH: path.join(DEV_QA, "content-ops.json"),
  CURXOR_COMMERCE_SHOPIFY_PATH: path.join(DEV_QA, "commerce-shopify.json"),
  CURXOR_COMMERCE_EBAY_PATH: path.join(DEV_QA, "commerce-ebay.json"),
  CURXOR_COMMERCE_PRINTIFY_PATH: path.join(DEV_QA, "commerce-printify.json"),
  CURXOR_SHOP_SYNC_PATH: path.join(DEV_QA, "shop-sync.json"),
  CURXOR_SHOPIFY_MOCK: "1",
  CURXOR_EBAY_MOCK: "1",
  CURXOR_PRINTIFY_MOCK: "1",
  CURXOR_DEV_QA_DIR: DEV_QA,
  CURXOR_MESH_BROKER_IP: "127.0.0.1",
  PORT,
  HOSTNAME: "127.0.0.1",
};

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const isNode = cmd === "node";
    const executable = isNode ? process.execPath : cmd;
    const argv = isNode
      ? cmdArgs.map((a) => (a.startsWith("scripts/") ? path.join(DASHBOARD, a) : a))
      : cmdArgs;
    const useShell = process.platform === "win32" && !isNode;
    const child = spawn(executable, argv, {
      cwd: DASHBOARD,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: useShell,
      windowsHide: true,
      ...opts,
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
    child.on("error", reject);
    child.on("exit", (code) => {
      child.stdout?.destroy();
      child.stderr?.destroy();
      const done = () => resolve(code ?? 1);
      if (process.platform === "win32") setTimeout(done, 250);
      else done();
    });
  });
}

function runSyncNode(script, scriptArgs = []) {
  execFileSync(
    process.execPath,
    [path.join(DASHBOARD, script), ...scriptArgs],
    { cwd: DASHBOARD, env, stdio: "inherit", windowsHide: true },
  );
}

function runNode(script, scriptArgs = []) {
  if (process.platform === "win32") {
    try {
      runSyncNode(script, scriptArgs);
      return Promise.resolve(0);
    } catch (err) {
      return Promise.resolve(typeof err.status === "number" ? err.status : 1);
    }
  }
  return run("node", [script, ...scriptArgs]);
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

async function waitForServer(timeoutMs = 180_000) {
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

  const buildId = path.join(DASHBOARD, ".next", "BUILD_ID");
  if (rebuild) {
    console.log("==> Clean rebuild (.next)\n");
    rmSync(path.join(DASHBOARD, ".next"), { recursive: true, force: true });
  }

  if (rebuild || !existsSync(buildId)) {
    console.log("==> Building production bundle (same as CI pillar-4-qa-smoke)\n");
    const prepCode = await runNode("scripts/ci-prepare-qa.mjs");
    if (prepCode !== 0) process.exit(prepCode);
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
  const server = spawn(
    npmCmd,
    ["next", "start", "--hostname", "127.0.0.1", "--port", PORT],
    {
      cwd: DASHBOARD,
      env,
      stdio: "ignore",
      shell: process.platform === "win32",
    },
  );

  let exitCode = 1;
  try {
    await waitForServer();
    exitCode = await runNode("scripts/qa-local-suites.mjs", [BASE]);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    exitCode = 1;
  } finally {
    if (server?.pid) {
      if (process.platform === "win32") {
        try {
          server.kill("SIGTERM");
          await new Promise((r) => setTimeout(r, 2000));
        } catch {
          /* process may already be gone */
        }
        spawn("taskkill", ["/pid", String(server.pid), "/f", "/t"], {
          shell: true,
          stdio: "ignore",
          detached: true,
        });
        await new Promise((r) => setTimeout(r, 500));
      } else {
        server.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  console.log(exitCode === 0 ? "\n==> QA local passed\n" : "\n==> QA local failed\n");
  if (exitCode !== 0) process.exitCode = exitCode;
}

main();
