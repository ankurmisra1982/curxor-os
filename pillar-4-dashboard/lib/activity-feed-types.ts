export type ActivityFeedTier = "approval" | "success" | "info" | "error" | "system";

export interface ActivityFeedRow {
  id: string;
  timestamp: string;
  claw: string;
  summary: string;
  tier: ActivityFeedTier;
  href?: string;
  evidence?: string;
  sinceLastVisit: boolean;
}

export interface ActivityFeedSummary {
  totalActions: number;
  sinceLastVisit: number;
  clawsActive: number;
  byClaw: Record<string, number>;
  headline?: string;
}

export interface ActivityFeedResponse {
  ok: true;
  generatedAt: string;
  homeLastVisitedAt: string | null;
  summary: ActivityFeedSummary;
  attention: ActivityFeedRow[];
  items: ActivityFeedRow[];
}
