"use client";

import type { BrokerIntegrationStatus } from "@/lib/capital-queue-types";

interface CapitalBridgeStatusPanelProps {
  brokers: BrokerIntegrationStatus[];
  bridgeConfigured: boolean;
  source: string;
}

export function CapitalBridgeStatusPanel({
  brokers,
  bridgeConfigured,
  source,
}: CapitalBridgeStatusPanelProps) {
  const rows = brokers.length > 0 ? brokers : [];

  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">Bridge status</p>
      <p className="mt-1 font-sans text-xs text-muted">
        Outbound paths on eno2 · cognition stays local until you approve
      </p>
      <p className="mt-2 font-mono text-[10px] text-stark">
        Portfolio source: {source} · egress {bridgeConfigured ? "armed" : "not configured"}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((b) => (
          <li
            key={b.id}
            className={`border px-3 py-2 ${b.configured ? "border-emerald-500/30 bg-void" : "border-line bg-void/50"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-sm text-stark">{b.label}</span>
              <span
                className={`font-mono text-[9px] uppercase ${b.configured ? "text-emerald-400" : "text-muted"}`}
              >
                {b.configured ? "Live" : "Setup"}
              </span>
            </div>
            <p className="mt-1 font-sans text-[11px] text-muted">{b.detail}</p>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="mt-3 font-sans text-xs text-muted">Connect a broker in Risk & permissions to arm bridges.</p>
      ) : null}
    </div>
  );
}
