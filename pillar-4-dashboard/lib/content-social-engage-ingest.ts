import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { envFlag } from "./digital-env";
import { loadDigitalEnv } from "./digital-env";
import { ensureContentQueue } from "./content-queue-store";
import { ingestSocialEngageEvent } from "./content-engage-bridge";
import {
  extractTweetId,
  normalizeLinkedInUrn,
  oauth1Authorization,
} from "./content-metrics-ingest";
import {
  getSocialEngagePollState,
  socialEngagePollDue,
  updateSocialEngageState,
} from "./content-social-engage-state";
import type { SocialEngageEvent, SocialEngagePollResult } from "./content-social-engage-types";

function socialEngageEnabled(): boolean {
  return envFlag("CURXOR_SOCIAL_ENGAGE_POLL_ENABLED", true);
}

async function xOAuthGet(url: string, queryParams: Record<string, string>): Promise<Record<string, unknown>> {
  const env = await loadDigitalEnv();
  const consumerKey = env.X_API_KEY?.trim();
  const consumerSecret = env.X_API_SECRET?.trim();
  const token = env.X_ACCESS_TOKEN?.trim();
  const tokenSecret = env.X_ACCESS_TOKEN_SECRET?.trim();
  if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
    throw new Error("X API credentials incomplete");
  }

  const baseUrl = url.split("?")[0]!;
  const qs = new URLSearchParams(queryParams).toString();
  const fullUrl = qs ? `${baseUrl}?${qs}` : baseUrl;
  const auth = oauth1Authorization("GET", baseUrl, queryParams, consumerKey, consumerSecret, token, tokenSecret);

  const res = await fetch(fullUrl, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof body.detail === "string" ? body.detail : JSON.stringify(body).slice(0, 200);
    throw new Error(`X API ${res.status}: ${err}`);
  }
  return body;
}

