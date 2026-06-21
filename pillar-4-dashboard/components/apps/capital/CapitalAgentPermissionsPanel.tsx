"use client";

import { agentPermissionTierSummary } from "@/lib/capital-trade-decision";
import type { AutoApprovalPolicy } from "@/lib/capital-auto-approval-types";

function levelLabel(level: "read" | "preview" | "execute" | "off"): string {
  if (level === "off") return "off";
  if (level === "read") return "read";
  if (level === "preview") return "preview";
  return "execute";
}

function levelClass(level: "read" | "preview" | "execute" | "off"): string {
  if (level === "execute") return "text-cursor-glow";
  if (level === "preview") return "text-stark";
  if (level === "read") return "text-muted";
  return "text-red-400";
}

interface CapitalAgentPermissionsPanelProps {
  policy: AutoApprovalPolicy;
}

export function CapitalAgentPermissionsPanel({ policy }: CapitalAgentPermissionsPanelProps) {
  const tiers = agentPermissionTierSummary(policy);

  return (
    <div className="mt-3 border border-line/60 bg-panel/30 p-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-muted">Agent permission tiers (Robinhood-style)</p>
      <p className="mt-1 text-muted">Derived from auto-approval toggles — read always on unless kill switch.</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {tiers.map((row) => (
          <div key={row.scope} className="flex justify-between border border-line/40 px-2 py-1">
            <span className="text-stark">{row.scope}</span>
            <span className={levelClass(row.level)}>{levelLabel(row.level)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
