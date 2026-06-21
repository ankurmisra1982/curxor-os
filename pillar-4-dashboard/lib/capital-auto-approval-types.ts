/** Auto-approval stack — sovereign desk executes without manual click when policy allows. */
export interface AutoApprovalPolicy {
  /** Master switch for the auto-approval stack */
  enabled: boolean;
  /** Auto-submit trades at or below this notional (qty × ref price) */
  maxNotionalUsd: number;
  /** Auto-approve armed rule executions from heartbeat/agent */
  autoApproveArmedRules: boolean;
  /** Auto-approve pilot copy trades */
  autoApprovePilotCopy: boolean;
  /** Auto-approve trades suggested from PFM/intel (dip rules, thesis) */
  autoApproveIntelActions: boolean;
  /** Only auto-approve in paper/dry_run mode (recommended for launch) */
  paperOnly: boolean;
  /** Auto-approve TradingView webhook triggers */
  autoApproveTradingView: boolean;
  /** Auto-approve trades initiated from Claw agent chat / MCP */
  autoApproveAgentChat: boolean;
  /** Emergency halt — blocks all agent/MCP trade execution */
  agentKillSwitch: boolean;
  /** Require preview step before agent confirm (Robinhood review_equity_order parity) */
  requireAgentPreview: boolean;
}

export function defaultAutoApprovalPolicy(): AutoApprovalPolicy {
  return {
    enabled: true,
    maxNotionalUsd: 500,
    autoApproveArmedRules: true,
    autoApprovePilotCopy: false,
    autoApproveIntelActions: true,
    paperOnly: true,
    autoApproveTradingView: false,
    autoApproveAgentChat: true,
    agentKillSwitch: false,
    requireAgentPreview: true,
  };
}

export function autoApprovalSummary(policy: AutoApprovalPolicy): string {
  if (!policy.enabled) return "Auto-approval stack off";
  const parts = [`≤$${policy.maxNotionalUsd}`];
  if (policy.paperOnly) parts.push("paper only");
  if (policy.autoApproveArmedRules) parts.push("armed rules");
  if (policy.autoApproveIntelActions) parts.push("intel actions");
  if (policy.autoApprovePilotCopy) parts.push("pilot copy");
  if (policy.autoApproveTradingView) parts.push("TradingView");
  if (policy.autoApproveAgentChat) parts.push("agent chat");
  if (policy.agentKillSwitch) parts.push("KILL SWITCH ON");
  return parts.join(" · ");
}
