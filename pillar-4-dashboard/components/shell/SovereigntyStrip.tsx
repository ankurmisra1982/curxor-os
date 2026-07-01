"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { useUiMode } from "@/components/ui/UiModeProvider";
import { ConnectorAttentionStrip } from "./ConnectorAttentionStrip";

interface SovereigntyPayload {
  localInference: {
    active: boolean;
    host: string;
    backend: string;
    model: string | null;
    tokensPerSecond: number | null;
  };
  memory: {
    usedGb: number;
    totalGb: number;
    umaUsedPercent: number;
  };
  egress: {
    paused: boolean;
    label: string;
    reason: string;
  };
  frontier: {
    primarySource: string;
    label: string;
  };
}

export function SovereigntyStrip() {
  const { isExpert } = useUiMode();
  const [data, setData] = useState<SovereigntyPayload | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shell/sovereignty", { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as SovereigntyPayload);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const inferenceLabel = data?.localInference.active
    ? "Thinking on this box"
    : "Inference starting…";
  const memoryLabel = data
    ? `Memory ${data.memory.usedGb.toFixed(0)} / ${data.memory.totalGb.toFixed(0)} GB`
    : "Memory —";
  const egressLabel = data?.egress.paused ? "Outbound paused" : "Outbound live";
  const egressTone = data?.egress.paused ? "text-amber-400" : "text-emerald-400";

  return (
    <div
      className="shrink-0 border-b border-line bg-void px-3 py-2 md:px-4"
      aria-label="Sovereignty status"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-muted">
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${data?.localInference.active ? "bg-emerald-400" : "bg-muted"}`}
            aria-hidden
          />
          <span className="text-stark">{inferenceLabel}</span>
          {isExpert && data?.localInference.model ? (
            <span className="font-mono text-[10px] text-muted">{data.localInference.host}</span>
          ) : null}
        </span>
        <span className="hidden sm:inline">{memoryLabel}</span>
        <span className={`font-medium ${egressTone}`}>{egressLabel}</span>
        <span className="hidden md:inline">
          Cloud: <span className="text-stark">{data?.frontier.label ?? "—"}</span>
        </span>
        {isExpert && data?.localInference.tokensPerSecond != null ? (
          <span className="hidden lg:inline font-mono text-[10px] text-cursor-glow">
            {data.localInference.tokensPerSecond.toFixed(1)} tok/s
          </span>
        ) : null}
        <ConnectorAttentionStrip compact />
        <Link
          href="/settings?tab=integrations"
          className="hidden sm:inline text-cursor-glow hover:underline"
        >
          Integrations
        </Link>
      </div>
    </div>
  );
}
