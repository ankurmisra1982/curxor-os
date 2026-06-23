export type ForgedCreatorPlatform = "x" | "linkedin" | "youtube" | "tiktok" | "multi";

export type ForgedCreatorStage = "IDEATE" | "SCRIPT" | "SCHEDULED" | "PUBLISHED";

export interface ForgedCreatorPost {
  id: string;
  channel: string;
  platform: ForgedCreatorPlatform;
  stage: ForgedCreatorStage;
  draftText: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForgedCreatorQueueFile {
  version: 1;
  updatedAt: string;
  posts: ForgedCreatorPost[];
}
