export type {
  BridgeTier,
  ContentFormat,
  ContentPlatform,
  SocialPlatformId,
} from "./social-channels";

export type ContentStage =
  | "IDEATE"
  | "SCRIPT"
  | "RENDER"
  | "SCHEDULED"
  | "PENDING_APPROVAL"
  | "SUBMITTED"
  | "PUBLISHED";

import type { BridgeTier, ContentPlatform, SocialPlatformId } from "./social-channels";
import type { ContentFormat } from "./social-channels";

export interface HookVariant {
  id: string;
  text: string;
  label: string;
}

export type CaptionStyle = "burned" | "drawtext" | "none" | "srt-only";

export interface ThumbnailVariant {
  id: string;
  label: string;
  imagePath: string | null;
  imageUrl: string | null;
}

export interface BrandKitConfig {
  hashtags?: string[];
  captionPrefix?: string;
  watermarkPath?: string;
  ttsVoice?: string;
  bannedWords?: string[];
  requiredHashtags?: string[];
  requiredDisclaimer?: string;
  linkAllowlist?: string[];
  /** Plain-language voice & style rules injected into LLM prompts */
  styleGuide?: string;
  voiceTone?: string;
  emojiPolicy?: "none" | "minimal" | "allowed";
  pov?: "first" | "third" | "brand";
  /** Default UTM source for link tracking */
  utmSource?: string;
  /** Auto-wrap outbound links with UTM + click tracking */
  trackLinks?: boolean;
  /** Hashtags to always include */
  suggestedHashtags?: string[];
  /** Hashtags never to use */
  bannedHashtags?: string[];
}

export interface CarouselSlide {
  id: string;
  caption: string;
  imagePath: string | null;
  imageUrl: string | null;
}

export interface TimelineClip {
  id: string;
  path: string;
  label: string;
  durationSec: number | null;
}

export interface ContentPost {
  id: string;
  channel: string;
  platform: ContentPlatform;
  format: import("./social-channels").ContentFormat;
  stage: ContentStage;
  draftText: string;
  /** Source copy before per-platform adaptation */
  masterDraftText?: string | null;
  /** Per-platform adapted drafts from Adapt skill */
  platformVariants?: Partial<
    Record<
      import("./social-channels").SocialPlatformId,
      { draftText: string; format: import("./social-channels").ContentFormat }
    >
  >;
  imageUrl?: string | null;
  imagePath?: string | null;
  videoUrl?: string | null;
  videoPath?: string | null;
  /** A/B hook lines — first line / opener variants */
  hookVariants?: HookVariant[];
  selectedHookId?: string | null;
  /** Thumbnail A/B variants */
  thumbnailVariants?: ThumbnailVariant[];
  selectedThumbnailId?: string | null;
  /** Video caption render style */
  captionStyle?: CaptionStyle;
  /** Multi-slide carousel assets */
  carouselSlides?: CarouselSlide[];
  /** Multi-clip timeline for advanced render */
  timelineClips?: TimelineClip[];
  /** Pinterest board override */
  pinterestBoardId?: string | null;
  /** Idea backlog — not in active pipeline until promoted */
  inIdeaBacklog?: boolean;
  /** Last publish intent id for receipt correlation */
  pendingPublishIntentId?: string | null;
  /** When operator approval is required before bridge send */
  approvalRequestedAt?: string | null;
  approvalNote?: string | null;
  /** Platform-native id for metrics pull (tweet id, LinkedIn URN) */
  platformPostId?: string | null;
  /** Scheduled first comment (IG/LinkedIn/X) — queued as reply after publish */
  firstCommentText?: string | null;
  /** When to send first comment (ISO); default ~15s after publish if unset */
  firstCommentScheduledAt?: string | null;
  /** Accessibility alt text for image posts */
  altText?: string | null;
  /** Last bridge publish error for recovery UX */
  lastPublishError?: string | null;
  /** X thread parts — when set, publish as chained tweets */
  threadParts?: string[] | null;
  /** UTM campaign override for link attribution */
  utmCampaign?: string | null;
  utmSource?: string | null;
  /** Evergreen — auto-recycle on interval after publish */
  evergreen?: boolean;
  evergreenIntervalDays?: number | null;
  evergreenLastRecycledAt?: string | null;
  /** Link to content library asset */
  libraryAssetId?: string | null;
  /** Source post when cloned from evergreen/library */
  sourcePostId?: string | null;
  /** Cached performance prediction score 0–100 from pre-flight */
  performanceScore?: number | null;
  /** Bluesky AT URI / root for thread replies */
  platformPostUri?: string | null;
  platformPostCid?: string | null;
  /** Campaign grouping for multi-channel launches */
  campaignId?: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentQueueFile {
  version: 1;
  posts: ContentPost[];
  updatedAt: string;
}

export interface ContentPlatformVaultEntry {
  id: SocialPlatformId;
  name: string;
  short: string;
  category: string;
  charLimit: number | null;
  videoMaxSec: number | null;
  formats: ContentFormat[];
  bridgeTier: BridgeTier;
  bridgeTool: string | null;
  configured: boolean;
  enabledInFre: boolean;
  statusLabel: string;
  notes: string;
}

export interface ContentPlatformVault {
  platforms: ContentPlatformVaultEntry[];
  liveCount: number;
  configuredCount: number;
  enabledCount: number;
}

export interface ContentQueueStatus {
  source: "live" | "demo";
  bridgeConfigured: boolean;
  contentTone: string;
  channels: string[];
  posts: ContentPost[];
  campaigns?: import("./content-campaign-types").ContentCampaign[];
  updatedAt: string;
  platformVault: ContentPlatformVault;
}

export function postEta(post: ContentPost): string {
  if (post.stage === "PUBLISHED") return post.publishedUrl ?? "Published";
  if (post.stage === "SUBMITTED") return "Awaiting bridge";
  if (post.stage === "PENDING_APPROVAL") return "Needs approval";
  if (post.inIdeaBacklog) return "Idea backlog";
  if (post.stage === "SCHEDULED" && post.scheduledAt) {
    try {
      return new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Scheduled";
    }
  }
  if (post.stage === "SCRIPT" || post.stage === "IDEATE") return "Local LLM";
  if (post.stage === "RENDER") return "Video render";
  return "Bridge";
}
