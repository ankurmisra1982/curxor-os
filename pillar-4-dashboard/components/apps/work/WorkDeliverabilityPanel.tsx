"use client";

import type { WorkDeliverabilitySummary } from "@/lib/work-deliverability";

interface WorkDeliverabilityPanelProps {
  deliverability: WorkDeliverabilitySummary;
  bridgeConfigured: boolean;
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

export function WorkDeliverabilityPanel({ deliverability, bridgeConfigured }: WorkDeliverabilityPanelProps) {
  const d = deliverability;

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
          <p className="text-muted uppercase">Unsubscribe</p>
          <p className="text-stark">
            {d.sequencesWithUnsubscribe} seq with {"{{unsubscribe_url}}"}
          </p>
          <p className="text-muted">{d.unsubscribeTokensActive} lead tokens</p>
        </div>
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
