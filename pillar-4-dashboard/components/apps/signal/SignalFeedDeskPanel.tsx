"use client";

import { useCallback, useEffect, useState } from "react";

export interface UnifiedSignalRow {
  id: string;
  domain: "outreach" | "content";
  sourceId: string;
  title: string;
  summary: string;
  source: string;
  score: number;
  urgency: string;
  intent?: string;
  receivedAt: string;
}

interface SignalFeedDeskPanelProps {
  onStatus?: (message: string) => void;
}

export function SignalFeedDeskPanel({ onStatus }: SignalFeedDeskPanelProps) {
  const [signals, setSignals] = useState<UnifiedSignalRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestDomain, setIngestDomain] = useState<"outreach" | "content">("outreach");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/signal/status", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { signals?: UnifiedSignalRow[] };
    setSignals(json.signals ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/signal/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        signals?: UnifiedSignalRow[];
        leadId?: string;
        sequenceId?: string;
        draft?: { postId: string };
      };
      if (json.signals) setSignals(json.signals);
      if (!json.ok) {
        onStatus?.(json.error ?? "Action failed");
        return;
      }
      if (body.action === "dispatch_outreach") {
        onStatus?.(`Lead ${json.leadId} · sequence ${json.sequenceId}`);
      } else if (body.action === "dispatch_content") {
        onStatus?.(`Reactive draft queued · post ${json.draft?.postId ?? "—"}`);
      } else if (body.action === "ingest") {
        onStatus?.("Signal ingested locally");
        setIngestTitle("");
      } else {
        onStatus?.("Feed refreshed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Active signals" value={String(signals.length)} unit="unified desk" highlight />
        <Metric
          label="Outreach lane"
          value={String(signals.filter((s) => s.domain === "outreach").length)}
          unit="→ lead + seq"
        />
        <Metric
          label="Content lane"
          value={String(signals.filter((s) => s.domain === "content").length)}
          unit="→ reactive draft"
        />
      </div>

      <div className="border border-line bg-panel p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Manual ingest · preview</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={ingestDomain}
            onChange={(e) => setIngestDomain(e.target.value as "outreach" | "content")}
            className="border border-line bg-void px-2 py-1 font-mono text-[10px] text-stark"
          >
            <option value="outreach">Outreach</option>
            <option value="content">Content</option>
          </select>
          <input
            value={ingestTitle}
            onChange={(e) => setIngestTitle(e.target.value)}
            placeholder="Signal title…"
            className="min-w-[200px] flex-1 border border-line bg-void px-2 py-1 font-mono text-[10px] text-stark"
          />
          <button
            type="button"
            disabled={busy || !ingestTitle.trim()}
            onClick={() =>
              void runAction({
                action: "ingest",
                domain: ingestDomain,
                title: ingestTitle,
                source: "manual",
              })
            }
            className="border border-cursor-glow px-3 py-1 font-mono text-[10px] uppercase text-cursor-glow disabled:opacity-40"
          >
            Ingest
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction({ action: "list" })}
            className="border border-line px-3 py-1 font-mono text-[10px] uppercase text-muted"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-2 font-mono text-[10px]">
        <p className="text-muted uppercase">Unified feed · source of truth</p>
        {signals.length === 0 ? (
          <p className="text-muted">No signals — ingest manually or wait for demo seed.</p>
        ) : (
          signals.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start justify-between gap-2 border border-line px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-stark">{s.title}</span>
                  <span
                    className={`border px-1 py-0.5 text-[9px] uppercase ${
                      s.domain === "outreach"
                        ? "border-cursor-glow/40 text-cursor-glow"
                        : "border-line text-muted"
                    }`}
                  >
                    {s.domain}
                  </span>
                  <span className={s.urgency === "high" ? "text-amber-400" : "text-muted"}>{s.urgency}</span>
                </div>
                <p className="mt-1 text-muted">
                  {s.source} · score {s.score}
                  {s.intent ? ` · ${s.intent}` : ""}
                </p>
                {s.summary ? <p className="mt-1 text-muted/80">{s.summary.slice(0, 160)}</p> : null}
              </div>
              {s.domain === "outreach" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction({ action: "dispatch_outreach", signalRef: s.id })}
                  className="shrink-0 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
                >
                  → Lead + seq
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction({ action: "dispatch_content", signalRef: s.id })}
                  className="shrink-0 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
                >
                  Draft reactive post
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border border-line bg-panel p-3 ${highlight ? "shadow-cursor" : ""}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-display text-lg text-stark">{value}</p>
      <p className="font-mono text-[9px] text-muted">{unit}</p>
    </div>
  );
}
