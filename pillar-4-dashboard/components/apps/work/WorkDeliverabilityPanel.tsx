"use client";

import type { WorkDeliverabilitySummary } from "@/lib/work-deliverability";

interface SuppressionRow {
  email: string;
  reason: string;
  at: string;
  source: "bounce" | "failed" | "manual";
}

interface WorkDeliverabilityPanelProps {
  deliverability: WorkDeliverabilitySummary;
  bridgeConfigured: boolean;
  sendsToday?: number;
  effectiveDailyLimit?: number;
  suppressed?: SuppressionRow[];
  onUnblock?: (email: string) => void;
  unblockBusy?: boolean;
}

function healthClass(health: WorkDeliverabilitySummary["domainHealth"]): string {
  if (health === "healthy") return "text-cursor-glow";
  if (health === "warning") return "text-amber-400";
  return "text-muted";
}

function repClass(label: WorkDeliverabilitySummary["reputationLabel"]): string {
  if (label === "excellent" || label === "good") return "text-cursor-glow";
  if (label === "fair") return "text-stark";
  return "text-red-400";
}

export function WorkDeliverabilityPanel({
  deliverability,
  bridgeConfigured,
  sendsToday,
  effectiveDailyLimit,
  suppressed = [],
  onUnblock,
  unblockBusy,
}: WorkDeliverabilityPanelProps) {
  const d = deliverability;
  const todaySent = sendsToday ?? d.sendsToday ?? 0;
  const todayCap = d.warmupChart.find((row) => row.isToday)?.cap ?? effectiveDailyLimit ?? d.warmupDailyCap ?? 50;
  const chartMax = Math.max(todayCap, ...d.warmupChart.map((row) => Math.max(row.cap, row.sent)), 1);

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Domain health</p>
          <p className={`uppercase ${healthClass(d.domainHealth)}`}>{d.domainHealth}</p>
          <p className="mt-0.5 text-muted">{d.domain ?? "—"}</p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Send reputation</p>
          <p className={`${repClass(d.reputationLabel)}`}>
            {d.reputationScore}/100 · {d.reputationLabel.replace("_", " ")}
          </p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Failures</p>
          <p className="text-stark">
            {d.failedSendCount} failed · {d.bounceLikeCount} bounce-like
          </p>
        </div>
        <div className="border border-line/60 px-2 py-1.5">
          <p className="text-muted uppercase">Today</p>
          <p className="text-stark">
            {todaySent} sent · cap {todayCap}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 uppercase tracking-widest text-muted">14-day warmup ramp</p>
        <div className="flex items-end gap-1 overflow-x-auto pb-1">
          {d.warmupChart.map((row) => (
            <div key={row.label} className="flex min-w-[28px] flex-col items-center gap-1">
              <div className="relative flex h-16 w-5 flex-col justify-end border border-line/40 bg-panel/30">
                <div
                  className="w-full bg-line/40"
                  style={{ height: `${Math.round((row.cap / chartMax) * 100)}%` }}
                  title={`Cap ${row.cap}`}
                />
                <div
                  className={`absolute bottom-0 w-full ${row.isToday ? "bg-cursor-glow" : "bg-stark/70"}`}
                  style={{ height: `${Math.round((row.sent / chartMax) * 100)}%` }}
                  title={`Sent ${row.sent}`}
                />
              </div>
              <span className={`text-[8px] ${row.isToday ? "text-cursor-glow" : "text-muted"}`}>{row.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-muted">Bars: sent (solid) vs daily cap (track) · today highlighted</p>
      </div>

      <p className="text-muted">{d.domainHealthDetail}</p>
      {!bridgeConfigured ? (
        <p className="border border-cursor-glow/30 bg-cursor-glow/5 px-2 py-1 text-muted">
          Demo mode — reputation and domain chips use local send history; live DNS checks ship with SMTP bridge.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <span className="border border-line px-2 py-0.5 text-muted">SPF · {d.spfStatus}</span>
        <span className="border border-line px-2 py-0.5 text-muted">DKIM · {d.dkimStatus}</span>
        <span className="border border-line px-2 py-0.5 text-muted">DMARC · {d.dmarcStatus ?? "unknown"}</span>
        {d.warmupMode ? (
          <span className="border border-amber-400/50 px-2 py-0.5 text-amber-400">
            Warmup · {d.warmupDailyCap ?? 15}/day cap
          </span>
        ) : null}
        {d.fromAddress ? <span className="border border-line px-2 py-0.5 text-stark">From · {d.fromAddress}</span> : null}
      </div>

      {d.dns?.recommendations?.length ? (
        <ul className="space-y-0.5 text-muted">
          {d.dns.recommendations.slice(0, 3).map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="mb-1 uppercase tracking-widest text-muted">Suppression list</p>
        {suppressed.length === 0 ? (
          <p className="text-muted">No suppressed addresses — bounces from scan_inbox auto-add here.</p>
        ) : (
          <ul className="space-y-1">
            {suppressed.map((row) => (
              <li key={row.email} className="flex flex-wrap items-center justify-between gap-2 border border-line/60 px-2 py-1">
                <div>
                  <span className="text-stark">{row.email}</span>
                  <span className="ml-2 text-muted">{row.source}</span>
                  <p className="text-muted">{row.reason}</p>
                </div>
                {onUnblock ? (
                  <button
                    type="button"
                    disabled={unblockBusy}
                    onClick={() => onUnblock(row.email)}
                    className="border border-line px-1.5 py-0.5 uppercase text-muted hover:text-stark disabled:opacity-40"
                  >
                    Unblock
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {d.recentFailures.length > 0 ? (
        <div>
          <p className="mb-1 uppercase tracking-widest text-muted">Recent failures</p>
          <ul className="space-y-1">
            {d.recentFailures.map((f) => (
              <li key={f.sendId} className="border border-red-400/30 px-2 py-1">
                <span className="text-stark">{f.subject}</span>
                <span className="ml-2 text-muted">{f.to}</span>
                <p className="text-red-400">{f.error}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
