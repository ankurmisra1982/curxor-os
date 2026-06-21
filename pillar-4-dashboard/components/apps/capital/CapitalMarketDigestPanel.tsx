"use client";

import { useCallback, useEffect, useState } from "react";

import { useExperienceLevel } from "@/components/ui/UiModeProvider";
import type { CapitalIntelSnapshot, MarketDigestItem } from "@/lib/capital-intel-types";

function sentimentDot(s: string): string {
  if (s === "bullish") return "bg-emerald-400";
  if (s === "bearish") return "bg-red-400";
  return "bg-muted";
}

interface CapitalMarketDigestPanelProps {
  onTickerClick?: (ticker: string) => void;
}

export function CapitalMarketDigestPanel({ onTickerClick }: CapitalMarketDigestPanelProps) {
  const { meetsLevel } = useExperienceLevel();
  const showExpert = meetsLevel("expert");

  const [digest, setDigest] = useState<CapitalIntelSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const url = `/api/capital/intel${refresh ? "?refresh=1" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as { digest?: CapitalIntelSnapshot };
      if (json.digest) setDigest(json.digest);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const items = digest?.digest ?? [];
  const visible = showExpert ? items : items.slice(0, 12);

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted">
          Smart digest · CNBC · WSB · Reddit · FinTwit
          {digest?.updatedAt ? ` · ${new Date(digest.updatedAt).toLocaleTimeString()}` : ""}
          {showExpert && digest?.featuredTickers.length
            ? ` · watchlist: ${digest.featuredTickers.join(", ")}`
            : null}
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(true)}
          className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
        >
          Refresh
        </button>
      </div>
      {!visible.length ? (
        <p className="text-[11px] text-muted">{loading ? "Pulling market news…" : "No digest yet"}</p>
      ) : (
        visible.map((item: MarketDigestItem) => (
          <div key={item.id} className="flex gap-2 border-b border-line/40 py-2">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${sentimentDot(item.sentiment)}`} />
            <div className="min-w-0 flex-1">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="text-stark hover:text-cursor-glow">
                  {item.headline}
                </a>
              ) : (
                <p className="text-stark">{item.headline}</p>
              )}
              <p className="text-[9px] text-muted">
                {item.source}
                {showExpert && item.publishedAt
                  ? ` · ${new Date(item.publishedAt).toLocaleString()}`
                  : null}
                {showExpert ? ` · ${item.sentiment}` : null}
                {item.tickers.length > 0 ? (
                  <>
                    {" · "}
                    {item.tickers.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onTickerClick?.(t)}
                        className="mr-1 text-cursor-glow hover:underline"
                      >
                        ${t}
                      </button>
                    ))}
                  </>
                ) : null}
              </p>
            </div>
          </div>
        ))
      )}
      {!showExpert && items.length > 12 ? (
        <p className="text-[9px] text-muted">Showing 12 of {items.length} — switch to Expert for full feed</p>
      ) : null}
    </div>
  );
}
