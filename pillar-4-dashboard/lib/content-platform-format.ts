/**
 * Platform-specific formatting rules for Creator Claw multi-channel adaptation.
 */

import type { ContentFormat } from "./social-channels";
import {
  charLimitForPlatform,
  defaultFormatForPlatform,
  getSocialChannel,
  type SocialPlatformId,
} from "./social-channels";

export type MediaRequirement = "text" | "image" | "video" | "text_or_image";

export interface PlatformFormatSpec {
  platform: SocialPlatformId;
  charLimit: number | null;
  defaultFormat: ContentFormat;
  media: MediaRequirement;
  /** First line semantics (title, hook, etc.) */
  lineOneRule: string | null;
  hashtagHint: string | null;
  aspectRatio: string | null;
  videoMaxSec: number | null;
  notes: string;
}

export interface PlatformAdaptedDraft {
  platform: SocialPlatformId;
  format: ContentFormat;
  text: string;
  title: string | null;
  description: string | null;
  hashtags: string[];
  withinLimit: boolean;
}

const HASHTAG_POOL = ["#CurXor", "#SovereignAI", "#CreatorClaw", "#EdgeAI", "#LocalLLM"];

export function platformFormatSpec(platform: SocialPlatformId): PlatformFormatSpec {
  const ch = getSocialChannel(platform);
  let media: MediaRequirement = "text";
  let lineOneRule: string | null = null;

  switch (platform) {
    case "instagram":
    case "pinterest":
      media = "image";
      lineOneRule = platform === "pinterest" ? "Line 1 = pin title (100 chars)" : null;
      break;
    case "tiktok":
    case "youtube":
    case "snapchat":
      media = "video";
      break;
    case "reddit":
      lineOneRule = "Line 1 = post title (300 chars max)";
      break;
    case "discord":
      media = "text_or_image";
      break;
    default:
      media = "text";
  }

  return {
    platform,
    charLimit: ch.charLimit,
    defaultFormat: defaultFormatForPlatform(platform),
    media,
    lineOneRule,
    hashtagHint:
      platform === "tiktok" || platform === "instagram" || platform === "youtube"
        ? "3–5 relevant hashtags at end"
        : platform === "x" || platform === "threads"
          ? "1–2 hashtags max"
          : null,
    aspectRatio:
      platform === "tiktok" || platform === "snapchat" || platform === "instagram"
        ? "9:16 vertical"
        : platform === "youtube"
          ? "9:16 Shorts or 16:9 long-form"
          : null,
    videoMaxSec: ch.videoMaxSec,
    notes: ch.notes,
  };
}

export function platformsNeedingImage(platform: SocialPlatformId): boolean {
  return platformFormatSpec(platform).media === "image";
}

export function platformsNeedingVideo(platform: SocialPlatformId): boolean {
  return platformFormatSpec(platform).media === "video";
}

export function splitTitleBody(text: string, platform: SocialPlatformId): { title: string; body: string } {
  const nl = text.indexOf("\n");
  const first = (nl >= 0 ? text.slice(0, nl) : text).trim();
  const rest = nl >= 0 ? text.slice(nl + 1).trim() : "";

  if (platform === "reddit") {
    return { title: first.slice(0, 300), body: rest.slice(0, 40000) };
  }
  if (platform === "pinterest") {
    return { title: first.slice(0, 100), body: rest.slice(0, 800) };
  }
  return { title: first, body: rest };
}

export function truncateForPlatform(text: string, platform: SocialPlatformId): string {
  const limit = charLimitForPlatform(platform);
  if (limit === null || text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

export function buildAdaptPrompt(
  platform: SocialPlatformId,
  masterText: string,
  tone: string,
  format?: ContentFormat,
): string {
  const spec = platformFormatSpec(platform);
  const fmt = format ?? spec.defaultFormat;
  const limit = spec.charLimit ?? 2000;

  const rules: string[] = [
    `Platform: ${getSocialChannel(platform).name}`,
    `Format: ${fmt}`,
    `Tone: ${tone}`,
    `Max characters: ${limit}`,
    spec.lineOneRule ? `Structure: ${spec.lineOneRule}` : "Single cohesive caption/post body",
    spec.hashtagHint ? `Hashtags: ${spec.hashtagHint}` : "Minimal or no hashtags",
    spec.aspectRatio ? `Video/visual: ${spec.aspectRatio}${spec.videoMaxSec ? `, max ${spec.videoMaxSec}s` : ""}` : "",
    "Output ONLY the final post text ready to publish — no preamble or quotes.",
  ].filter(Boolean);

  return `Adapt this master draft for ${getSocialChannel(platform).name}:\n\n---\n${masterText}\n---\n\nRules:\n${rules.map((r) => `- ${r}`).join("\n")}`;
}

export function parseAdaptedDraft(
  platform: SocialPlatformId,
  raw: string,
  format?: ContentFormat,
): PlatformAdaptedDraft {
  const spec = platformFormatSpec(platform);
  const fmt = format ?? spec.defaultFormat;
  const text = truncateForPlatform(raw.trim(), platform);
  const { title, body } = splitTitleBody(text, platform);
  const hashtags = text.match(/#[\w]+/g) ?? [];

  return {
    platform,
    format: fmt,
    text,
    title: title || null,
    description: body || null,
    hashtags,
    withinLimit: spec.charLimit === null || text.length <= spec.charLimit,
  };
}

export function suggestedHashtags(platform: SocialPlatformId, count = 3): string[] {
  const spec = platformFormatSpec(platform);
  if (!spec.hashtagHint) return [];
  return HASHTAG_POOL.slice(0, count);
}
