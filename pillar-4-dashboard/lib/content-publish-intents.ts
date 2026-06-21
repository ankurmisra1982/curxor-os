import "server-only";

import { getContentPost } from "./content-queue-store";
import { getContentReply } from "./content-replies-store";
import { charLimitForPlatform } from "./social-channels";
import { resolvePublishTool } from "./content-channels-status";
import { buildReplyIntent } from "./content-reply-publish";
import { applyUtmToDraftText } from "./content-utm";
import { readAppFreState } from "./app-fre-state";

function cfgStr(config: Record<string, unknown>, key: string, fallback = ""): string {
  const v = config[key];
  return typeof v === "string" ? v : fallback;
}

function resolveMediaForPost(
  post: {
    imageUrl?: string | null;
    imagePath?: string | null;
    videoUrl?: string | null;
    videoPath?: string | null;
  },
  config: Record<string, unknown>,
) {
  return {
    imageUrl: cfgStr(config, "selectedPostImageUrl", "") || post.imageUrl || "",
    videoUrl: cfgStr(config, "selectedPostVideoUrl", "") || post.videoUrl || "",
    videoPath: cfgStr(config, "selectedPostVideoPath", "") || post.videoPath || "",
  };
}

export async function buildDigitalIntentForPost(
  postId: string,
  config: Record<string, unknown>,
): Promise<{ tool: string; payload: Record<string, unknown> } | null> {
  const { resolvePostForPublish } = await import("./content-queue-store");
  const post = await resolvePostForPublish(postId);
  if (!post) return null;

  const { tool, tier } = resolvePublishTool(post.platform);
  if (tier !== "live") return null;

  const cap = charLimitForPlatform(post.platform) ?? 280;
  const media = resolveMediaForPost(post, config);
  const { imageUrl, videoUrl, videoPath } = media;

  if (post.platform === "instagram" && !imageUrl && !post.imagePath) return null;
  if (post.platform === "pinterest" && !imageUrl && !post.imagePath) return null;
  if (
    (post.platform === "tiktok" || post.platform === "youtube" || post.platform === "snapchat") &&
    !videoUrl &&
    !videoPath
  ) {
    return null;
  }

  const fre = await readAppFreState("my-content-creator");
  const mergedConfig = { ...fre.config, ...config };
  let publishText = applyUtmToDraftText(post.draftText, post, mergedConfig);

  if (post.platform === "instagram" || post.platform === "linkedin") {
    publishText = publishText.slice(0, cap);
  } else {
    publishText = publishText.slice(0, cap);
  }

  if (post.threadParts && post.threadParts.length > 1 && post.platform === "x") {
    publishText = post.threadParts[0]!.slice(0, cap);
  }

  const payload: Record<string, unknown> = {
    text: publishText,
    platform: post.platform,
    channel: post.platform,
    tone: cfgStr(config, "contentTone", "technical"),
    post_id: post.id,
    format: post.format,
  };
  if (post.threadParts && post.threadParts.length > 1) {
    payload.thread_parts = post.threadParts.map((t) => t.slice(0, cap));
  }
  if (imageUrl) payload.image_url = imageUrl;
  if (videoUrl) payload.video_url = videoUrl;
  if (videoPath) payload.video_path = videoPath;

  if (post.altText) payload.alt_text = post.altText;

  const boardId =
    post.pinterestBoardId || cfgStr(config, "selectedBoardId", "") || cfgStr(config, "pinterestBoardId", "");
  if (boardId) payload.board_id = boardId;

  return { tool, payload };
}

export async function buildDigitalIntentForReply(
  replyId: string,
): Promise<{ tool: string; payload: Record<string, unknown> } | null> {
  const reply = await getContentReply(replyId);
  if (!reply) return null;
  return buildReplyIntent(reply);
}
