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

export interface ActivityFeedResponse {
  ok: true;
  generatedAt: string;
  homeLastVisitedAt: string | null;
  attention: ActivityFeedRow[];
  items: ActivityFeedRow[];
}
