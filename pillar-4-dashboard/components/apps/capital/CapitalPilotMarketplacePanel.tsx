"use client";

import type { CapitalPilot } from "@/lib/capital-queue-types";

function perfLabel(p: CapitalPilot, key: keyof CapitalPilot["performance"]): string {
  const v = p.performance[key];
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function perfBar(value: number, max = 150): number {
  return Math.min(100, Math.max(4, (Math.abs(value) / max) * 100));
}

interface CapitalPilotMarketplacePanelProps {
  pilots: CapitalPilot[];
  subscribedPilotIds: string[];
  onSubscribe: (pilotId: string, allocationUsd: number) => void;
  onHoldingClick?: (symbol: string) => void;
}

export function CapitalPilotMarketplacePanel({
  pilots,
  subscribedPilotIds,
  onSubscribe,
  onHoldingClick,
}: CapitalPilotMarketplacePanelProps) {
  const featured = pilots.filter((p) => p.featured);
  const rest = pilots.filter((p) => !p.featured);

  const renderCard = (p: CapitalPilot) => {
    const subscribed = subscribedPilotIds.includes(p.id);
    const isDemo = p.description.toLowerCase().includes("demo") || p.name.toLowerCase().includes("demo");
    const lagLabel =
      p.disclosureLagDays != null
        ? `~${p.disclosureLagDays}d avg disclosure lag`
        : p.category === "tracker"
          ? "~45d filing lag"
          : "Daily rebalance demo";

    return (
      <div key={p.id} className="border border-line px-3 py-2 font-mono text-[10px]">
        <div className="flex justify-between gap-2">
          <div>
            <p className="text-cursor-glow">{p.name}</p>
            <p className="text-muted">by {p.author} · {p.category}</p>
          </div>
          <div className="text-right text-cursor-glow">1Y {perfLabel(p, "y1")}</div>
        </div>
        <div className="mt-1 flex flex-wrap gap-1 text-[8px] uppercase">
          {isDemo ? (
            <span className="border border-amber-500/40 px-1 text-amber-300">Demo data</span>
          ) : null}
          {p.feedSource === "live_sec" ? (
            <span className="border border-cursor-glow/40 px-1 text-cursor-glow">Live SEC feed</span>
          ) : null}
          {p.feedSource === "live_quiver" ? (
            <span className="border border-cursor-glow/40 px-1 text-cursor-glow">Live Quiver</span>
          ) : null}
          <span className="border border-line/50 px-1 text-muted">{lagLabel}</span>
        </div>
        {p.recentDisclosures && p.recentDisclosures.length > 0 ? (
          <div className="mt-1 space-y-0.5 text-[9px] text-muted">
            {p.recentDisclosures.slice(0, 3).map((d) => (
              <p key={`${d.ticker}-${d.filedAt}`}>
                {d.politician} · {d.ticker} · traded {new Date(d.tradedAt).toLocaleDateString()} · filed{" "}
                {new Date(d.filedAt).toLocaleDateString()} ({d.lagDays}d lag)
              </p>
            ))}
          </div>
        ) : null}
        {p.feedNote ? <p className="mt-1 text-[9px] text-muted">{p.feedNote}</p> : null}
        <p className="mt-1 text-muted">{p.description}</p>
        <p className="mt-1 text-muted">
          Ref AUM {formatAum(p.referenceAumUsd)} · min ${p.minAllocationUsd}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1 text-[8px] text-muted">
          {(["w1", "m1", "m3", "y1"] as const).map((k) => (
            <div key={k}>
              <span className="uppercase">{k}</span>
              <div className="mt-0.5 h-1 bg-line/40">
                <div
                  className={`h-1 ${p.performance[k] >= 0 ? "bg-cursor-glow" : "bg-red-400"}`}
                  style={{ width: `${perfBar(p.performance[k])}%` }}
                />
              </div>
              <span className={p.performance[k] >= 0 ? "text-cursor-glow" : "text-red-400"}>
                {perfLabel(p, k)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {p.holdings.filter((h) => h.symbol !== "CASH").slice(0, 6).map((h) => (
            <button
              key={h.symbol}
              type="button"
              onClick={() => onHoldingClick?.(h.symbol)}
              className="border border-line/50 px-1 hover:border-cursor-glow/50"
            >
              {h.symbol} {h.weightPct}%
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={subscribed}
          onClick={() => {
            const raw = prompt(`Allocation USD for ${p.name} (min $${p.minAllocationUsd})`, "1000");
            const allocationUsd = raw ? Number.parseFloat(raw) : 0;
            if (allocationUsd >= p.minAllocationUsd) onSubscribe(p.id, allocationUsd);
          }}
          className="mt-2 border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow disabled:opacity-40"
        >
          {subscribed ? "Subscribed" : "Subscribe & sync"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <p className="text-[10px] text-muted">
        Pilot marketplace — choose a strategy, allocate capital, mirror trades in your linked brokerage (Autopilot-style, sovereign on-appliance).
      </p>
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Featured</p>
        <div className="grid gap-2 md:grid-cols-2">{featured.map(renderCard)}</div>
      </div>
      {rest.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted">More pilots</p>
          <div className="grid gap-2 md:grid-cols-2">{rest.map(renderCard)}</div>
        </div>
      ) : null}
    </div>
  );
}

function formatAum(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}
