"use client";

import { useCallback, useEffect, useState } from "react";

import type { IntelAlertRule } from "@/lib/capital-intel-types";

interface CapitalIntelAlertsPanelProps {
  symbol?: string | null;
  onChanged?: () => void;
}

export function CapitalIntelAlertsPanel({ symbol, onChanged }: CapitalIntelAlertsPanelProps) {
  const [alerts, setAlerts] = useState<IntelAlertRule[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/capital/intel?meta=1", { cache: "no-store" });
    const json = (await res.json()) as { alerts?: IntelAlertRule[] };
    if (json.alerts) setAlerts(json.alerts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [keyword, setKeyword] = useState("");

  const addKeywordAlert = async () => {
    const sym = symbol?.trim().toUpperCase();
    const kw = keyword.trim();
    if (!sym || !kw) return;
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_alert", ticker: sym, kind: "headline_keyword", keyword: kw }),
      });
      if (!res.ok) return;
      setKeyword("");
      await load();
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const addAlert = async (kind: IntelAlertRule["kind"]) => {
    const sym = symbol?.trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_alert", ticker: sym, kind, thresholdPct: 5 }),
      });
      if (!res.ok) return;
      await load();
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

  const removeAlert = async (id: string) => {
    const res = await fetch("/api/capital/intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_alert", alertId: id }),
    });
    if (!res.ok) return;
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">Intel alerts · Telegram/Slack when matched</p>
      {symbol ? (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => void addAlert("price_drop_pct")}
            className="border border-line px-2 py-0.5 text-muted hover:text-stark"
          >
            Alert −5% dip · {symbol}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void addAlert("sentiment_bearish")}
            className="border border-line px-2 py-0.5 text-muted hover:text-stark"
          >
            Alert bearish chatter
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void addAlert("sentiment_bullish")}
            className="border border-line px-2 py-0.5 text-muted hover:text-stark"
          >
            Alert bullish chatter
          </button>
        </div>
      ) : null}
      {symbol ? (
        <div className="flex flex-wrap gap-1">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword — earnings, FDA, merger…"
            className="min-w-[160px] flex-1 border border-line bg-transparent px-2 py-0.5 text-stark outline-none focus:border-cursor-glow"
          />
          <button
            type="button"
            disabled={loading || !keyword.trim()}
            onClick={() => void addKeywordAlert()}
            className="border border-line px-2 py-0.5 text-muted hover:text-stark disabled:opacity-40"
          >
            Alert keyword
          </button>
        </div>
      ) : null}
      {alerts.length === 0 ? (
        <p className="text-muted">No alerts — research a ticker to add one</p>
      ) : (
        alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-line/30 py-1">
            <span className="text-stark">
              {a.symbol} · {a.kind.replace(/_/g, " ")}
              {a.keyword ? ` · "${a.keyword}"` : ""}
              {a.lastFiredAt ? ` · last ${new Date(a.lastFiredAt).toLocaleDateString()}` : ""}
            </span>
            <button type="button" onClick={() => void removeAlert(a.id)} className="text-red-400 hover:underline">
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
}
