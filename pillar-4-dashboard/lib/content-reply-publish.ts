import "server-only";

import type { DigitalReceipt } from "./digital-protocol";
import { extractPublishedUrl } from "./digital-protocol";
import { getContentPost } from "./content-queue-store";
import { extractTweetId, normalizeLinkedInUrn } from "./content-metrics-ingest";
import {
  dueReplies,
  getContentReply,
  listContentReplies,
  markReplyFailed,
  markReplySent,
  type ContentReply,
} from "./content-replies-store";
import { recordBridgeReceipt } from "./content-bridge-health-store";
import { charLimitForPlatform } from "./social-channels";

const REPLY_PLATFORMS = new Set(["x", "threads", "linkedin", "bluesky"]);

export function replyPlatformSupported(platform: string): boolean {
  return REPLY_PLATFORMS.has(platform);
}

export async function resolveParentForReply(reply: ContentReply): Promise<{
  parentPostId: string | null;
  threadUrl: string | null;
  parentUri: string | null;
  parentCid: string | null;
}> {
  if (reply.parentPostId) {
    return {
      parentPostId: reply.parentPostId,
      threadUrl: reply.threadUrl,
      parentUri: reply.parentUri,
      parentCid: reply.parentCid,
    };
  }

  const post = await getContentPost(reply.postId);
  if (!post) {
    return { parentPostId: null, threadUrl: reply.threadUrl, parentUri: null, parentCid: null };
  }

  let parentPostId: string | null = post.platformPostId ?? null;
  if (!parentPostId && post.platform === "x") {
    parentPostId = extractTweetId(post);
  }
  if (!parentPostId && post.platform === "linkedin" && post.publishedUrl) {
    parentPostId = post.publishedUrl.includes("urn:li:")
      ? post.publishedUrl
      : post.platformPostId
        ? normalizeLinkedInUrn(post.platformPostId)
        : null;
  }

  return {
    parentPostId,
    threadUrl: reply.threadUrl ?? post.publishedUrl ?? null,
    parentUri: post.platformPostUri ?? null,
    parentCid: post.platformPostCid ?? null,
  };
}

export async function buildReplyIntent(reply: ContentReply): Promise<{
  tool: string;
  payload: Record<string, unknown>;
} | null> {
  if (!replyPlatformSupported(reply.platform)) return null;
  const parent = await resolveParentForReply(reply);
  if (!parent.parentPostId && !parent.threadUrl) return null;

  const cap = charLimitForPlatform(reply.platform as import("./social-channels").SocialPlatformId) ?? 280;
  const payload: Record<string, unknown> = {
    platform: reply.platform,
    text: reply.replyText.slice(0, cap),
    reply_id: reply.id,
    post_id: reply.postId,
  };
  if (parent.parentPostId) payload.parent_post_id = parent.parentPostId;
  if (parent.threadUrl) payload.thread_url = parent.threadUrl;
  if (reply.platform === "bluesky") {
    if (parent.parentUri) payload.parent_uri = parent.parentUri;
    if (parent.parentCid) payload.parent_cid = parent.parentCid;
    if (parent.parentUri) payload.root_uri = parent.parentUri;
    if (parent.parentCid) payload.root_cid = parent.parentCid;
  }
  return { tool: "content.publish_reply", payload };
}

export async function publishReply(replyId: string): Promise<{
  ok: boolean;
  reply?: ContentReply;
  error?: string;
  intentId?: string;
}> {
  const reply = await getContentReply(replyId);
  if (!reply) return { ok: false, error: "Reply not found" };
  if (reply.status === "sent" || reply.status === "submitted") {
    return { ok: false, error: `Reply already ${reply.status}` };
  }
  if (reply.status === "pending_approval") {
    return { ok: false, error: "Reply awaiting operator approval" };
  }

  const intent = await buildReplyIntent(reply);
  if (!intent) {
    await markReplyFailed(reply.id, "Missing parent post id or unsupported platform");
    return { ok: false, error: "Cannot build reply intent" };
  }

  const { requestReplyPublish } = await import("./content-approval-service");
  const out = await requestReplyPublish(replyId, "system");
  if (out.mode === "pending") {
    return { ok: true, reply: out.reply, error: "awaiting approval" };
  }
  if (!out.result.ok) {
    return { ok: false, error: out.result.error, reply: (await getContentReply(replyId)) ?? undefined };
  }
  const updated = await getContentReply(replyId);
  return { ok: true, reply: updated ?? undefined, intentId: out.result.id };
}

export async function processDueReplies(limit = 8): Promise<
  Array<{ replyId: string; ok: boolean; error?: string; intentId?: string }>
> {
  const due = await dueReplies();
  const queued = (await listContentReplies()).filter((r) => r.status === "queued");
  const targets = [...due, ...queued].slice(0, limit);
  const results: Array<{ replyId: string; ok: boolean; error?: string; intentId?: string }> = [];

  for (const reply of targets) {
    const out = await publishReply(reply.id);
    results.push({
      replyId: reply.id,
      ok: out.ok,
      error: out.error,
      intentId: out.intentId,
    });
  }
  return results;
}

export async function handleReplyReceipt(receipt: DigitalReceipt): Promise<ContentReply | null> {
  const replyId =
    typeof receipt.receipt.reply_id === "string" && receipt.receipt.reply_id
      ? receipt.receipt.reply_id
      : null;
  if (!replyId) return null;

  if (!receipt.ok) {
    await recordBridgeReceipt(receipt);
    return markReplyFailed(replyId, receipt.error ?? "Reply publish failed");
  }

  await recordBridgeReceipt(receipt);

  const url = extractPublishedUrl(receipt);
  const postId =
    typeof receipt.receipt.post_id === "string" ? receipt.receipt.post_id : undefined;
  const platformPostId =
    typeof receipt.receipt.post_id === "string"
      ? receipt.receipt.post_id
      : typeof receipt.receipt.uri === "string"
        ? receipt.receipt.uri
        : null;

  return markReplySent(replyId, {
    sentUrl: url,
    platformReplyId: platformPostId,
    postId,
  });
}
