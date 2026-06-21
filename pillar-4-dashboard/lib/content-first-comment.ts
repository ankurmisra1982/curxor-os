import "server-only";

import { enqueueContentReply } from "./content-replies-store";
import type { ContentPost } from "./content-queue-types";

export async function queueFirstCommentAfterPublish(post: ContentPost): Promise<{ queued: boolean; replyId?: string }> {
  const text = post.firstCommentText?.trim();
  if (!text) return { queued: false };

  const defaultAt = new Date(Date.now() + 15_000).toISOString();
  const scheduledAt = post.firstCommentScheduledAt?.trim() || defaultAt;

  const reply = await enqueueContentReply({
    postId: post.id,
    platform: post.platform,
    replyText: text,
    threadUrl: post.publishedUrl ?? null,
    parentPostId: post.platformPostId ?? null,
    parentUri: post.platformPostUri ?? null,
    parentCid: post.platformPostCid ?? null,
    scheduledAt,
    forceQueued: true,
  });

  return { queued: true, replyId: reply.id };
}
