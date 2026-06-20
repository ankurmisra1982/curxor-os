"use client";

import { useEffect, useState } from "react";

import { Panel } from "../shell/Panel";

interface ComputeMetrics {
  timestamp: string;
  tokensPerSecond: number | null;
  promptTokensPerSecond: number | null;
  modelLoaded: string | null;
  backend: string;
  memory: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    gpuHeapGb: number;
    umaUsedPercent: number;
  };
}

export function ComputeMetricsWidget() {
  const [metrics, setMetrics] = useState<ComputeMetrics | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/metrics/compute", { cache: "no-store" });
        if (!res.ok) throw new Error("metrics unavailable");
        const data = (await res.json()) as ComputeMetrics;
        if (active) {
          setMetrics(data);
          setOnline(true);
        }
      } catch {
        if (active) setOnline(false);
      }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const tok = metrics?.tokensPerSecond;
  const prompt = metrics?.promptTokensPerSecond;
  const mem = metrics?.memory;

  return (
    <Panel
      title="COMPUTE"
      subtitle="Pillar 1 · local inference · UMA pool"
      active={online}
      className="col-span-12"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricBlock
          label="GEN TOK/S"
          value={tok !== null && tok !== undefined ? tok.toFixed(2) : "—"}
          highlight
        />
        <MetricBlock
          label="PROMPT TOK/S"
          value={prompt !== null && prompt !== undefined ? prompt.toFixed(2) : "—"}
        />
        <MetricBlock label="BACKEND" value={(metrics?.backend ?? "—").toUpperCase()} />
        <MetricBlock label="MODEL" value={metrics?.modelLoaded ?? "—"} small />

        <MetricBlock label="UMA USED" value={mem ? `${mem.usedGb} / ${mem.totalGb} GB` : "—"} highlight />
        <MetricBlock label="UMA FREE" value={mem ? `${mem.freeGb} GB` : "—"} />
        <MetricBlock label="GPU HEAP" value={mem ? `${mem.gpuHeapGb} GB` : "—"} />
        <MetricBlock label="UMA LOAD" value={mem ? `${mem.umaUsedPercent}%` : "—"} />

        <div className="md:col-span-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">UMA ALLOCATION</div>
          <div className="h-3 overflow-hidden border border-line bg-void">
            <div
              className="h-full bg-gradient-to-r from-cursor-dim via-cursor to-cursor-glow transition-all duration-500"
              style={{ width: `${Math.min(mem?.umaUsedPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MetricBlock({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className="border border-line bg-panel px-4 py-3 shadow-panel">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div
        className={`mt-1 font-mono ${small ? "truncate text-xs text-stark" : "text-2xl"} ${
          highlight ? "text-cursor-glow" : "text-stark"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
