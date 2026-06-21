export type SocialEngagePlatform = "x" | "linkedin" | "threads" | "instagram";

export type SocialEngageEventKind = "mention" | "reply" | "comment";

export interface SocialEngageEvent {
  platform: SocialEngagePlatform;
  kind: SocialEngageEventKind;
  externalId: string;
  author: string;
  text: string;
  parentPostId: string | null;
  threadUrl: string | null;
  channel: string;
}

export interface SocialEngagePollResult {
  platform: SocialEngagePlatform;
  ok: boolean;
  ingested: number;
  error?: string;
}
