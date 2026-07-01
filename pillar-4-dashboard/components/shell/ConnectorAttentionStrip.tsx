"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const INTEGRATIONS_HREF = "/settings?tab=integrations";

interface ConnectorAttentionSnapshot {
  attentionTotal: number;
  domainsNeedingAttention: number;
  topLabel: string | null;
}

export function ConnectorAttentionStrip({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ConnectorAttentionSnapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shell/connectors", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        summary?: { attentionTotal: number; domainsNeedingAttention: number };
        domains?: Array<{ health: string; statusLabel: string }>;
      };
      const needing = json.domains?.find(
        (d) => d.health === "attention" || d.health === "unconfigured",
      );
      setData({
        attentionTotal: json.summary?.attentionTotal ?? 0,
        domainsNeedingAttention: json.summary?.domainsNeedingAttention ?? 0,
        topLabel: needing?.statusLabel ?? null,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!data || data.domainsNeedingAttention === 0) return null;

  return (
    <Link
      href={INTEGRATIONS_HREF}
      className={`flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 transition hover:border-amber-400/60 ${
        compact ? "px-2 py-1 font-sans text-[11px]" : "px-3 py-2 font-sans text-xs"
      }`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
      <span>
        {data.domainsNeedingAttention} bridge lane{data.domainsNeedingAttention === 1 ? "" : "s"} need setup
        {!compact && data.topLabel ? ` — ${data.topLabel}` : ""}
      </span>
    </Link>
  );
}
