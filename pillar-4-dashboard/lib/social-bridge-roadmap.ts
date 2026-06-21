import type { BridgeTier, SocialPlatformId } from "./social-channels";

export type BridgeBuildStatus = "done" | "in_progress" | "planned";

export interface SocialBridgeBuildStep {
  step: number;
  title: string;
  platformIds: SocialPlatformId[];
  status: BridgeBuildStatus;
  tools: string[];
  summary: string;
}

/** Systematic build order — one step at a time after X (step 0). */
export const SOCIAL_BRIDGE_ROADMAP: SocialBridgeBuildStep[] = [
  {
    step: 0,
    title: "X (Twitter)",
    platformIds: ["x"],
    status: "done",
    tools: ["content.publish_post"],
    summary: "Tweepy OAuth 1.0a — live on eno2.",
  },
  {
    step: 1,
    title: "Meta bundle",
    platformIds: ["threads", "facebook", "instagram"],
    status: "done",
    tools: ["content.publish_threads", "content.publish_facebook", "content.publish_instagram"],
    summary: "Graph API — Threads text, Page feed, IG caption+image.",
  },
  {
    step: 2,
    title: "TikTok",
    platformIds: ["tiktok"],
    status: "done",
    tools: ["content.publish_tiktok"],
    summary: "Content Posting API — PULL_FROM_URL or FILE_UPLOAD + status poll.",
  },
  {
    step: 3,
    title: "YouTube",
    platformIds: ["youtube"],
    status: "done",
    tools: ["content.publish_youtube"],
    summary: "Data API v3 resumable upload — OAuth refresh, Shorts #Shorts tag.",
  },
  {
    step: 4,
    title: "LinkedIn",
    platformIds: ["linkedin"],
    status: "done",
    tools: ["content.publish_linkedin"],
    summary: "UGC Posts API — member/org text posts via OAuth.",
  },
  {
    step: 5,
    title: "Bluesky",
    platformIds: ["bluesky"],
    status: "done",
    tools: ["content.publish_bluesky"],
    summary: "AT Protocol app password — createRecord on PDS.",
  },
  {
    step: 6,
    title: "Reddit",
    platformIds: ["reddit"],
    status: "done",
    tools: ["content.publish_reddit"],
    summary: "OAuth refresh — self posts to configured subreddit.",
  },
  {
    step: 7,
    title: "Pinterest",
    platformIds: ["pinterest"],
    status: "done",
    tools: ["content.publish_pinterest"],
    summary: "Pins API v5 — image_url pins to configured board.",
  },
  {
    step: 8,
    title: "Snapchat",
    platformIds: ["snapchat"],
    status: "done",
    tools: ["content.publish_snapchat"],
    summary: "Public Profile API — AES upload, Spotlight or Story.",
  },
  {
    step: 9,
    title: "Discord",
    platformIds: ["discord"],
    status: "done",
    tools: ["channel.discord.send"],
    summary: "Bot token — channel messages for Creator + Engage.",
  },
];

export function roadmapStepForPlatform(platform: SocialPlatformId): SocialBridgeBuildStep | undefined {
  return SOCIAL_BRIDGE_ROADMAP.find((s) => s.platformIds.includes(platform));
}

export function isPlatformPublishLive(tier: BridgeTier): boolean {
  return tier === "live";
}

export function currentBuildStep(): SocialBridgeBuildStep {
  return SOCIAL_BRIDGE_ROADMAP.find((s) => s.status === "in_progress") ?? SOCIAL_BRIDGE_ROADMAP[SOCIAL_BRIDGE_ROADMAP.length - 1]!;
}

export function completedSteps(): SocialBridgeBuildStep[] {
  return SOCIAL_BRIDGE_ROADMAP.filter((s) => s.status === "done");
}
