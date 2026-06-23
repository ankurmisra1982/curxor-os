import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type CapitalTermKey =
  | "goLive"
  | "executeTrade"
  | "executeNow"
  | "armRule"
  | "ruleEngine"
  | "ruleEngineSubtitle"
  | "goLiveSubtitle"
  | "recentTradesSubtitle"
  | "researchSubtitle"
  | "demoTour"
  | "setupWizard"
  | "pendingApproval"
  | "pilotMarketplace"
  | "agentTrading"
  | "autoApproval"
  | "paperBridge"
  | "deskSubtitle";

const TERMS: Record<CapitalTermKey, Record<GrowthLevel, string>> = {
  goLive: {
    L1: "Get started",
    L2: "Go Live",
    L3: "Go Live",
    L4: "Go Live",
    L5: "Go Live",
  },
  executeTrade: {
    L1: "Try a practice buy",
    L2: "Execute",
    L3: "Execute",
    L4: "Execute",
    L5: "Execute",
  },
  executeNow: {
    L1: "Try practice buy",
    L2: "Execute now",
    L3: "Execute now",
    L4: "Execute now",
    L5: "Execute now",
  },
  armRule: {
    L1: "Turn on rule",
    L2: "Arm rule",
    L3: "Arm rule",
    L4: "Arm rule",
    L5: "Arm rule",
  },
  ruleEngine: {
    L1: "Practice rules",
    L2: "Rule engine",
    L3: "Rule engine",
    L4: "Rule engine",
    L5: "Rule engine",
  },
  ruleEngineSubtitle: {
    L1: "Simple IF/THEN templates · practice mode only",
    L2: "WHEN / THEN · Arm · Execute via paper bridge",
    L3: "WHEN / THEN · Arm · Execute via paper bridge",
    L4: "WHEN / THEN · Arm · Execute via digital bridge",
    L5: "WHEN / THEN · Arm · Execute via digital bridge",
  },
  goLiveSubtitle: {
    L1: "Try the demo tour first — no account or keys needed",
    L2: "Demo mode OK without broker keys · paper checklist when you connect Alpaca",
    L3: "Demo mode OK without broker keys · paper checklist when you connect Alpaca",
    L4: "Paper bridge · broker vault · live gate when ready",
    L5: "Paper bridge · broker vault · live gate when ready",
  },
  recentTradesSubtitle: {
    L1: "Your last practice buys — run demo tour to add one",
    L2: "Last 5 executions · full log on Operator",
    L3: "Last 5 executions",
    L4: "Last 5 executions",
    L5: "Last 5 executions",
  },
  researchSubtitle: {
    L1: "Price · smart take · headlines — learn a ticker in plain language",
    L2: "Price · smart take · headlines — chart & chatter unlock in Operator",
    L3: "Price · smart take · headlines — chart & chatter",
    L4: "Price · smart take · headlines — full chart depth",
    L5: "Price · smart take · headlines — full chart depth",
  },
  demoTour: {
    L1: "Guided practice",
    L2: "Run demo tour",
    L3: "Run demo tour",
    L4: "Run demo tour",
    L5: "Run demo tour",
  },
  setupWizard: {
    L1: "Quick start",
    L2: "Setup Wizard",
    L3: "Setup Wizard",
    L4: "Setup Wizard",
    L5: "Setup Wizard",
  },
  pendingApproval: {
    L1: "",
    L2: "Needs your OK",
    L3: "Needs your OK",
    L4: "Needs your OK",
    L5: "Needs your OK",
  },
  pilotMarketplace: {
    L1: "Ideas to follow",
    L2: "Pilot marketplace",
    L3: "Pilot marketplace",
    L4: "Pilot marketplace",
    L5: "Pilot marketplace",
  },
  agentTrading: {
    L1: "",
    L2: "",
    L3: "Agent trading",
    L4: "Agent & MCP trading",
    L5: "Agent & MCP trading",
  },
  autoApproval: {
    L1: "",
    L2: "",
    L3: "Auto-approve rules",
    L4: "Auto-approval stack",
    L5: "Auto-approval stack",
  },
  paperBridge: {
    L1: "",
    L2: "Paper bridge",
    L3: "Paper bridge",
    L4: "Digital bridge",
    L5: "Digital bridge",
  },
  deskSubtitle: {
    L1: "Learn stocks with practice trades — no brokerage jargon",
    L2: "Build simple rules and follow pilots on paper",
    L3: "Run your daily wealth desk with guardrails",
    L4: "Allocate across brokers with agents and analytics",
    L5: "Govern live capital with policy and delegation",
  },
};

export function capitalTerm(growth: GrowthLevel, key: CapitalTermKey): string {
  return TERMS[key][growth];
}

/** Tab display labels — L1 renames Trade → Learn per leveling plan. */
export function capitalTabLabel(growth: GrowthLevel, tab: string): string {
  if (growth === "L1" && tab === "trade") return "Learn";
  if (tab === "alpha") return "Alpha";
  if (tab === "trade") return "Trade";
  if (tab === "research") return "Research";
  if (tab === "risk") return "Risk";
  if (tab === "agents") return "Agents";
  if (tab === "analytics") return "Analytics";
  return tab;
}

/** Go-live checklist step labels for L1 Learner (server + client). */
export function capitalGoLiveStepLabel(
  growth: GrowthLevel,
  stepId: string,
  defaultLabel: string,
): string {
  if (growth !== "L1") return defaultLabel;
  const l1: Record<string, string> = {
    fre: "Your profile",
    alpaca: "Broker setup (optional)",
    paper: "Practice mode",
    live_money: "Real money (later)",
    rule: "First practice rule",
    armed: "Rule turned on",
    first_fill: "First practice buy",
  };
  return l1[stepId] ?? defaultLabel;
}

export function capitalGoLiveStepDetail(
  growth: GrowthLevel,
  stepId: string,
  defaultDetail: string,
): string {
  if (growth !== "L1") return defaultDetail;
  const l1: Record<string, string> = {
    fre: "Learning mode · conservative practice defaults",
    alpaca: "Skip for now — practice buys work without an account",
    paper: "Practice trades only — nothing leaves your box",
    live_money: "Unlock when you choose Operator or higher",
    rule: "Run Quick start or Guided practice to create one",
    armed: "Turn on a rule before your first practice buy",
    first_fill: "Run Guided practice from Get started",
  };
  return l1[stepId] ?? defaultDetail.replace(/Alpaca|bridge|MCP|digital\.env/gi, (m) => {
    if (/alpaca|bridge|digital\.env/i.test(m)) return "broker setup";
    return "";
  }).replace(/\s+/g, " ").trim();
}
