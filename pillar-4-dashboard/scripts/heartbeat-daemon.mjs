#!/usr/bin/env node
/**
 * CurXor heartbeat scheduler daemon — polls /api/scheduler run_due on interval.
 * Usage: node scripts/heartbeat-daemon.mjs [baseUrl] [intervalSeconds]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";
const INTERVAL_SEC = Number.parseInt(process.argv[3] ?? "60", 10);

async function tick() {
  try {
    const workRes = await fetch(`${BASE}/api/work/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process_due" }),
    });
    const workJson = (await workRes.json()) as { processed?: number };
    if ((workJson.processed ?? 0) > 0) {
      console.log(`[heartbeat] outreach processed ${workJson.processed} due sequence step(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] outreach process_due failed:", err instanceof Error ? err.message : String(err));
  }

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
    const capitalRes = await fetch(`${BASE}/api/capital/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh_quotes" }),
    });
    await capitalRes.json();
    const evalRes = await fetch(`${BASE}/api/capital/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evaluate_rules" }),
    });
    const evalJson = (await evalRes.json()) as { fired?: number };
    if ((evalJson.fired ?? 0) > 0) {
      console.log(`[heartbeat] capital fired ${evalJson.fired} rule trade(s)`);
    }
    const pilotRes = await fetch(`${BASE}/api/capital/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_pilot_subscriptions" }),
    });
    const pilotJson = (await pilotRes.json()) as { trades?: number };
    if ((pilotJson.trades ?? 0) > 0) {
      console.log(`[heartbeat] capital pilot sync placed ${pilotJson.trades} trade(s)`);
    }
    const intelRes = await fetch(`${BASE}/api/capital/intel?refresh=1`, { cache: "no-store" });
    const intelJson = (await intelRes.json()) as { digest?: { digest?: unknown[] } };
    const digestCount = Array.isArray(intelJson.digest?.digest) ? intelJson.digest.digest.length : 0;
    if (digestCount > 0) {
      console.log(`[heartbeat] capital intel digest refreshed (${digestCount} item(s))`);
    }
    const hourKey = new Date().toISOString().slice(0, 13);
    if (globalThis.__curxorPilotFeedHour !== hourKey) {
      globalThis.__curxorPilotFeedHour = hourKey;
      const feedRes = await fetch(`${BASE}/api/capital/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_pilot_feeds" }),
      });
      const feedJson = (await feedRes.json()) as { updated?: string[] };
      if ((feedJson.updated ?? []).length > 0) {
        console.log(`[heartbeat] pilot SEC feeds refreshed: ${feedJson.updated?.join(", ")}`);
      }
    }
    const alertRes = await fetch(`${BASE}/api/capital/intel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evaluate_alerts" }),
    });
    const alertJson = (await alertRes.json()) as { fired?: number };
    if ((alertJson.fired ?? 0) > 0) {
      console.log(`[heartbeat] capital intel fired ${alertJson.fired} alert(s)`);
    }
    const pfmHourKey = new Date().toISOString().slice(0, 13);
    if (globalThis.__curxorPfmRefreshHour !== pfmHourKey) {
      globalThis.__curxorPfmRefreshHour = pfmHourKey;
      const pfmRes = await fetch(`${BASE}/api/capital/pfm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const pfmJson = (await pfmRes.json()) as { ok?: boolean; snapshot?: { updatedAt?: string } };
      if (pfmJson.ok && pfmJson.snapshot?.updatedAt) {
        console.log(`[heartbeat] capital PFM refreshed (${pfmJson.snapshot.updatedAt})`);
      }
    }
    const deskRes = await fetch(`${BASE}/api/capital/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "desk_health_alerts" }),
    });
    const deskJson = (await deskRes.json()) as { alerts?: Array<{ title: string; severity: string }>; notified?: number };
    const critical = (deskJson.alerts ?? []).filter((a) => a.severity === "critical" || a.severity === "warning");
    if (critical.length > 0) {
      console.log(`[heartbeat] capital desk alerts: ${critical.map((a) => a.title).join("; ")}`);
    }
    if ((deskJson.notified ?? 0) > 0) {
      console.log(`[heartbeat] capital resent ${deskJson.notified} pending approval nudge(s)`);
    }
  } catch (err) {
    console.error("[heartbeat] capital rules failed:", err instanceof Error ? err.message : String(err));
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
