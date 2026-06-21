export type MetricsRuleCondition =
  | { type: "views_gte"; minViews: number }
  | { type: "engagement_gte"; minRate: number }
  | { type: "hook_winner"; minSamples?: number; marginPct?: number };

export type MetricsRuleAction =
  | { type: "repurpose"; preset: string }
  | { type: "select_hook"; target: "source_post" | "next_draft" }
  | { type: "schedule"; offsetHours?: number };

export interface MetricsRule {
  id: string;
  label: string;
  enabled: boolean;
  condition: MetricsRuleCondition;
  action: MetricsRuleAction;
  cooldownHours: number;
}

export interface MetricsRuleFire {
  id: string;
  ruleId: string;
  at: string;
  postId: string;
  action: string;
  detail: string;
  ok: boolean;
  error: string | null;
}

export interface MetricsRuleMatch {
  rule: MetricsRule;
  postId: string;
  hookId?: string;
  detail: string;
}

export interface MetricsRuleRunResult {
  ruleId: string;
  postId: string;
  ok: boolean;
  detail: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}
