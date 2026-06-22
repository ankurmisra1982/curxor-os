"use client";

import { useCallback, useEffect, useState } from "react";

import type { IntelAlertPreferences, IntelAlertRule } from "@/lib/capital-intel-types";

interface CapitalIntelAlertsPanelProps {
  symbol?: string | null;
  onChanged?: () => void;
}

export function CapitalIntelAlertsPanel({ symbol, onChanged }: CapitalIntelAlertsPanelProps) {
  const [alerts, setAlerts] = useState<IntelAlertRule[]>([]);
  const [preferences, setPreferences] = useState<IntelAlertPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/capital/intel?meta=1", { cache: "no-store" });
    const json = (await res.json()) as { alerts?: IntelAlertRule[]; preferences?: IntelAlertPreferences };
    if (json.alerts) setAlerts(json.alerts);
    if (json.preferences) setPreferences(json.preferences);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [keyword, setKeyword] = useState("");

  const savePreferences = async (patch: Partial<IntelAlertPreferences>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_alert_preferences", preferences: patch }),
      });
      const json = (await res.json()) as { preferences?: IntelAlertPreferences };
      if (json.preferences) setPreferences(json.preferences);
      onChanged?.();
    } finally {
      setLoading(false);
    }
  };

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

  const addAlert = async (kind: IntelAlertRule["kind"], extra?: Record<string, unknown>) => {
    const sym = symbol?.trim().toUpperCase();
    if (!sym && kind !== "pilot_signal") return;
    setLoading(true);
    try {
      const res = await fetch("/api/capital/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_alert",
          ticker: kind === "pilot_signal" ? "*" : sym,
          kind,
          thresholdPct: 5,
          ...extra,
        }),
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

  const prefs = preferences ?? {
    notifyPilotSignals: true,
    minPilotNotionalUsd: 500,
    notifyMoverSpikes: true,
    moverSpikePct: 3,
    notifyIntelFires: true,
  };

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">Intel alerts · Telegram/Slack when matched</p>

      <div className="border border-line/40 p-2 space-y-2">
        <p className="text-[9px] uppercase text-muted">Feed notification filters</p>
        <label className="flex items-center gap-2 text-stark">
          <input
            type="checkbox"
            checked={prefs.notifyMoverSpikes}
            onChange={(e) => void savePreferences({ notifyMoverSpikes: e.target.checked })}
          />
          Mover spikes on watchlist
        </label>
        <label className="flex items-center gap-2 text-stark">
          <input
            type="checkbox"
            checked={prefs.notifyPilotSignals}
            onChange={(e) => void savePreferences({ notifyPilotSignals: e.target.checked })}
          />
          Pilot signals (min $
          <input
            type="number"
            value={prefs.minPilotNotionalUsd}
            onChange={(e) =>
              void savePreferences({ minPilotNotionalUsd: Number.parseFloat(e.target.value) || 500 })
            }
            className="w-16 border border-line bg-transparent px-1 text-stark"
          />
          )
        </label>
        <label className="flex items-center gap-2 text-stark">
          <span className="text-muted">Mover threshold %</span>
          <input
            type="number"
            value={prefs.moverSpikePct}
            onChange={(e) => void savePreferences({ moverSpikePct: Number.parseFloat(e.target.value) || 3 })}
            className="w-12 border border-line bg-transparent px-1 text-stark"
          />
        </label>
      </div>

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
          <button
            type="button"
            disabled={loading}
            onClick={() => void addAlert("mover_spike", { thresholdPct: prefs.moverSpikePct })}
            className="border border-line px-2 py-0.5 text-muted hover:text-stark"
          >
            Alert mover spike
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => void addAlert("pilot_signal", { minNotionalUsd: prefs.minPilotNotionalUsd })}
          className="border border-line px-2 py-0.5 text-muted hover:text-stark"
        >
          Alert pilot signals (all tickers)
        </button>
      </div>

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
              {a.minNotionalUsd != null ? ` · min $${a.minNotionalUsd}` : ""}
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