async function resolveXUserId(cached: string | null): Promise<string> {
  if (cached) return cached;
  const env = await loadDigitalEnv();
  if (env.X_USER_ID?.trim()) return env.X_USER_ID.trim();

  const data = await xOAuthGet("https://api.twitter.com/2/users/me", { "user.fields": "username" });
  const id = (data.data as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Could not resolve X user id");
  return id;
}

async function pollXMentions(state: Awaited<ReturnType<typeof getSocialEngagePollState>>): Promise<SocialEngagePollResult> {
  try {
    const userId = await resolveXUserId(state.xUserId);
    const params: Record<string, string> = {
      "tweet.fields": "author_id,created_at,in_reply_to_user_id,text,conversation_id",
      expansions: "author_id",
      "user.fields": "username,name",
      max_results: "10",
    };
    if (state.xMentionsSinceId) params.since_id = state.xMentionsSinceId;

    const data = await xOAuthGet(`https://api.twitter.com/2/users/${userId}/mentions`, params);
    const tweets = Array.isArray(data.data) ? (data.data as Array<Record<string, unknown>>) : [];
    const users = new Map<string, string>();
    const includes = data.includes as { users?: Array<{ id?: string; username?: string }> } | undefined;
    for (const u of includes?.users ?? []) {
      if (u.id && u.username) users.set(u.id, u.username);
    }

    let ingested = 0;
    let newestId = state.xMentionsSinceId;

    for (const tweet of tweets) {
      const tweetId = String(tweet.id ?? "");
      const authorId = String(tweet.author_id ?? "");
      const username = users.get(authorId) ?? authorId.slice(0, 8);
      const text = String(tweet.text ?? "").trim();
      if (!text || !tweetId) continue;

      const conversationId = String(tweet.conversation_id ?? tweetId);
      const event: SocialEngageEvent = {
        platform: "x",
        kind: "mention",
        externalId: `x:mention:${tweetId}`,
        author: username,
        text,
        parentPostId: conversationId !== tweetId ? conversationId : null,
        threadUrl: `https://x.com/i/web/status/${tweetId}`,
        channel: "X · mention",
      };
      const row = await ingestSocialEngageEvent(event);
      if (row) ingested += 1;
      if (!newestId || BigInt(tweetId) > BigInt(newestId)) newestId = tweetId;
    }

    await updateSocialEngageState({
      xUserId: userId,
      xMentionsSinceId: newestId ?? state.xMentionsSinceId,
    });

    return { platform: "x", ok: true, ingested };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { platform: "x", ok: false, ingested: 0, error: msg };
  }
}

async function pollXRepliesOnPublished(state: Awaited<ReturnType<typeof getSocialEngagePollState>>): Promise<number> {
  const env = await loadDigitalEnv();
  const bearer = env.X_BEARER_TOKEN?.trim();
  if (!bearer) return 0;

  const queue = await ensureContentQueue();
  const posts = queue.posts.filter((p) => p.stage === "PUBLISHED" && p.platform === "x").slice(0, 8);
  let ingested = 0;

  for (const post of posts) {
    const tweetId = extractTweetId(post);
    if (!tweetId) continue;

    const qs = new URLSearchParams({
      query: `conversation_id:${tweetId} -is:retweet`,
      "tweet.fields": "author_id,created_at,text,in_reply_to_user_id",
      expansions: "author_id",
      "user.fields": "username",
      max_results: "10",
    });

    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${qs}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    if (!res.ok) continue;

    const data = (await res.json()) as {
      data?: Array<{ id?: string; author_id?: string; text?: string; in_reply_to_user_id?: string }>;
      includes?: { users?: Array<{ id?: string; username?: string }> };
    };

    const users = new Map<string, string>();
    for (const u of data.includes?.users ?? []) {
      if (u.id && u.username) users.set(u.id, u.username);
    }

    for (const tweet of data.data ?? []) {
      if (!tweet.id || tweet.id === tweetId) continue;
      const username = users.get(tweet.author_id ?? "") ?? "user";
      const text = (tweet.text ?? "").trim();
      if (!text) continue;

      const row = await ingestSocialEngageEvent({
        platform: "x",
        kind: "reply",
        externalId: `x:reply:${tweet.id}`,
        author: username,
        text,
        parentPostId: tweetId,
        threadUrl: `https://x.com/i/web/status/${tweet.id}`,
        channel: "X · reply",
      });
      if (row) ingested += 1;
    }
  }

  return ingested;
}

async function linkedInToken(): Promise<string> {
  const env = await loadDigitalEnv();
  const token = env.LINKEDIN_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LinkedIn access token missing");
  return token;
}

async function pollLinkedInComments(
  state: Awaited<ReturnType<typeof getSocialEngagePollState>>,
): Promise<SocialEngagePollResult> {
  try {
    const token = await linkedInToken();
    const apiVersion = process.env.CURXOR_LINKEDIN_API_VERSION ?? "202405";
    const queue = await ensureContentQueue();
    const posts = queue.posts.filter((p) => p.stage === "PUBLISHED" && p.platform === "linkedin").slice(0, 8);

    let ingested = 0;
    const cursors = { ...state.linkedInCommentCursors };

    for (const post of posts) {
      const urn = post.platformPostId
        ? normalizeLinkedInUrn(post.platformPostId)
        : post.publishedUrl?.includes("urn:li:")
          ? post.publishedUrl
          : null;
      if (!urn) continue;

      const encoded = encodeURIComponent(urn);
      const url = `https://api.linkedin.com/v2/socialActions/${encoded}/comments?count=20`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": apiVersion,
        },
        cache: "no-store",
      });
      if (!res.ok) continue;

      const payload = (await res.json()) as {
        elements?: Array<{
          id?: string;
          actor?: string;
          message?: { text?: string };
          created?: { time?: number };
        }>;
      };

      const lastSeen = cursors[urn] ?? "";
      let newest = lastSeen;

      for (const comment of payload.elements ?? []) {
        const commentId = String(comment.id ?? "");
        if (!commentId || commentId === lastSeen) continue;
        const text = comment.message?.text?.trim() ?? "";
        if (!text) continue;

        const author = (comment.actor ?? "linkedin-user").replace(/^urn:li:person:/, "member-");
        const row = await ingestSocialEngageEvent({
          platform: "linkedin",
          kind: "comment",
          externalId: `linkedin:comment:${commentId}`,
          author,
          text,
          parentPostId: urn,
          threadUrl: post.publishedUrl,
          channel: "LinkedIn · comment",
        });
        if (row) ingested += 1;
        if (!newest || commentId > newest) newest = commentId;
      }

      if (newest) cursors[urn] = newest;
    }

    await updateSocialEngageState({ linkedInCommentCursors: cursors });
    return { platform: "linkedin", ok: true, ingested };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { platform: "linkedin", ok: false, ingested: 0, error: msg };
  }
}

