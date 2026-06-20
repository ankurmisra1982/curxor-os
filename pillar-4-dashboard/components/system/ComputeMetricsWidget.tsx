"use client";

import { useEffect, useState } from "react";

import type { ComputeMetrics } from "@/lib/metrics";

interface ComputeMetricsWidgetProps {
  active?: boolean;
  className?: string;
}

export function ComputeMetricsWidget({ active = true, className = "" }: ComputeMetricsWidgetProps) {
  const [metrics, setMetrics] = useState<ComputeMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/metrics/compute", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ComputeMetrics;
        if (!cancelled) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "metrics unavailable");
        }
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active]);

  if (error) {
    return (
      <div className={`border border-line bg-panel p-3 font-mono text-[10px] text-muted ${className}`}>
        Compute metrics offline · {error}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`border border-line bg-panel p-3 font-mono text-[10px] text-muted ${className}`}>
        Loading compute metrics…
      </div>
    );
  }

  return (
    <div className={`space-y-3 border border-line bg-panel p-3 font-mono text-[10px] ${className}`}>
      <div className="uppercase tracking-[0.35em] text-cursor-glow">Compute · {metrics.backend}</div>
      <div className="grid grid-cols-2 gap-2 text-muted">
        <div>
          <div className="text-[9px] uppercase">Model</div>
          <div className="text-stark">{metrics.modelLoaded ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase">Tokens/s</div>
          <div className="text-stark">{metrics.tokensPerSecond ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase">UMA used</div>
          <div className="text-stark">{metrics.memory.umaUsedPercent}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase">RAM</div>
          <div className="text-stark">
            {metrics.memory.usedGb}/{metrics.memory.totalGb} GB
          </div>
        </div>
      </div>
    </div>
  );
}
