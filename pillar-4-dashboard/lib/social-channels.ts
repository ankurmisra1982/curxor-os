/**
 * Canonical catalog of top social & creator platforms for Creator Claw / Engage Claw.
 * Bridge tiers reflect what digital_bridges.py can execute today on eno2.
 */

export type SocialPlatformId =
  | "x"
  | "threads"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "reddit"
  | "bluesky"
  | "discord"
  | "telegram"
  | "whatsapp";

/** @deprecated alias — prefer SocialPlatformId */
export type ContentPlatform = SocialPlatformId;

export type ContentFormat =
  | "thread"
  | "long-form"
  | "reel"
  | "short"
  | "carousel"
  | "story";

export type SocialCategory =
  | "short-form"
  | "long-form"
  | "professional"
  | "community"
  | "visual"
  | "messaging";

export type BridgeTier = "live" | "messaging" | "planned" | "draft_only";

export interface SocialChannelDef {
  id: SocialPlatformId;
  name: string;
  short: string;
  category: SocialCategory;
  formats: ContentFormat[];
  charLimit: number | null;
  videoMaxSec: number | null;
  bridgeTool: string | null;
  bridgeTier: BridgeTier;
  envKeys: string[];
  creatorClaw: boolean;
  engageClaw: boolean;
  notes: string;
}

