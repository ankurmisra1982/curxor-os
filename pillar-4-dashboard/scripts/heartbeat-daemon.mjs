#!/usr/bin/env node
/**
 * CurXor heartbeat scheduler daemon — polls /api/scheduler run_due on interval.
 * Usage: node scripts/heartbeat-daemon.mjs [baseUrl] [intervalSeconds]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";
const INTERVAL_SEC = Number.parseInt(process.argv[3] ?? "60", 10);

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/scheduler`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_due" }),
    });
    const json = (await res.json()) as { results?: unknown[]; ok?: boolean };
    const count = Array.isArray(json.results) ? json.results.length : 0;
    if (count > 0) {
      console.log(`[heartbeat] ran ${count} job(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] tick failed:", err instanceof Error ? err.message : String(err));
  }
}

console.log(`[heartbeat] daemon online · base=${BASE} · interval=${INTERVAL_SEC}s`);
void tick();
setInterval(tick, Math.max(15, INTERVAL_SEC) * 1000);
