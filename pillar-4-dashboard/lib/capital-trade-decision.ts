import type { CapitalTrade } from "./capital-queue-types";

export interface TradeDecisionStep {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "info";
  detail: string;
}

/** Parse a trade into an operator-readable decision timeline. */
export function buildTradeDecisionTimeline(trade: CapitalTrade): TradeDecisionStep[] {
  const steps: TradeDecisionStep[] = [];

  steps.push({
    id: "source",
    label: "Source",
    status: "info",
    detail: `${trade.source} · ${trade.mode} · ${trade.brokerId}`,
  });

  if (trade.riskDecision) {
    steps.push({
      id: "risk",
      label: "Risk guard",
      status: trade.status === "blocked_risk" ? "fail" : "pass",
      detail: trade.riskDecision,
    });
  }

  const note = (trade.approvalNote ?? "").toLowerCase();
  if (note.includes("auto-approved") || note.includes("auto approved")) {
    steps.push({
      id: "auto",
      label: "Auto-approval",
      status: "pass",
      detail: trade.approvalNote ?? "Auto-approved under policy",
    });
  } else if (trade.status === "pending_approval" || note.includes("approval")) {
    steps.push({
      id: "auto",
      label: "Auto-approval",
      status: "warn",
      detail: trade.approvalNote ?? "Manual approval required",
    });
  } else if (trade.approvalNote) {
    steps.push({
      id: "auto",
      label: "Approval path",
      status: "info",
      detail: trade.approvalNote,
    });
  }

  if (trade.status === "simulated") {
    steps.push({
      id: "bridge",
      label: "Demo simulation",
      status: "info",
      detail: "No broker keys — filled at quote price for demo UX (not sent to broker)",
    });
  } else if (trade.status === "failed") {
    steps.push({
      id: "bridge",
      label: "Bridge",
      status: "fail",
      detail: trade.error ?? "Bridge error",
    });
  } else if (trade.status === "filled" || trade.status === "submitted") {
    steps.push({
      id: "bridge",
      label: "Bridge",
      status: "pass",
      detail: trade.orderId ? `Order ${trade.orderId}` : "Submitted via digital bridge",
    });
  } else if (trade.status === "dry_run") {
    steps.push({
      id: "bridge",
      label: "Dry run",
      status: "info",
      detail: "Logged locally only",
    });
  }

  if (trade.filledAt) {
    steps.push({
      id: "outcome",
      label: "Outcome",
      status: trade.status === "simulated" ? "info" : "pass",
      detail: `${trade.status}${trade.filledPrice != null ? ` @ $${trade.filledPrice.toFixed(2)}` : ""}`,
    });
  }

  return steps;
}

export function agentPermissionTierSummary(policy: {
  agentKillSwitch: boolean;
  requireAgentPreview: boolean;
  autoApproveAgentChat: boolean;
  paperOnly: boolean;
}): Array<{ scope: string; level: "read" | "preview" | "execute" | "off" }> {
  if (policy.agentKillSwitch) {
    return [
      { scope: "Desk read", level: "read" },
      { scope: "Order preview", level: "off" },
      { scope: "Paper execute", level: "off" },
      { scope: "Live execute", level: "off" },
    ];
  }
  return [
    { scope: "Desk read", level: "read" },
    { scope: "Order preview", level: policy.requireAgentPreview ? "preview" : "execute" },
    {
      scope: "Paper execute",
      level: policy.autoApproveAgentChat ? "execute" : "preview",
    },
    { scope: "Live execute", level: policy.paperOnly ? "off" : "preview" },
  ];
}
