import "server-only";

import { resolvePostForPublish } from "./content-queue-store";
import { resolvePublishTool } from "./content-channels-status";
import { charLimitForPlatform } from "./social-channels";

export async function buildDigitalIntent(
  config: Record<string, unknown>,
): Promise<{ tool: string; payload: Record<string, unknown> } | null> {
  const postId = typeof config.selectedPostId === "string" ? config.selectedPostId : "";
  const post = postId ? await resolvePostForPublish(postId) : null;
  if (!post) return null;

  const { tool, tier } = resolvePublishTool(post.platform);
  if (tier !== "live") return null;

  const cap = charLimitForPlatform(post.platform) ?? 280;
  const tone = typeof config.contentTone === "string" ? config.contentTone : "technical";

  const payload: Record<string, unknown> = {
    text: post.draftText.slice(0, cap),
    platform: post.platform,
    channel: post.platform,
    tone,
    post_id: post.id,
    format: post.format,
  };

  if (post.imageUrl) payload.image_url = post.imageUrl;
  if (post.videoUrl) payload.video_url = post.videoUrl;
  if (post.videoPath) payload.video_path = post.videoPath;
  if (post.pinterestBoardId) payload.board_id = post.pinterestBoardId;

  return { tool, payload };
}
