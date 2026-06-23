"use client";

export interface WorkSignalRow {
  id: string;
  title: string;
  source: string;
  intent: string;
  score: number;
  receivedAt: string;
}

interface WorkSignalStripProps {
  signals: WorkSignalRow[];
  busy?: boolean;
  onConvert: (signalId: string) => void;
}

export function WorkSignalStrip({ signals, busy, onConvert }: WorkSignalStripProps) {
  if (signals.length === 0) {
    return (
      <p className="font-mono text-[10px] text-muted">
        No intent signals — ingest via webhook or wait for demo seed.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase">Intent strip · top signals · full desk at /optimus</p>
      {signals.slice(0, 5).map((s) => (
        <div key={s.id} className="flex flex-wrap items-start justify-between gap-2 border border-line px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-stark">{s.title}</p>
            <p className="text-muted">
              {s.source} · {s.intent} · score {s.score}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConvert(s.id)}
            className="shrink-0 border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
          >
            → Lead + seq
          </button>
        </div>
      ))}
    </div>
  );
}
