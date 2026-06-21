import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createContentPost, ensureContentQueue, getContentPost } from "./content-queue-store";
import { enqueueContentReply } from "./content-replies-store";
import { generateText } from "./local-inference";
import type { SocialEngageEvent } from "./content-social-engage-types";
import { isSocialPlatform } from "./social-channels";
import type { SocialPlatformId } from "./social-channels";
import { extractTweetId, normalizeLinkedInUrn } from "./content-metrics-ingest";

export interface EngageSuggestion {
  id: string;
  source: "engage" | "inbox" | "comment";
  channel: string;
  author: string;
  text: string;
  platform: string | null;
  eventKind?: "mention" | "reply" | "comment" | null;
  externalId?: string | null;
  parentPostId?: string | null;
  threadUrl?: string | null;
  channelType?: string | null;
  externalChatId?: string | null;
  routedAppId?: string | null;
  sessionId?: string | null;
  convertedPostId: string | null;
  convertedReplyId: string | null;
  anchorPostId: string | null;
  createdAt: string;
}

interface EngageInboxFile {
  version: 1;
  suggestions: EngageSuggestion[];
  updatedAt: string;
}

function inboxPath(): string {
  return process.env.CURXOR_ENGAGE_INBOX_PATH ?? "/etc/curxor/engage-inbox.json";
}

async function readInbox(): Promise<EngageInboxFile> {
  try {
    const raw = await readFile(inboxPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<EngageInboxFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.suggestions)) throw new Error("invalid");
    return {
      version: 1,
      suggestions: parsed.suggestions.map((s) => normalizeSuggestion(s as Partial<EngageSuggestion>)),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, suggestions: [], updatedAt: new Date().toISOString() };
  }
}