async function pollThreadsReplies(
  state: Awaited<ReturnType<typeof getSocialEngagePollState>>,
): Promise<SocialEngagePollResult> {
  try {
    const env = await loadDigitalEnv();
    const token = env.META_ACCESS_TOKEN?.trim();
    const user = env.META_THREADS_USER_ID?.trim();
    if (!token || !user) throw new Error("Threads not configured (META_ACCESS_TOKEN, META_THREADS_USER_ID)");

    const queue = await ensureContentQueue();
    const posts = queue.posts.filter((p) => p.stage === "PUBLISHED" && p.platform === "threads").slice(0, 6);

    let ingested = 0;
    const cursors = { ...state.threadsReplyCursors };

    for (const post of posts) {
      const threadId = post.platformPostId ?? post.publishedUrl?.match(/\/post\/([^/?#]+)/)?.[1];
      if (!threadId) continue;

      const url = `https://graph.threads.net/v1.0/${threadId}/replies?fields=id,text,username,timestamp&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;

      const payload = (await res.json()) as {
        data?: Array<{ id?: string; text?: string; username?: string }>;
      };

      const lastSeen = cursors[threadId] ?? "";
      let newest = lastSeen;

      for (const reply of payload.data ?? []) {
        const replyId = String(reply.id ?? "");
        if (!replyId || replyId === lastSeen) continue;
        const text = reply.text?.trim() ?? "";
        if (!text) continue;

        const row = await ingestSocialEngageEvent({
          platform: "threads",
          kind: "reply",
          externalId: `threads:reply:${replyId}`,
          author: reply.username ?? "threads-user",
          text,
          parentPostId: threadId,
          threadUrl: post.publishedUrl,
          channel: "Threads · reply",
        });
        if (row) ingested += 1;
        if (!newest || replyId > newest) newest = replyId;
      }

      if (newest) cursors[threadId] = newest;
    }

    await updateSocialEngageState({ threadsReplyCursors: cursors });
    return { platform: "threads", ok: true, ingested };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { platform: "threads", ok: false, ingested: 0, error: msg };
  }
}

async function pollInstagramComments(
  state: Awaited<ReturnType<typeof getSocialEngagePollState>>,
): Promise<SocialEngagePollResult> {
  try {
    const env = await loadDigitalEnv();
    const token = env.META_ACCESS_TOKEN?.trim();
    const igUser = env.META_IG_USER_ID?.trim();
    if (!token || !igUser) throw new Error("Instagram not configured (META_ACCESS_TOKEN, META_IG_USER_ID)");

    const queue = await ensureContentQueue();
    const posts = queue.posts.filter((p) => p.stage === "PUBLISHED" && p.platform === "instagram").slice(0, 6);

    let ingested = 0;
    const cursors = { ...(state.instagramCommentCursors ?? {}) };

    for (const post of posts) {
      const mediaId = post.platformPostId ?? post.publishedUrl?.match(/\/(p|reel|tv)\/([^/?#]+)/)?.[2];
      if (!mediaId) continue;

      const url = `https://graph.facebook.com/v19.0/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;

      const payload = (await res.json()) as {
        data?: Array<{ id?: string; text?: string; username?: string }>;
      };

      const lastSeen = cursors[mediaId] ?? "";
      let newest = lastSeen;

      for (const comment of payload.data ?? []) {
        const commentId = String(comment.id ?? "");
        if (!commentId || commentId === lastSeen) continue;
        const text = comment.text?.trim() ?? "";
        if (!text) continue;

        const row = await ingestSocialEngageEvent({
          platform: "instagram",
          kind: "comment",
          externalId: `instagram:comment:${commentId}`,
          author: comment.username ?? "ig-user",
          text,
          parentPostId: mediaId,
          threadUrl: post.publishedUrl,
          channel: "Instagram · comment",
        });
        if (row) ingested += 1;
        if (!newest || commentId > newest) newest = commentId;
      }

      if (newest) cursors[mediaId] = newest;
    }

    await updateSocialEngageState({ instagramCommentCursors: cursors });
    return { platform: "instagram", ok: true, ingested };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { platform: "instagram", ok: false, ingested: 0, error: msg };
  }
}

export async function pollAllSocialEngage(force = false): Promise<{
  ran: boolean;
  results: SocialEngagePollResult[];
  totalIngested: number;
}> {
  if (!socialEngageEnabled()) {
    return { ran: false, results: [], totalIngested: 0 };
  }

  const state = await getSocialEngagePollState();
  if (!force && !socialEngagePollDue(state.lastPollAt)) {
    return { ran: false, results: [], totalIngested: 0 };
  }

  const results: SocialEngagePollResult[] = [];
  const xMentions = await pollXMentions(state);
  results.push(xMentions);

  let xReplies = 0;
  try {
    xReplies = await pollXRepliesOnPublished(state);
    if (xReplies > 0) {
      results.push({ platform: "x", ok: true, ingested: xReplies });
    }
  } catch {
    /* optional bearer path */
  }

  results.push(await pollLinkedInComments(state));
  results.push(await pollThreadsReplies(state));
  results.push(await pollInstagramComments(state));

  await updateSocialEngageState({ lastPollAt: new Date().toISOString() });

  const totalIngested = results.reduce((s, r) => s + (r.ingested ?? 0), 0);
  return { ran: true, results, totalIngested };
}

export async function ingestMetaSocialWebhook(body: Record<string, unknown>): Promise<number> {
  const object = String(body.object ?? "");
  if (object !== "threads" && object !== "instagram" && object !== "page") return 0;

  let ingested = 0;
  const entries = Array.isArray(body.entry) ? body.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? ((entry as { changes: unknown[] }).changes)
      : [];

    for (const change of changes) {
      const field = String((change as { field?: string }).field ?? "");
      if (field !== "comments" && field !== "replies" && field !== "mentions") continue;

      const value = (change as { value?: Record<string, unknown> }).value ?? {};
      const text = String(value.text ?? value.message ?? "").trim();
      if (!text) continue;

      const authorRaw = value.from;
      const author =
        typeof authorRaw === "object" &&
        authorRaw !== null &&
        "username" in authorRaw &&
        typeof (authorRaw as { username?: unknown }).username === "string"
          ? (authorRaw as { username: string }).username
          : String(value.username ?? "meta-user");
      const id = String(value.id ?? value.comment_id ?? value.media_id ?? randomExternalId());
      const platform = object === "threads" ? "threads" : object === "instagram" ? "instagram" : "threads";
      const parentId = typeof value.parent_id === "string" ? value.parent_id : null;

      const row = await ingestSocialEngageEvent({
        platform,
        kind: field === "mentions" ? "mention" : "comment",
        externalId: `meta:${object}:${id}`,
        author,
        text,
        parentPostId: parentId,
        threadUrl: typeof value.permalink === "string" ? value.permalink : null,
        channel: `Meta · ${field}`,
      });
      if (row) ingested += 1;
    }
  }

  return ingested;
}

function randomExternalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret?: string | null): boolean {
  const secret = appSecret?.trim() ?? process.env.META_APP_SECRET?.trim() ?? process.env.META_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export async function ingestSocialEngageEvents(events: SocialEngageEvent[]): Promise<number> {
  let count = 0;
  for (const event of events) {
    const row = await ingestSocialEngageEvent(event);
    if (row) count += 1;
  }
  return count;
}
