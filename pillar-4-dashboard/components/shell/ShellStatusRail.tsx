"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { SETTINGS_PATH } from "@/lib/ui-categories";

import { ActivityFeed } from "./ActivityFeed";
import { ConnectorAttentionStrip } from "./ConnectorAttentionStrip";
import { TeamStatusPanel } from "./TeamStatusPanel";

interface EgressSnapshot {
  paused: boolean;
  label: string;
  reason: string;
}

export function ShellStatusRail() {
  const [egress, setEgress] = useState<EgressSnapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shell/sovereignty", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { egress: EgressSnapshot };
      setEgress(data.egress);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <aside
      className="hidden w-72 shrink-0 flex-col border-l border-line bg-void xl:flex"
      aria-label="Mission status"
    >
      <div className="border-b border-line p-4">
        <p className="curxor-kicker-muted">Egress boundary</p>
        <p
          className={`mt-2 font-sans text-sm font-medium ${egress?.paused ? "text-amber-400" : "text-emerald-400"}`}
        >
          {egress?.paused ? "Outbound paused" : "Outbound live"}
        </p>
        <p className="mt-1 font-sans text-xs text-muted">
          {egress?.paused
            ? "Cognition stays local. Trades and posts wait until eno2 is live."
            : "Python bridges may send when skills approve."}
        </p>
        <div className="mt-3">
          <ConnectorAttentionStrip compact />
        </div>
        <Link
          href={SETTINGS_PATH}
          className="mt-3 inline-block font-sans text-xs text-cursor-glow hover:underline"
        >
          Network settings
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Unified feed</p>
          <span className="h-2 w-2 animate-pulse rounded-full bg-cursor-glow" aria-hidden />
        </div>
        <ActivityFeed variant="rail" />
        <TeamStatusPanel />
      </div>
    </aside>
  );
}
