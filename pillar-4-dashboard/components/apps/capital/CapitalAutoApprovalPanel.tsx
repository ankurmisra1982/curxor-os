"use client";

import { CapitalAgentPermissionsPanel } from "@/components/apps/capital/CapitalAgentPermissionsPanel";
import { autoApprovalSummary, type AutoApprovalPolicy } from "@/lib/capital-auto-approval-types";

interface CapitalAutoApprovalPanelProps {
  policy: AutoApprovalPolicy;
  tradingMode: string;
  onUpdate: (patch: Partial<AutoApprovalPolicy>) => void;
}

export function CapitalAutoApprovalPanel({ policy, tradingMode, onUpdate }: CapitalAutoApprovalPanelProps) {
  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="border border-line bg-panel/40 px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-cursor-glow">Auto-approval stack</p>
        <p className="mt-1 text-muted">{autoApprovalSummary(policy)}</p>
        <p className="mt-1 text-[10px] text-muted">
          Mode: {tradingMode} · Sovereign desk skips pending_approval when policy + risk guard pass
        </p>
      </div>

      <label className="flex items-center gap-2 border border-line p-2">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
        />
        <span className="text-stark">Enable auto-approval stack</span>
      </label>

      <label className="block border border-line p-2">
        <span className="text-[10px] uppercase text-muted">Max notional (USD)</span>
        <input
          type="number"
          min={1}
          max={100_000}
          className="mt-1 w-full bg-transparent text-stark"
          value={policy.maxNotionalUsd}
          onChange={(e) => onUpdate({ maxNotionalUsd: Number(e.target.value) || 500 })}
        />
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        {(
          [
            ["paperOnly", "Paper / dry-run only (recommended)"],
            ["autoApproveArmedRules", "Armed rule executions"],
            ["autoApproveIntelActions", "Intel / PFM suggested trades"],
            ["autoApprovePilotCopy", "Pilot copy trades"],
            ["autoApproveTradingView", "TradingView webhooks"],
            ["autoApproveAgentChat", "Claw / Claude / MCP chat trades"],
            ["requireAgentPreview", "Require preview before agent confirm"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 border border-line p-2">
            <input
              type="checkbox"
              checked={policy[key]}
              onChange={(e) => onUpdate({ [key]: e.target.checked })}
            />
            <span className="text-[10px] text-stark">{label}</span>
          </label>
        ))}
      </div>
      <CapitalAgentPermissionsPanel policy={policy} />
      <p className="border-t border-line/60 pt-2 text-[10px] text-muted">
        Composer by SoFi runs rules in their cloud. Capital runs yours locally with risk guard.
      </p>
    </div>
  );
}
