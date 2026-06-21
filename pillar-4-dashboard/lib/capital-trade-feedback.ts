import type { CapitalTrade } from "./capital-queue-types";

/** Human-readable desk header copy after a trade action. */
export function formatTradeOutcomeMessage(trade?: CapitalTrade | null, error?: string | null): string {
  if (error?.trim()) return error.trim();
  if (!trade) return "Trade submitted";

  const leg = `${trade.action.toUpperCase()} ${trade.qty} ${trade.ticker}`;

  switch (trade.status) {
    case "pending_approval":
      return `Awaiting your approval · ${leg}${trade.approvalNote ? ` · ${trade.approvalNote}` : ""}`;
    case "queued":
      return `Queued · ${leg} · publishing via digital bridge`;
    case "submitted":
      return `Submitted · ${leg}${trade.orderId ? ` · order ${trade.orderId}` : ""}`;
    case "filled":
      return `Filled · ${leg}${trade.filledPrice != null ? ` @ $${trade.filledPrice.toFixed(2)}` : ""}`;
    case "failed":
      return `Failed · ${leg} · ${trade.error ?? "bridge error"}`;
    case "blocked_risk":
      return `Blocked by risk guard · ${trade.riskDecision ?? trade.error ?? leg}`;
    case "dry_run":
      return `Dry run · ${leg} · no order sent`;
    case "simulated":
      return `Simulated fill · ${leg}${trade.filledPrice != null ? ` @ $${trade.filledPrice.toFixed(2)}` : ""} · not sent to broker`;
    default:
      return `${trade.status} · ${leg}`;
  }
}

export function formatAgentPhaseMessage(input: {
  phase?: string;
  error?: string | null;
  trade?: CapitalTrade | null;
}): string {
  if (input.error?.trim()) return input.error.trim();
  if (input.phase === "preview") return "Preview ready — review below, then confirm & execute";
  if (input.phase === "executed" && input.trade) return formatTradeOutcomeMessage(input.trade);
  if (input.phase === "executed") return "Agent trade executed";
  if (input.phase === "blocked") return input.error ?? "Agent trade blocked";
  return input.phase ? `Agent · ${input.phase}` : "Agent action complete";
}
