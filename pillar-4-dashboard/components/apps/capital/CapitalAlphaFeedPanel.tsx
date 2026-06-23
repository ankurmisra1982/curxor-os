"use client";

import { useCallback, useEffect, useState } from "react";

import type { AlphaFeedItem } from "@/lib/capital-alpha-types";

const KIND_LABEL: Record<AlphaFeedItem["kind"], string> = {
  trade_fill: "Fill",
  trade_pending: "Pending",
  pilot_signal: "Pilot",
  pilot_disclosure: "Disclosure",
  mover_spike: "Mover",
  intel_alert: "Alert",
  thesis: "Thesis",
  rule_armed: "Armed",
};

interface CapitalAlphaFeedPanelProps {
  onTickerClick?: (symbol: string) => void;
  onRefresh?: () => void;
  onRunDemoTour?: () => void;
  demoTourRunning?: boolean;
}

export function CapitalAlphaFeedPanel({
  onTickerClick,
  onRefresh,
  onRunDemoTour,
  demoTourRunning,
}: CapitalAlphaFeedPanelProps) {
  const [feed, setFeed] = useState<AlphaFeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "alpha_feed" }),
      });
      const json = (await res.json()) as { feed?: AlphaFeedItem[] };
      if (json.feed) setFeed(json.feed);
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted uppercase tracking-widest">Sovereign alpha feed · local signals only</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="border border-line px-2 py-0.5 text-muted hover:text-stark disabled:opacity-40"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </div>
      {feed.length === 0 ? (
        <div className="space-y-2 border border-line/40 px-3 py-4">
          <p className="text-muted">No feed items yet — sovereign alpha builds from your desk activity.</p>
          {onRunDemoTour ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={demoTourRunning}
                onClick={onRunDemoTour}
                className="border border-cursor-glow px-2 py-1 text-[9px] uppercase text-cursor-glow disabled:opacity-40"
              >
                {demoTourRunning ? "Running tour…" : "Run demo tour"}
              </button>
              <span className="text-[9px] text-muted">Rule → arm → simulated fill · seeds Alpha feed</span>
            </div>
          ) : (
            <p className="text-[9px] text-muted">Arm a rule or subscribe to a pilot to populate the feed.</p>
          )}
        </div>
      ) : (
        feed.map((item) => (
          <div key={item.id} className="border border-line/40 px-2 py-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-[8px] uppercase text-cursor-glow">{KIND_LABEL[item.kind]}</span>
              <span className="text-[8px] text-muted">{new Date(item.at).toLocaleString()}</span>
            </div>
            {item.symbol ? (
              <button
                type="button"
                onClick={() => onTickerClick?.(item.symbol!)}
                className="mt-0.5 text-left text-stark hover:text-cursor-glow"
              >
                {item.title}
              </button>
            ) : (
              <p className="mt-0.5 text-stark">{item.title}</p>
            )}
            <p className="mt-0.5 text-muted line-clamp-2">{item.body}</p>
          </div>
        ))
      )}
    </div>
  );
}
