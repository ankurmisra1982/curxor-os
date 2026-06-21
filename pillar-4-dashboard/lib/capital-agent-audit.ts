import "server-only";

import type { AgentAuditEntry, TradeAction } from "./capital-queue-types";
import { ensureCapitalQueue, writeCapitalFilePartial } from "./capital-store";

const MAX_AUDIT = 100;

export async function appendAgentAudit(
  entry: Omit<AgentAuditEntry, "id" | "at"> & { at?: string },
): Promise<AgentAuditEntry> {
  const file = await ensureCapitalQueue();
  const row: AgentAuditEntry = {
    id: `AGT-${String(file.agentAuditLog.length + 1).padStart(4, "0")}`,
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    source: entry.source,
    tool: entry.tool,
    ticker: entry.ticker,
    qty: entry.qty,
    action: entry.action,
    note: entry.note,
    tradeId: entry.tradeId ?? null,
  };
  file.agentAuditLog = [row, ...file.agentAuditLog].slice(0, MAX_AUDIT);
  await writeCapitalFilePartial(file);
  return row;
}

export async function listAgentAudit(limit = 25): Promise<AgentAuditEntry[]> {
  const file = await ensureCapitalQueue();
  return file.agentAuditLog.slice(0, limit);
}

export async function setAgentKillSwitch(enabled: boolean): Promise<boolean> {
  const file = await ensureCapitalQueue();
  file.autoApproval = { ...file.autoApproval, agentKillSwitch: enabled };
  await writeCapitalFilePartial(file);
  await appendAgentAudit({
    kind: "kill_switch",
    source: "claw",
    note: enabled ? "Agent kill switch ENABLED — all agent/MCP trades blocked" : "Agent kill switch cleared",
  });
  return enabled;
}

export function auditPreviewNote(input: {
  ticker: string;
  qty: number;
  action: TradeAction;
  autoEligible: boolean;
  riskNote: string | null;
}): string {
  const parts = [
    `preview ${input.action} ${input.qty} ${input.ticker}`,
    input.autoEligible ? "auto-eligible" : "needs approval",
  ];
  if (input.riskNote) parts.push(`risk: ${input.riskNote}`);
  return parts.join(" · ");
}