async function writeInbox(data: EngageInboxFile): Promise<void> {
  const filePath = inboxPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listEngageSuggestions(unconvertedOnly = false): Promise<EngageSuggestion[]> {
  const file = await readInbox();
  const rows = unconvertedOnly
    ? file.suggestions.filter((s) => !s.convertedPostId && !s.convertedReplyId)
    : file.suggestions;
  return rows.slice(0, 48);
}

export async function addEngageSuggestion(input: {
  source?: EngageSuggestion["source"];
  channel: string;
  author: string;
  text: string;
  platform?: string | null;
  eventKind?: EngageSuggestion["eventKind"];
  externalId?: string | null;
  parentPostId?: string | null;
  threadUrl?: string | null;
  anchorPostId?: string | null;
  channelType?: string | null;
  externalChatId?: string | null;
  routedAppId?: string | null;
  sessionId?: string | null;
}): Promise<EngageSuggestion> {
  const file = await readInbox();
  const trimmed = input.text.trim();
  if (input.externalId) {
    const existing = file.suggestions.find((s) => s.externalId === input.externalId);
    if (existing) return existing;
  }
  const dup = file.suggestions.find(
    (s) =>
      !s.convertedPostId &&
      !s.convertedReplyId &&
      s.author === input.author.trim() &&
      s.text === trimmed &&
      Date.now() - Date.parse(s.createdAt) < 120_000,
  );
  if (dup) return dup;

  const suggestion: EngageSuggestion = {
    id: randomUUID(),
    source: input.source ?? "engage",
    channel: input.channel,
    author: input.author,
    text: trimmed,
    platform: input.platform ?? null,
    eventKind: input.eventKind ?? null,
    externalId: input.externalId ?? null,
    parentPostId: input.parentPostId ?? null,
    threadUrl: input.threadUrl ?? null,
    anchorPostId: input.anchorPostId ?? null,
    channelType: input.channelType ?? null,
    externalChatId: input.externalChatId ?? null,
    routedAppId: input.routedAppId ?? null,
    sessionId: input.sessionId ?? null,
    convertedPostId: null,
    convertedReplyId: null,
    createdAt: new Date().toISOString(),
  };
  file.suggestions.unshift(suggestion);
  if (file.suggestions.length > 96) file.suggestions = file.suggestions.slice(0, 96);
  await writeInbox(file);
  return suggestion;
}

export async function ingestSocialEngageEvent(event: SocialEngageEvent): Promise<EngageSuggestion | null> {
  const text = event.text.trim();
  if (!text) return null;

  const anchorPostId = await resolveAnchorPostIdForSocialParent(event.platform, event.parentPostId);

  return addEngageSuggestion({
    source: "comment",
    channel: event.channel,
    author: event.author,
    text,
    platform: event.platform,
    eventKind: event.kind,
    externalId: event.externalId,
    parentPostId: event.parentPostId,
    threadUrl: event.threadUrl,
    anchorPostId,
  });
}

async function resolveAnchorPostIdForSocialParent(
  platform: string,
  parentPostId: string | null,
): Promise<string | null> {
  if (!parentPostId) return null;
  const queue = await ensureContentQueue();
  for (const post of queue.posts) {
    if (post.stage !== "PUBLISHED" || post.platform !== platform) continue;
    const tweetId = post.platform === "x" ? extractTweetId(post) : null;
    const liUrn = post.platform === "linkedin" && post.platformPostId ? normalizeLinkedInUrn(post.platformPostId) : null;
    if (
      post.platformPostId === parentPostId ||
      tweetId === parentPostId ||
      liUrn === parentPostId ||
      liUrn === normalizeLinkedInUrn(parentPostId)
    ) {
      return post.id;
    }
  }
  return null;
}

export async function convertSuggestionToDraft(
  suggestionId: string,
  platform: import("./social-channels").SocialPlatformId,
): Promise<{ suggestion: EngageSuggestion; post: import("./content-queue-types").ContentPost } | null> {
  const file = await readInbox();
  const idx = file.suggestions.findIndex((s) => s.id === suggestionId);
  if (idx < 0) return null;

  const suggestion = file.suggestions[idx]!;
  const draftText = `Reply to @${suggestion.author}:\n${suggestion.text}`;
  const post = await createContentPost({
    channel: `Engage · ${suggestion.channel}`,
    platform,
    draftText,
  });

  file.suggestions[idx] = { ...suggestion, convertedPostId: post.id };
  await writeInbox(file);
  return { suggestion: file.suggestions[idx]!, post };
}

function normalizeSuggestion(raw: Partial<EngageSuggestion>): EngageSuggestion {
  return {
    id: String(raw.id ?? ""),
    source: (raw.source as EngageSuggestion["source"]) ?? "engage",
    channel: String(raw.channel ?? ""),
    author: String(raw.author ?? ""),
    text: String(raw.text ?? ""),
    platform: typeof raw.platform === "string" ? raw.platform : null,
    eventKind: (raw.eventKind as EngageSuggestion["eventKind"]) ?? null,
    externalId: typeof raw.externalId === "string" ? raw.externalId : null,
    parentPostId: typeof raw.parentPostId === "string" ? raw.parentPostId : null,
    threadUrl: typeof raw.threadUrl === "string" ? raw.threadUrl : null,
    channelType: typeof raw.channelType === "string" ? raw.channelType : null,
    externalChatId: typeof raw.externalChatId === "string" ? raw.externalChatId : null,
    routedAppId: typeof raw.routedAppId === "string" ? raw.routedAppId : null,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
    convertedPostId: typeof raw.convertedPostId === "string" ? raw.convertedPostId : null,
    convertedReplyId: typeof raw.convertedReplyId === "string" ? raw.convertedReplyId : null,
    anchorPostId: typeof raw.anchorPostId === "string" ? raw.anchorPostId : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
  };
}

async function resolveAnchorPost(
  anchorPostId?: string | null,
  platformHint?: string | null,
  parentPostId?: string | null,
): Promise<import("./content-queue-types").ContentPost | null> {
  if (anchorPostId) {
    const post = await getContentPost(anchorPostId);
    if (post?.stage === "PUBLISHED") return post;
  }
  if (platformHint && parentPostId) {
    const linked = await resolveAnchorPostIdForSocialParent(platformHint, parentPostId);
    if (linked) {
      const post = await getContentPost(linked);
      if (post?.stage === "PUBLISHED") return post;
    }
  }
  const queue = await ensureContentQueue();
  const published = queue.posts.filter((p) => p.stage === "PUBLISHED");
  if (platformHint && isSocialPlatform(platformHint)) {
    const match = published.find((p) => p.platform === platformHint);
    if (match) return match;
  }
  return published[0] ?? null;
}

export async function draftEngageReply(
  suggestionId: string,
  tone = "friendly",
): Promise<{ suggestion: EngageSuggestion; draft: string } | null> {
  const file = await readInbox();
  const idx = file.suggestions.findIndex((s) => s.id === suggestionId);
  if (idx < 0) return null;
  const suggestion = file.suggestions[idx]!;

  const raw = await generateText(
    "Write a concise, human reply to this social message. Output only the reply text — no quotes or labels.",
    `Tone: ${tone}\nFrom @${suggestion.author} via ${suggestion.channel}:\n${suggestion.text}`,
  );
  const draft = (raw ?? `Thanks @${suggestion.author}!`).trim();
  return { suggestion, draft };
}

export async function convertSuggestionToReply(input: {
  suggestionId: string;
  replyText: string;
  anchorPostId?: string | null;
  autoPublish?: boolean;
}): Promise<{
  suggestion: EngageSuggestion;
  reply: import("./content-replies-store").ContentReply;
} | null> {
  const file = await readInbox();
  const idx = file.suggestions.findIndex((s) => s.id === input.suggestionId);
  if (idx < 0) return null;

  const suggestion = normalizeSuggestion(file.suggestions[idx]!);
  const parentFromSuggestion = suggestion.parentPostId;
  const anchor = await resolveAnchorPost(
    input.anchorPostId ?? suggestion.anchorPostId,
    suggestion.platform,
    parentFromSuggestion,
  );
  if (!anchor) {
    throw new Error("No published post to reply under — publish a post first or select an anchor");
  }

  const reply = await enqueueContentReply({
    postId: anchor.id,
    platform: anchor.platform,
    replyText: input.replyText.trim(),
    threadUrl: suggestion.threadUrl ?? anchor.publishedUrl,
    parentPostId: suggestion.parentPostId ?? anchor.platformPostId ?? null,
    parentUri: anchor.platformPostUri ?? null,
    parentCid: anchor.platformPostCid ?? null,
  });

  file.suggestions[idx] = {
    ...suggestion,
    convertedReplyId: reply.id,
    anchorPostId: anchor.id,
  };
  await writeInbox(file);

  if (input.autoPublish) {
    const { requestReplyPublish } = await import("./content-approval-service");
    await requestReplyPublish(reply.id, "engage");
  }

  return { suggestion: file.suggestions[idx]!, reply };
}
