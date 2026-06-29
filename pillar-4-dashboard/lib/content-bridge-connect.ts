import type { SocialPlatformId } from "./social-channels";
import { getSocialChannel, SOCIAL_CHANNELS } from "./social-channels";

export interface ConnectFieldDef {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
}

const ENV_KEY_LABELS: Record<string, string> = {
  X_API_KEY: "API Key",
  X_API_SECRET: "API Secret",
  X_ACCESS_TOKEN: "Access Token",
  X_ACCESS_TOKEN_SECRET: "Access Token Secret",
  X_BEARER_TOKEN: "Bearer Token (optional)",
  META_APP_ID: "Meta App ID",
  META_APP_SECRET: "Meta App Secret",
  META_IG_USER_ID: "Instagram User ID",
  META_ACCESS_TOKEN: "Meta Access Token",
  YOUTUBE_CLIENT_ID: "Google Client ID",
  YOUTUBE_CLIENT_SECRET: "Google Client Secret",
  YOUTUBE_REFRESH_TOKEN: "YouTube Refresh Token",
  LINKEDIN_CLIENT_ID: "LinkedIn Client ID",
  LINKEDIN_CLIENT_SECRET: "LinkedIn Client Secret",
  LINKEDIN_ACCESS_TOKEN: "LinkedIn Access Token",
  LINKEDIN_REFRESH_TOKEN: "LinkedIn Refresh Token (optional)",
  LINKEDIN_AUTHOR_URN: "LinkedIn Author URN (optional)",
  PINTEREST_APP_ID: "Pinterest App ID",
  PINTEREST_APP_SECRET: "Pinterest App Secret",
  PINTEREST_ACCESS_TOKEN: "Pinterest Access Token",
  PINTEREST_DEFAULT_BOARD_ID: "Default Board ID",
  PINTEREST_DEFAULT_LINK: "Default Link (optional)",
  TIKTOK_CLIENT_KEY: "TikTok Client Key",
  TIKTOK_CLIENT_SECRET: "TikTok Client Secret",
  TIKTOK_ACCESS_TOKEN: "TikTok Access Token",
  TIKTOK_REFRESH_TOKEN: "TikTok Refresh Token (optional)",
  CURXOR_CONTENT_PUBLIC_BASE: "Public image base URL",
};

function fieldTypeForKey(key: string): "text" | "password" {
  if (/SECRET|TOKEN|PASSWORD/i.test(key) && !key.includes("PUBLIC")) return "password";
  return "text";
}

export function connectFieldsForPlatform(platform: SocialPlatformId): ConnectFieldDef[] {
  const ch = getSocialChannel(platform);
  if (!ch) return [];
  return ch.envKeys.map((key) => ({
    key,
    label: ENV_KEY_LABELS[key] ?? key.replace(/_/g, " "),
    type: fieldTypeForKey(key),
    placeholder: key === "CURXOR_CONTENT_PUBLIC_BASE" ? "https://your-domain.com/content" : undefined,
  }));
}

export interface PlatformConnectCard {
  platform: SocialPlatformId;
  name: string;
  fields: ConnectFieldDef[];
  bridgeTier: string;
}

export function listCreatorConnectPlatforms(freChannels: string[]): PlatformConnectCard[] {
  const freSet = new Set(freChannels);
  return SOCIAL_CHANNELS.filter((ch) => ch.creatorClaw && freSet.has(ch.id)).map((ch) => ({
    platform: ch.id,
    name: ch.name,
    fields: connectFieldsForPlatform(ch.id),
    bridgeTier: ch.bridgeTier,
  }));
}

export const PUBLIC_MEDIA_FIELD: ConnectFieldDef = {
  key: "CURXOR_CONTENT_PUBLIC_BASE",
  label: "Public image address",
  type: "text",
  placeholder: "https://your-domain.com/content — required for Instagram & Pinterest",
};
