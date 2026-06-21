import "server-only";

import type { AutoApprovalPolicy } from "./capital-auto-approval-types";
import type { CapitalPermissions, CapitalTrade } from "./capital-queue-types";

export type { CapitalTrade };

export function shouldAutoApproveTrade(input: {
  policy: AutoApprovalPolicy;
  permissions: CapitalPermissions;
  tradingMode: string;
  source: CapitalTrade["source"];
  notionalUsd: number;
}): boolean {
  if (!input.policy.enabled) return false;
  if (input.policy.paperOnly && input.tradingMode !== "paper" && input.tradingMode !== "dry_run") {
    return false;
  }
  if (input.notionalUsd > input.policy.maxNotionalUsd) return false;

  switch (input.source) {
    case "autonomous":
      return input.policy.autoApproveArmedRules && input.permissions.autonomousMode === "auto_armed_rules";
    case "pilot_copy":
      return input.policy.autoApprovePilotCopy;
    case "tradingview":
      return input.policy.autoApproveTradingView;
    case "agent":
      return input.policy.autoApproveAgentChat || input.policy.autoApproveIntelActions;
    case "manual":
      return input.policy.autoApproveArmedRules;
    default:
      return false;
  }
}

export function buildApprovalAuditNote(input: {
  autoApproved: boolean;
  needsApproval: boolean;
  policy: AutoApprovalPolicy;
  tradingMode: string;
  notionalUsd: number;
  source: CapitalTrade["source"];
}): string | null {
  if (input.needsApproval) {
    return `approval required · source=${input.source} · mode=${input.tradingMode}`;
  }
  if (input.autoApproved) {
    const parts = ["auto-approved"];
    if (input.policy.paperOnly) parts.push("paper-only");
    parts.push(`≤$${input.policy.maxNotionalUsd}`);
    parts.push(`~$${Math.round(input.notionalUsd)} notional`);
    return parts.join(" · ");
  }
  return "manual submit · no approval gate";
}

export function autoApprovalSummary(policy: AutoApprovalPolicy): string {
  if (!policy.enabled) return "Auto-approval stack off";
  const parts = [`≤$${policy.maxNotionalUsd}`];
  if (policy.paperOnly) parts.push("paper only");
  if (policy.autoApproveArmedRules) parts.push("armed rules");
  if (policy.autoApproveIntelActions) parts.push("intel actions");
  if (policy.autoApprovePilotCopy) parts.push("pilot copy");
  if (policy.autoApproveAgentChat) parts.push("agent chat");
  if (policy.agentKillSwitch) parts.push("KILL SWITCH ON");
  return parts.join(" · ");
}
