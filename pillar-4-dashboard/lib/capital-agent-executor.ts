import "server-only";

import { appendAgentAudit, auditPreviewNote } from "./capital-agent-audit";
import type { AutoApprovalPolicy } from "./capital-auto-approval-types";
import type { CapitalTrade, TradeAction } from "./capital-queue-types";
import { ensureCapitalQueue } from "./capital-store";
import { executeCapitalTrade, previewTrade } from "./capital-trade-executor";

export interface AgentExecuteResult {
  ok: boolean;
  phase: "preview" | "executed" | "blocked";
  preview?: Awaited<ReturnType<typeof previewTrade>>["preview"];
  trade?: CapitalTrade;
  auditId?: string;
  error?: string;
}

function killSwitchActive(policy: AutoApprovalPolicy): boolean {
  return policy.agentKillSwitch === true;
}

export async function agentExecuteTrade(input: {
  ticker: string;
  qty: number;
  action: TradeAction;
  ruleId?: string;
  confirm?: boolean;
  source?: "agent" | "mcp" | "claw";
}): Promise<AgentExecuteResult> {
  const file = await ensureCapitalQueue();
  const source = input.source ?? "agent";

  if (killSwitchActive(file.autoApproval)) {
    const audit = await appendAgentAudit({
      kind: "blocked",
      source,
      ticker: input.ticker.toUpperCase(),
      qty: input.qty,
      action: input.action,
      note: "blocked · agent kill switch active",
    });
    return { ok: false, phase: "blocked", error: "Agent kill switch active", auditId: audit.id };
  }

  if (file.tradingPaused) {
    const audit = await appendAgentAudit({
      kind: "blocked",
      source,
      ticker: input.ticker.toUpperCase(),
      qty: input.qty,
      action: input.action,
      note: "blocked · crisis mode / trading paused",
    });
    return { ok: false, phase: "blocked", error: "Trading paused", auditId: audit.id };
  }

  const previewOut = await previewTrade({
    ticker: input.ticker,
    qty: input.qty,
    action: input.action,
    ruleId: input.ruleId,
  });

  if (!previewOut.ok || !previewOut.preview) {
    return { ok: false, phase: "blocked", error: previewOut.error ?? "Preview failed" };
  }

  const preview = previewOut.preview;
  const previewAudit = await appendAgentAudit({
    kind: "preview",
    source,
    tool: "review_equity_order",
    ticker: preview.ticker,
    qty: preview.qty,
    action: input.action,
    note: auditPreviewNote({
      ticker: preview.ticker,
      qty: preview.qty,
      action: input.action,
      autoEligible: preview.autoApproveEligible,
      riskNote: preview.riskNote,
    }),
  });

  if (preview.riskNote) {
    return {
      ok: false,
      phase: "blocked",
      preview,
      auditId: previewAudit.id,
      error: preview.riskNote,
    };
  }

  const needsConfirm = file.autoApproval.requireAgentPreview && !input.confirm;
  if (needsConfirm) {
    return {
      ok: true,
      phase: "preview",
      preview,
      auditId: previewAudit.id,
    };
  }

  const exec = await executeCapitalTrade({
    ruleId: input.ruleId,
    ticker: preview.ticker,
    qty: preview.qty,
    action: input.action,
    source: "agent",
  });

  const execAudit = await appendAgentAudit({
    kind: exec.ok ? "execute" : "blocked",
    source,
    tool: "place_equity_order",
    ticker: preview.ticker,
    qty: preview.qty,
    action: input.action,
    tradeId: exec.trade?.id ?? null,
    note: exec.ok
      ? `executed · ${exec.trade?.status ?? "queued"} · ${exec.trade?.approvalNote ?? ""}`
      : `blocked · ${exec.error ?? "execute failed"}`,
  });

  return {
    ok: exec.ok,
    phase: exec.ok ? "executed" : "blocked",
    preview,
    trade: exec.trade,
    auditId: execAudit.id,
    error: exec.error,
  };
}
