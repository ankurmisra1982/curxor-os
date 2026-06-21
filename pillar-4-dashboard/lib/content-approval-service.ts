import "server-only";

import { appendAuditEntry } from "./content-audit-store";
import { requirePublishApproval, requireReplyApproval } from "./content-approval-config";
import {
  failPostPublish,
  getContentPost,
  listPendingApprovalPosts,
  markPostPendingApproval,
} from "./content-queue-store";
import {
  getContentReply,
  listPendingApprovalReplies,
  markReplyFailed,
  markReplyPendingApproval,
  updateReplyStatus,
  type ContentReply,
  type ReplyStatus,
} from "./content-replies-store";
import { assertPostPreflightReady } from "./content-preflight";
import { isPublishingPaused } from "./content-ops-controls";
import { publishPostToBridge, publishReplyToBridge } from "./content-publish-executor";
import {
  notifyPostPendingApproval,
  notifyReplyPendingApproval,
} from "./content-approval-telegram";
import {
  notifyPostPendingApprovalSlack,
  notifyReplyPendingApprovalSlack,
} from "./content-approval-slack";
import { readAppFreState } from "./app-fre-state";
import type { ContentPost } from "./content-queue-types";

export interface ApprovalQueue {
  posts: ContentPost[];
  replies: ContentReply[];
}

export async function listApprovalQueue(): Promise<ApprovalQueue> {
  const [posts, replies] = await Promise.all([listPendingApprovalPosts(), listPendingApprovalReplies()]);
  return { posts, replies };
}

export async function requestPostPublish(
  postId: string,
  config: Record<string, unknown>,
  actor = "system",
): Promise<
  | { mode: "published"; result: Awaited<ReturnType<typeof publishPostToBridge>> }
  | { mode: "pending"; post: ContentPost }
> {
  if (!(await requirePublishApproval())) {
    const result = await publishPostToBridge(postId, config);
    await appendAuditEntry({
      action: "publish_post",
      targetType: "post",
      targetId: postId,
      actor,
      detail: result.ok ? "Published via bridge" : result.error ?? "Publish failed",
      meta: { intentId: result.id, ok: result.ok },
    });
    return { mode: "published", result };
  }

  const existing = await getContentPost(postId);
  if (existing?.stage === "PENDING_APPROVAL") {
    return { mode: "pending", post: existing };
  }

  const post = await markPostPendingApproval(postId);
  if (!post) throw new Error("Post not found");

  await appendAuditEntry({
    action: "submit_post_approval",
    targetType: "post",
    targetId: postId,
    actor,
    detail: `Post queued for approval · ${post.platform} · ${post.channel}`,
    meta: { platform: post.platform },
  });

  void notifyPostPendingApproval(post).catch(() => undefined);
  void notifyPostPendingApprovalSlack(post).catch(() => undefined);

  return { mode: "pending", post };
}

export async function approvePost(
  postId: string,
  actor = "operator",
): Promise<Awaited<ReturnType<typeof publishPostToBridge>>> {
  if (await isPublishingPaused()) {
    throw new Error("Publishing is paused — resume in Ops controls or /resume via Telegram");
  }
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");
  if (post.stage !== "PENDING_APPROVAL") throw new Error("Post is not pending approval");

  await assertPostPreflightReady(postId);

  const fre = await readAppFreState("my-content-creator");
  const result = await publishPostToBridge(postId, fre.config);

  await appendAuditEntry({
    action: "approve_post",
    targetType: "post",
    targetId: postId,
    actor,
    detail: result.ok ? "Approved and sent to bridge" : result.error ?? "Bridge send failed",
    meta: { intentId: result.id, ok: result.ok },
  });

  if (result.ok) {
    await appendAuditEntry({
      action: "publish_post",
      targetType: "post",
      targetId: postId,
      actor,
      detail: "Publish intent submitted after approval",
      meta: { intentId: result.id },
    });
  }

  return result;
}

export async function rejectPost(
  postId: string,
  reason?: string,
  actor = "operator",
): Promise<ContentPost | null> {
  const post = await getContentPost(postId);
  if (!post || post.stage !== "PENDING_APPROVAL") return null;

  const reverted = await failPostPublish(postId, reason ?? "Rejected by operator", { notify: false });

  await appendAuditEntry({
    action: "reject_post",
    targetType: "post",
    targetId: postId,
    actor,
    detail: reason?.trim() || "Publish rejected",
  });

  return reverted;
}

export async function requestReplyPublish(
  replyId: string,
  actor = "system",
): Promise<
  | { mode: "published"; result: Awaited<ReturnType<typeof publishReplyToBridge>> }
  | { mode: "pending"; reply: ContentReply }
> {
  if (!(await requireReplyApproval())) {
    const result = await publishReplyToBridge(replyId);
    await appendAuditEntry({
      action: "publish_reply",
      targetType: "reply",
      targetId: replyId,
      actor,
      detail: result.ok ? "Reply sent via bridge" : result.error ?? "Reply failed",
      meta: { intentId: result.id, ok: result.ok },
    });
    return { mode: "published", result };
  }

  const existing = await getContentReply(replyId);
  if (existing?.status === "pending_approval") {
    return { mode: "pending", reply: existing };
  }

  const reply = await markReplyPendingApproval(replyId);
  if (!reply) throw new Error("Reply not found");

  await appendAuditEntry({
    action: "submit_reply_approval",
    targetType: "reply",
    targetId: replyId,
    actor,
    detail: `Reply queued for approval · ${reply.platform}`,
    meta: { postId: reply.postId, platform: reply.platform },
  });

  void notifyReplyPendingApproval(reply).catch(() => undefined);
  void notifyReplyPendingApprovalSlack(reply).catch(() => undefined);

  return { mode: "pending", reply };
}

export async function approveReply(
  replyId: string,
  actor = "operator",
): Promise<Awaited<ReturnType<typeof publishReplyToBridge>>> {
  const reply = await getContentReply(replyId);
  if (!reply) throw new Error("Reply not found");
  if (reply.status !== "pending_approval") throw new Error("Reply is not pending approval");

  await updateReplyStatus(replyId, { status: "queued", error: null });
  const result = await publishReplyToBridge(replyId);

  await appendAuditEntry({
    action: "approve_reply",
    targetType: "reply",
    targetId: replyId,
    actor,
    detail: result.ok ? "Approved and sent to bridge" : result.error ?? "Bridge send failed",
    meta: { intentId: result.id, ok: result.ok },
  });

  if (result.ok) {
    await appendAuditEntry({
      action: "publish_reply",
      targetType: "reply",
      targetId: replyId,
      actor,
      detail: "Reply intent submitted after approval",
      meta: { intentId: result.id },
    });
  }

  return result;
}

export async function rejectReply(
  replyId: string,
  reason?: string,
  actor = "operator",
): Promise<ContentReply | null> {
  const reply = await getContentReply(replyId);
  if (!reply || reply.status !== "pending_approval") return null;

  const rejected = await markReplyFailed(replyId, reason?.trim() || "Rejected by operator");

  await appendAuditEntry({
    action: "reject_reply",
    targetType: "reply",
    targetId: replyId,
    actor,
    detail: reason?.trim() || "Reply rejected",
  });

  return rejected;
}

export async function initialReplyStatus(): Promise<ReplyStatus> {
  return (await requireReplyApproval()) ? "pending_approval" : "queued";
}
