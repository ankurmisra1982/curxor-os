#!/usr/bin/env node
/**
 * Work Claw outbound sidecar — claims lock, runs process_due + optional IMAP scan via desk API.
 *
 * Usage:
 *   node worker/outbound.mjs [--once] [--loop] [--interval 60] [--base http://127.0.0.1:3080] [--scan-inbox]
 *
 * Env: CURXOR_WORK_QUEUE_PATH, CURXOR_WORK_OUTBOUND_LOCK (see OUTBOUND-WORKER.md)
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD = path.resolve(__dirname, "..");
const DEV_QA = path.join(DASHBOARD, "scripts", "dev-qa");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(DASHBOARD, ".env.local"));
loadEnvFile(path.join(DEV_QA, "digital.env"));

if (!process.env.CURXOR_WORK_QUEUE_PATH) {
  process.env.CURXOR_WORK_QUEUE_PATH = path.join(DEV_QA, "work-queue.json");
}
if (!process.env.CURXOR_WORK_OUTBOUND_LOCK) {
  process.env.CURXOR_WORK_OUTBOUND_LOCK = path.join(
    path.dirname(process.env.CURXOR_WORK_QUEUE_PATH),
    "work-outbound.lock",
  );
}

const args = process.argv.slice(2);
const once = args.includes("--once") || !args.includes("--loop");
const scanInbox = args.includes("--scan-inbox") || process.env.CURXOR_WORK_WORKER_SCAN_INBOX === "1";
const intervalIdx = args.indexOf("--interval");
const INTERVAL_SEC = intervalIdx >= 0 ? Number.parseInt(args[intervalIdx + 1] ?? "60", 10) : 60;
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CURXOR_WORK_WORKER_BASE ?? "http://127.0.0.1:3080");

async function post(action, extra = {}) {
  const res = await fetch(`${BASE}/api/work/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const json = await res.json();
  return { ok: res.ok && json.ok !== false, status: res.status, json };
}

async function tickOnce() {
  const claim = await post("claim_outbound_worker_lock", { workerPid: process.pid });
  if (!claim.ok) {
    console.error("[work-outbound] lock claim failed:", claim.json?.error ?? claim.status);
    return 1;
  }

  try {
    const result = await post("outbound_worker_tick", {
      workerPid: process.pid,
      scanInbox,
    });
    if (!result.ok) {
      console.error("[work-outbound] tick failed:", result.json?.error ?? result.status);
      return 1;
    }
    const j = result.json;
    console.log(
      `[work-outbound] processed=${j.processed ?? 0} finalized=${j.finalizedSends ?? 0} snooze=${j.snoozeReturned ?? 0}` +
        (typeof j.inboxIndexed === "number" ? ` inbox=${j.inboxIndexed}` : ""),
    );
    return 0;
  } finally {
    await post("release_outbound_worker_lock", { workerPid: process.pid });
  }
}

async function main() {
  if (once) {
    const code = await tickOnce();
    process.exit(code);
  }

  console.log(`[work-outbound] loop online · base=${BASE} · interval=${INTERVAL_SEC}s · scanInbox=${scanInbox}`);
  await post("ensure_outbound_heartbeat_job").catch(() => undefined);

  for (;;) {
    const code = await tickOnce();
    if (code !== 0) {
      console.error(`[work-outbound] tick exited ${code} — retrying in ${INTERVAL_SEC}s`);
    }
    await new Promise((r) => setTimeout(r, Math.max(15, INTERVAL_SEC) * 1000));
  }
}

main().catch((err) => {
  console.error("[work-outbound] fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
