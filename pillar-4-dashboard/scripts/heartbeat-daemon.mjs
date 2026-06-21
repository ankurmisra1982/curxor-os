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
      console.log(`[heartbeat] ran ${count} scheduler job(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] scheduler tick failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const jobRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "jobs_worker" }),
    });
    const jobJson = (await jobRes.json()) as { processed?: unknown[] };
    const jobCount = Array.isArray(jobJson.processed) ? jobJson.processed.length : 0;
    if (jobCount > 0) {
      console.log(`[heartbeat] processed ${jobCount} content job(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] content jobs tick failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const replyRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replies_worker", limit: 4 }),
    });
    const replyJson = (await replyRes.json()) as { processed?: unknown[] };
    const replyCount = Array.isArray(replyJson.processed) ? replyJson.processed.length : 0;
    if (replyCount > 0) {
      console.log(`[heartbeat] processed ${replyCount} reply job(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] reply worker tick failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const metricsRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "metrics_scheduled_pull" }),
    });
    const metricsJson = (await metricsRes.json()) as {
      ran?: boolean;
      results?: unknown[];
      rules?: { results?: Array<{ ok: boolean; skipped?: boolean }> };
    };
    if (metricsJson.ran) {
      const n = Array.isArray(metricsJson.results) ? metricsJson.results.length : 0;
      console.log(`[heartbeat] metrics pull ran (${n} post(s))`);
      const fired = (metricsJson.rules?.results ?? []).filter((x) => x.ok && !x.skipped).length;
      if (fired > 0) {
        console.log(`[heartbeat] metrics rules applied ${fired} action(s)`);
      }
    }
  } catch (err) {
    console.error("[heartbeat] metrics pull tick failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const socialRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "social_engage_poll" }),
    });
    const socialJson = (await socialRes.json()) as { ran?: boolean; totalIngested?: number };
    if (socialJson.ran && (socialJson.totalIngested ?? 0) > 0) {
      console.log(`[heartbeat] social engage ingested ${socialJson.totalIngested} comment(s)/mention(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] social engage poll failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const digestRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ops_digest" }),
    });
    const digestJson = (await digestRes.json()) as { sent?: boolean };
    if (digestJson.sent) {
      console.log("[heartbeat] weekly ops digest sent");
    }
  } catch (err) {
    console.error("[heartbeat] ops digest failed:", err instanceof Error ? err.message : String(err));
  }

  try {
    const evergreenRes = await fetch(`${BASE}/api/content/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evergreen_recycle" }),
    });
    const evergreenJson = (await evergreenRes.json()) as { results?: unknown[] };
    const recycled = Array.isArray(evergreenJson.results) ? evergreenJson.results.length : 0;
    if (recycled > 0) {
      console.log(`[heartbeat] evergreen recycled ${recycled} post(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] evergreen recycle failed:", err instanceof Error ? err.message : String(err));
  }
}

console.log(`[heartbeat] daemon online · base=${BASE} · interval=${INTERVAL_SEC}s`);
void tick();
setInterval(tick, Math.max(15, INTERVAL_SEC) * 1000);
