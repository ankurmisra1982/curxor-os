import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ReplyStatus = "pending_approval" | "queued" | "scheduled" | "submitted" | "sent" | "failed";

export interface ContentReply {
  id: string;
  postId: string;
  platform: string;
  threadUrl: string | null;
  parentPostId: string | null;
  parentUri: string | null;
  parentCid: string | null;
  replyText: string;
  scheduledAt: string | null;
  status: ReplyStatus;
  error: string | null;
  sentUrl: string | null;
  platformReplyId: string | null;
  approvalNote: string | null;
  pendingIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RepliesFile {
  version: 1;
  replies: ContentReply[];
  updatedAt: string;
}

function repliesPath(): string {
  return process.env.CURXOR_CONTENT_REPLIES_PATH ?? "/etc/curxor/content-replies.json";
}

function normalizeReply(raw: Partial<ContentReply>): ContentReply {
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === "string" ? raw.id : randomUUID(),
    postId: typeof raw.postId === "string" ? raw.postId : "",
    platform: typeof raw.platform === "string" ? raw.platform : "x",
    threadUrl: typeof raw.threadUrl === "string" ? raw.threadUrl : null,
    parentPostId: typeof raw.parentPostId === "string" ? raw.parentPostId : null,
    parentUri: typeof raw.parentUri === "string" ? raw.parentUri : null,
    parentCid: typeof raw.parentCid === "string" ? raw.parentCid : null,
    replyText: typeof raw.replyText === "string" ? raw.replyText : "",
    scheduledAt: typeof raw.scheduledAt === "string" ? raw.scheduledAt : null,
    status: (raw.status as ReplyStatus) ?? "queued",
    error: typeof raw.error === "string" ? raw.error : null,
    sentUrl: typeof raw.sentUrl === "string" ? raw.sentUrl : null,
    platformReplyId: typeof raw.platformReplyId === "string" ? raw.platformReplyId : null,
    approvalNote: typeof raw.approvalNote === "string" ? raw.approvalNote : null,
    pendingIntentId: typeof raw.pendingIntentId === "string" ? raw.pendingIntentId : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

async function readReplies(): Promise<RepliesFile> {
  try {
    const raw = await readFile(repliesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RepliesFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.replies)) throw new Error("invalid");
    return {
      version: 1,
      replies: parsed.replies.map((r) => normalizeReply(r)),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, replies: [], updatedAt: new Date().toISOString() };
  }
}

async function writeReplies(data: RepliesFile): Promise<void> {
  const filePath = repliesPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listContentReplies(postId?: string): Promise<ContentReply[]> {
  const file = await readReplies();
  const rows = postId ? file.replies.filter((r) => r.postId === postId) : file.replies;
  return rows.slice(0, 64);
}

export async function getContentReply(replyId: string): Promise<ContentReply | null> {
  const file = await readReplies();
  return file.replies.find((r) => r.id === replyId) ?? null;
}

export async function enqueueContentReply(input: {
  postId: string;
  platform: string;
  replyText: string;
  threadUrl?: string | null;
  parentPostId?: string | null;
  parentUri?: string | null;
  parentCid?: string | null;
  scheduledAt?: string | null;
  forceQueued?: boolean;
}): Promise<ContentReply> {
  const { initialReplyStatus } = await import("./content-approval-service");
  const file = await readReplies();
  const now = new Date().toISOString();
  let status: ReplyStatus = "queued";
  if (input.scheduledAt) {
    status = "scheduled";
  } else if (!input.forceQueued) {
    status = await initialReplyStatus();
  }

  const reply: ContentReply = {
    id: randomUUID(),
    postId: input.postId,
    platform: input.platform,
    threadUrl: input.threadUrl ?? null,
    parentPostId: input.parentPostId ?? null,
    parentUri: input.parentUri ?? null,
    parentCid: input.parentCid ?? null,
    replyText: input.replyText.trim(),
    scheduledAt: input.scheduledAt ?? null,
    status,
    error: null,
    sentUrl: null,
    platformReplyId: null,
    approvalNote: null,
    pendingIntentId: null,
    createdAt: now,
    updatedAt: now,
  };
  file.replies.unshift(reply);
  await writeReplies(file);
  return reply;
}

export async function updateReplyStatus(
  replyId: string,
  patch: Partial<
    Pick<
      ContentReply,
      "status" | "error" | "scheduledAt" | "sentUrl" | "platformReplyId" | "pendingIntentId" | "approvalNote"
    >
  >,
): Promise<ContentReply | null> {
  const file = await readReplies();
  const idx = file.replies.findIndex((r) => r.id === replyId);
  if (idx < 0) return null;
  file.replies[idx] = { ...file.replies[idx]!, ...patch, updatedAt: new Date().toISOString() };
  await writeReplies(file);
  return file.replies[idx]!;
}

export async function markReplySubmitted(replyId: string, intentId: string): Promise<ContentReply | null> {
  return updateReplyStatus(replyId, { status: "submitted", pendingIntentId: intentId, error: null });
}

export async function markReplySent(
  replyId: string,
  patch: { sentUrl?: string | null; platformReplyId?: string | null; postId?: string },
): Promise<ContentReply | null> {
  return updateReplyStatus(replyId, {
    status: "sent",
    sentUrl: patch.sentUrl ?? null,
    platformReplyId: patch.platformReplyId ?? null,
    pendingIntentId: null,
    error: null,
  });
}

export async function markReplyFailed(replyId: string, error: string): Promise<ContentReply | null> {
  return updateReplyStatus(replyId, { status: "failed", error, pendingIntentId: null });
}

export async function markReplyPendingApproval(
  replyId: string,
  note?: string | null,
): Promise<ContentReply | null> {
  return updateReplyStatus(replyId, { status: "pending_approval", error: null, approvalNote: note ?? null });
}

export async function listPendingApprovalReplies(): Promise<ContentReply[]> {
  const file = await readReplies();
  return file.replies.filter((r) => r.status === "pending_approval");
}

export async function dueReplies(): Promise<ContentReply[]> {
  const file = await readReplies();
  const now = Date.now();
  return file.replies.filter(
    (r) =>
      r.status === "scheduled" &&
      r.scheduledAt &&
      new Date(r.scheduledAt).getTime() <= now,
  );
}