export const SOCIAL_CHANNELS: SocialChannelDef[] = [
  {
    id: "tiktok",
    name: "TikTok",
    short: "TT",
    category: "short-form",
    formats: ["reel", "short"],
    charLimit: 2200,
    videoMaxSec: 600,
    bridgeTool: "content.publish_tiktok",
    bridgeTier: "live",
    envKeys: ["TIKTOK_ACCESS_TOKEN"],
    creatorClaw: true,
    engageClaw: false,
    notes: "Content Posting API — video_url (verified domain) or local video_path + caption via eno2.",
  },
  {
    id: "instagram",
    name: "Instagram",
    short: "IG",
    category: "visual",
    formats: ["reel", "carousel", "story", "short"],
    charLimit: 2200,
    videoMaxSec: 90,
    bridgeTool: "content.publish_instagram",
    bridgeTier: "live",
    envKeys: ["META_APP_ID", "META_APP_SECRET", "META_IG_USER_ID", "META_ACCESS_TOKEN"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Feed posts require image_url in publish payload — caption from draft text.",
  },
  {
    id: "youtube",
    name: "YouTube",
    short: "YT",
    category: "long-form",
    formats: ["long-form", "short"],
    charLimit: 5000,
    videoMaxSec: 60,
    bridgeTool: "content.publish_youtube",
    bridgeTier: "live",
    envKeys: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
    creatorClaw: true,
    engageClaw: false,
    notes: "Data API v3 resumable upload — video_path or video_url; Shorts get #Shorts tag automatically.",
  },
  {
    id: "x",
    name: "X",
    short: "X",
    category: "short-form",
    formats: ["short", "thread"],
    charLimit: 280,
    videoMaxSec: 140,
    bridgeTool: "content.publish_post",
    bridgeTier: "live",
    envKeys: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Live today — Tweepy OAuth 1.0a via content.publish_post on digital_out.",
  },
  {
    id: "threads",
    name: "Threads",
    short: "TH",
    category: "short-form",
    formats: ["short", "thread"],
    charLimit: 500,
    videoMaxSec: 300,
    bridgeTool: "content.publish_threads",
    bridgeTier: "live",
    envKeys: ["META_APP_ID", "META_APP_SECRET", "META_THREADS_USER_ID", "META_ACCESS_TOKEN"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Meta Threads API — shares Meta app credentials with Instagram.",
  },
  {
    id: "facebook",
    name: "Facebook Pages",
    short: "FB",
    category: "community",
    formats: ["long-form", "reel", "short"],
    charLimit: 63206,
    videoMaxSec: 240,
    bridgeTool: "content.publish_facebook",
    bridgeTier: "live",
    envKeys: ["META_APP_ID", "META_APP_SECRET", "META_PAGE_ID", "META_ACCESS_TOKEN"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Page posts and Reels via Meta Graph — Page access token on eno2 only.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    short: "LI",
    category: "professional",
    formats: ["long-form", "short", "carousel"],
    charLimit: 3000,
    videoMaxSec: 600,
    bridgeTool: "content.publish_linkedin",
    bridgeTier: "live",
    envKeys: ["LINKEDIN_ACCESS_TOKEN"],
    creatorClaw: true,
    engageClaw: true,
    notes: "UGC Posts API — text posts; set LINKEDIN_AUTHOR_URN for org pages or auto-resolve via userinfo.",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    short: "PIN",
    category: "visual",
    formats: ["carousel", "short"],
    charLimit: 800,
    videoMaxSec: 60,
    bridgeTool: "content.publish_pinterest",
    bridgeTier: "live",
    envKeys: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET", "PINTEREST_REFRESH_TOKEN", "PINTEREST_DEFAULT_BOARD_ID"],
    creatorClaw: true,
    engageClaw: false,
    notes: "Pins API — image_url required; first draft line = title (100), rest = description (800).",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    short: "SC",
    category: "short-form",
    formats: ["story", "short"],
    charLimit: 250,
    videoMaxSec: 60,
    bridgeTool: "content.publish_snapchat",
    bridgeTier: "live",
    envKeys: [
      "SNAP_CLIENT_ID",
      "SNAP_CLIENT_SECRET",
      "SNAP_REFRESH_TOKEN",
      "SNAP_REDIRECT_URI",
      "SNAP_PUBLIC_PROFILE_ID",
    ],
    creatorClaw: true,
    engageClaw: false,
    notes: "Public Profile API — Spotlight/Story; video_url or video_path (mp4, 6–60s, 9:16).",
  },
  {
    id: "reddit",
    name: "Reddit",
    short: "RD",
    category: "community",
    formats: ["long-form", "thread", "short"],
    charLimit: 40000,
    videoMaxSec: 900,
    bridgeTool: "content.publish_reddit",
    bridgeTier: "live",
    envKeys: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_REFRESH_TOKEN"],
    creatorClaw: true,
    engageClaw: true,
    notes: "OAuth script app — self posts; first draft line = title, set REDDIT_DEFAULT_SUBREDDIT.",
  },
  {
    id: "bluesky",
    name: "Bluesky",
    short: "BS",
    category: "short-form",
    formats: ["short", "thread"],
    charLimit: 300,
    videoMaxSec: 60,
    bridgeTool: "content.publish_bluesky",
    bridgeTier: "live",
    envKeys: ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"],
    creatorClaw: true,
    engageClaw: true,
    notes: "AT Protocol app password — 300 char posts via PDS createRecord on eno2.",
  },
  {
    id: "discord",
    name: "Discord",
    short: "DC",
    category: "community",
    formats: ["short", "long-form"],
    charLimit: 2000,
    videoMaxSec: 600,
    bridgeTool: "channel.discord.send",
    bridgeTier: "live",
    envKeys: ["DISCORD_BOT_TOKEN", "DISCORD_CHANNEL_ID"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Bot token — text posts to guild channel; optional image_url embed.",
  },
  {
    id: "telegram",
    name: "Telegram",
    short: "TG",
    category: "messaging",
    formats: ["short", "long-form"],
    charLimit: 4096,
    videoMaxSec: null,
    bridgeTool: "channel.telegram.send",
    bridgeTier: "messaging",
    envKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_DEFAULT_CHAT_ID"],
    creatorClaw: true,
    engageClaw: true,
    notes: "Live messaging bridge today — channels/groups via channel.telegram.send.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    short: "WA",
    category: "messaging",
    formats: ["short"],
    charLimit: 4096,
    videoMaxSec: null,
    bridgeTool: "channel.whatsapp.send",
    bridgeTier: "messaging",
    envKeys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    creatorClaw: false,
    engageClaw: true,
    notes: "Cloud API outbound — Engage/Outreach; Meta Business verification required.",
  },
];

export const CREATOR_PLATFORMS = SOCIAL_CHANNELS.filter((c) => c.creatorClaw).map((c) => c.id);

export const SOCIAL_PLATFORM_SET = new Set<SocialPlatformId>(SOCIAL_CHANNELS.map((c) => c.id));

export function getSocialChannel(id: SocialPlatformId): SocialChannelDef {
  const ch = SOCIAL_CHANNELS.find((c) => c.id === id);
  if (!ch) throw new Error(`Unknown social platform: ${id}`);
  return ch;
}

export function isSocialPlatform(id: string): id is SocialPlatformId {
  return SOCIAL_PLATFORM_SET.has(id as SocialPlatformId);
}

export function platformLabel(id: SocialPlatformId): string {
  return getSocialChannel(id).name;
}

export function defaultFormatForPlatform(platform: SocialPlatformId): ContentFormat {
  const ch = getSocialChannel(platform);
  return ch.formats[0] ?? "short";
}

export function charLimitForPlatform(platform: SocialPlatformId): number | null {
  return getSocialChannel(platform).charLimit;
}

export function draftWithinLimit(platform: SocialPlatformId, text: string): boolean {
  const limit = charLimitForPlatform(platform);
  if (limit === null) return true;
  return text.length <= limit;
}

export function bridgeTierLabel(tier: BridgeTier): string {
  switch (tier) {
    case "live":
      return "Live bridge";
    case "messaging":
      return "Messaging bridge";
    case "planned":
      return "API planned";
    default:
      return "Draft only";
  }
}

export function bridgeTierBadgeClass(tier: BridgeTier): string {
  switch (tier) {
    case "live":
      return "text-cursor-glow border-cursor-glow";
    case "messaging":
      return "text-stark border-stark";
    case "planned":
      return "text-muted border-line";
    default:
      return "text-muted border-line/50";
  }
}

export function creatorFreChannelOptions(): { value: SocialPlatformId; label: string }[] {
  return SOCIAL_CHANNELS.filter((c) => c.creatorClaw).map((c) => ({
    value: c.id,
    label: c.name,
  }));
}
