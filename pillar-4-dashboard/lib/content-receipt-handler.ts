import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import { extractPublishedUrl } from "./digital-protocol";
import { recordMetricsFromReceipt } from "./content-analytics-store";
import { notifyPublishWebhook } from "./content-webhooks";
import { failPostPublish, getContentPost, markPostPublished } from "./content-queue-store";
import { syncPostAssetsToCdn } from "./content-cdn-sync";
import { extractTweetId, normalizeLinkedInUrn } from "./content-metrics-ingest";

import { recordBridgeReceipt } from "./content-bridge-health-store";

export function extractPlatformPostId(receipt: DigitalReceipt, platform: string): string | null {
  const r = receipt.receipt;
  const raw = r.post_id ?? r.pin_id ?? r.video_id;
  if (typeof raw === "string" && raw.trim()) {
    if (platform === "linkedin") return normalizeLinkedInUrn(raw);
    return raw;
  }
  if (platform === "x") {
    const url = extractPublishedUrl(receipt);
    if (url) {
      const m = url.match(/status\/(\d+)/);
      if (m?.[1]) return m[1];
    }
  }
  return null;
}

export async function handlePublishReceipt(
  receipt: DigitalReceipt,
  postId: string,
): Promise<{ post: import("./content-queue-types").ContentPost | null; webhook: { sent: number; errors: string[] } }> {
  await recordBridgeReceipt(receipt);
  const webhook = await notifyPublishWebhook(receipt, postId);

  if (!receipt.ok) {
    const post = await failPostPublish(postId, receipt.error ?? "Publish failed");
    return { post, webhook };
  }

  const url = extractPublishedUrl(receipt);
  const existing = await getContentPost(postId);
  const platform = existing?.platform ?? String(receipt.receipt.platform ?? "");
  const platformPostId = extractPlatformPostId(receipt, platform);
  const blueskyUri = typeof receipt.receipt.uri === "string" ? receipt.receipt.uri : null;
  const blueskyCid = typeof receipt.receipt.cid === "string" ? receipt.receipt.cid : null;
  const post = await markPostPublished(postId, url, platformPostId, {
    platformPostUri: platform === "bluesky" ? blueskyUri : existing?.platformPostUri ?? null,
    platformPostCid: platform === "bluesky" ? blueskyCid : existing?.platformPostCid ?? null,
  });
  if (post) {
    await recordMetricsFromReceipt(
      postId,
      post.platform,
      post.selectedHookId ?? null,
      platformPostId,
      post.selectedThumbnailId ?? null,
    );
    await syncPostAssetsToCdn(post);
    const { upsertLibraryAssetFromPost } = await import("./content-library-store");
    await upsertLibraryAssetFromPost(post, {
      evergreen: post.evergreen === true,
      evergreenIntervalDays: post.evergreenIntervalDays ?? undefined,
    });
    const { queueFirstCommentAfterPublish } = await import("./content-first-comment");
    await queueFirstCommentAfterPublish(post);
  }
  return { post, webhook };
}

export async function resolvePostIdForReceipt(
  receipt: DigitalReceipt,
  fallbackPostId?: string,
): Promise<string | null> {
  const fromPayload = receipt.receipt.post_id;
  if (typeof fromPayload === "string" && fromPayload.startsWith("POST-")) return fromPayload;

  if (fallbackPostId) {
    const post = await getContentPost(fallbackPostId);
    if (post?.pendingPublishIntentId === receipt.id || post?.stage === "SUBMITTED") {
      return fallbackPostId;
    }
  }

  const posts = await import("./content-queue-store").then((m) => m.ensureContentQueue());
  const submitted = posts.posts.find((p) => p.pendingPublishIntentId === receipt.id);
  return submitted?.id ?? fallbackPostId ?? null;
}
