import type { ContentPost } from "./content-queue-types";
import { platformFormatSpec, splitTitleBody, truncateForPlatform } from "./content-platform-format";
import type { MediaValidationResult } from "./content-media-validation";
import { charLimitForPlatform, getSocialChannel } from "./social-channels";

export interface PublishPreview {
  platform: string;
  platformName: string;
  format: string;
  tool: string | null;
  text: string;
  title: string | null;
  body: string | null;
  charCount: number;
  charLimit: number | null;
  withinLimit: boolean;
  hasImage: boolean;
  hasVideo: boolean;
  imageUrl: string | null;
  videoPath: string | null;
  validation: MediaValidationResult | null;
  hints: string[];
  layoutPreview: string[];
}

export function buildPublishPreview(
  post: ContentPost,
  validation: MediaValidationResult | null,
  bridgeTool: string | null,
): PublishPreview {
  const spec = platformFormatSpec(post.platform);
  const cap = charLimitForPlatform(post.platform);
  const text = truncateForPlatform(post.draftText.trim(), post.platform);
  const { title, body } = splitTitleBody(text, post.platform);

  const hints: string[] = [];
  if (spec.lineOneRule) hints.push(spec.lineOneRule);
  if (spec.hashtagHint) hints.push(spec.hashtagHint);
  if (spec.notes) hints.push(spec.notes);

  const layoutPreview: string[] = [];
  if (post.platform === "x" && text.includes("\n\n")) {
    layoutPreview.push("Thread-style layout — first tweet is the hook line");
  }
  if (post.platform === "instagram" && post.format === "carousel") {
    const slides = post.carouselSlides?.length ?? 0;
    layoutPreview.push(`Carousel grid — ${slides || "?"} slide(s)`);
  }
  if (post.platform === "linkedin" && title) {
    layoutPreview.push(`Link card title: ${title.slice(0, 80)}`);
  }
  if (post.platform === "youtube") {
    layoutPreview.push(`Video title: ${(title ?? text.split("\n")[0] ?? "").slice(0, 100)}`);
    if (post.imageUrl || post.imagePath) layoutPreview.push("Thumbnail shown in browse/search");
  }

  return {
    platform: post.platform,
    platformName: getSocialChannel(post.platform).name,
    format: post.format,
    tool: bridgeTool,
    text,
    title: title || null,
    body: body || null,
    charCount: text.length,
    charLimit: cap,
    withinLimit: cap === null || text.length <= cap,
    hasImage: Boolean(post.imageUrl || post.imagePath),
    hasVideo: Boolean(post.videoUrl || post.videoPath),
    imageUrl: post.imageUrl ?? null,
    videoPath: post.videoPath ?? null,
    validation,
    hints,
    layoutPreview,
  };
}
