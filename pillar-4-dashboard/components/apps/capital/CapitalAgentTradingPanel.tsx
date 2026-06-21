"use client";

import { useState } from "react";

import { CapitalOrderPreviewPanel } from "@/components/apps/capital/CapitalOrderPreviewPanel";
import type { AutoApprovalPolicy } from "@/lib/capital-auto-approval-types";
import type { AgentAuditEntry, CapitalTrade, TradePreview } from "@/lib/capital-queue-types";

type AuditEntry = AgentAuditEntry;

export interface AgentExecuteResponse {
  phase?: string;
  error?: string | null;
  preview?: TradePreview;
  trade?: CapitalTrade;
}

interface CapitalAgentTradingPanelProps {
  autoApproval: AutoApprovalPolicy;
  auditLog: AuditEntry[];
  selectedAsset: string;
  onKillSwitch: (enabled: boolean) => void;
  onAgentExecute: (input: {
    ticker: string;
    qty: number;
    action: "buy" | "sell";
    confirm: boolean;
  }) => Promise<AgentExecuteResponse>;
  signal?: string;
}

export function CapitalAgentTradingPanel({
  autoApproval,
  auditLog,
  selectedAsset,
  onKillSwitch,
  onAgentExecute,
  signal,
}: CapitalAgentTradingPanelProps) {
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastAction, setLastAction] = useState<"buy" | "sell">("buy");

  const mcpUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/capital/mcp`
      : "http://127.0.0.1:3080/api/capital/mcp";

  const runAgent = async (confirm: boolean) => {
    setPreviewLoading(true);
    try {
      const result = await onAgentExecute({
        ticker: selectedAsset,
        qty: 1,
        action: lastAction,
        confirm,
      });
      if (result.preview) setPreview(result.preview);
      if (confirm && result.phase === "executed") setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDisabled =
    autoApproval.agentKillSwitch ||
    previewLoading ||
    !preview ||
    Boolean(preview.riskNote) ||
    (autoApproval.requireAgentPreview && !preview);

  return (
    <div className="space-y-3 font-mono text-xs">
      {autoApproval.agentKillSwitch ? (
        <div className="border border-red-500/60 bg-red-950/30 px-3 py-2 text-[10px] uppercase tracking-widest text-red-300">
          Agent kill switch ON — Claude/MCP/agent trades blocked
        </div>
      ) : null}

      <div className="border border-line bg-panel/40 px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-cursor-glow">Claw / Claude / MCP trading</p>
        <p className="mt-1 text-[10px] text-muted">
          Sovereign desk MCP — review_equity_order before place_equity_order (Robinhood Agentic parity).
          Trades flow: agent → preview → risk guard → auto-approval → digital bridge.
        </p>
        <p className="mt-2 break-all text-[9px] text-muted">MCP endpoint: {mcpUrl}</p>
        <pre className="mt-1 overflow-x-auto text-[9px] text-stark/80">
          {`claude mcp add capital-claw --transport http ${mcpUrl}`}
        </pre>
      </div>

      <CapitalOrderPreviewPanel preview={preview} loading={previewLoading} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onKillSwitch(!autoApproval.agentKillSwitch)}
          className={`border px-2 py-1 text-[9px] uppercase ${
            autoApproval.agentKillSwitch
              ? "border-red-400 text-red-300"
              : "border-line text-muted hover:text-stark"
          }`}
        >
          {autoApproval.agentKillSwitch ? "Clear kill switch" : "Agent kill switch"}
        </button>
        <button
          type="button"
          disabled={autoApproval.agentKillSwitch || previewLoading}
          onClick={() => {
            setLastAction("buy");
            void runAgent(false);
          }}
          className="border border-line px-2 py-1 text-[9px] uppercase text-muted hover:text-cursor-glow disabled:opacity-40"
        >
          Preview buy {selectedAsset}
        </button>
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={() => void runAgent(true)}
          className="border border-cursor-glow px-2 py-1 text-[9px] uppercase text-cursor-glow disabled:opacity-40"
        >
          Confirm & execute
        </button>
      </div>

      {signal ? <p className="text-[10px] text-muted">{signal}</p> : null}

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">Agent audit log</p>
        {auditLog.length === 0 ? (
          <p className="text-muted">No agent activity yet — connect MCP or use Claw chat skills.</p>
        ) : (
          auditLog.slice(0, 12).map((row) => (
            <div key={row.id} className="border-b border-line/40 py-1 text-[10px]">
              <span className="text-cursor-glow">{row.kind}</span>
              <span className="text-muted"> · {row.source}</span>
              {row.ticker ? <span className="text-stark"> · {row.ticker}</span> : null}
              <p className="text-muted">{row.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
