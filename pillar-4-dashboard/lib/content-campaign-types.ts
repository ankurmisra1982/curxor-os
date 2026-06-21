export type CampaignStage = "IDEATE" | "CREATE" | "REVIEW" | "SCHEDULED" | "LIVE" | "MEASURE";

export const CAMPAIGN_STAGES: CampaignStage[] = [
  "IDEATE",
  "CREATE",
  "REVIEW",
  "SCHEDULED",
  "LIVE",
  "MEASURE",
];

export interface ContentCampaign {
  id: string;
  name: string;
  masterDraft: string;
  stage: CampaignStage;
  channels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentCampaignsFile {
  version: 1;
  campaigns: ContentCampaign[];
  updatedAt: string;
}

export interface CampaignWithPosts extends ContentCampaign {
  postIds: string[];
  postCount: number;
}

export function campaignStageLabel(stage: CampaignStage): string {
  const labels: Record<CampaignStage, string> = {
    IDEATE: "Ideate",
    CREATE: "Create",
    REVIEW: "Review",
    SCHEDULED: "Scheduled",
    LIVE: "Live",
    MEASURE: "Measure",
  };
  return labels[stage];
}
