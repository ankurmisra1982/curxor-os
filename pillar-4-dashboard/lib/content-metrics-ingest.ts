import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { loadDigitalEnv } from "./digital-env";
import { getContentPost, ensureContentQueue } from "./content-queue-store";
import { upsertPostMetrics, type PostMetrics } from "./content-analytics-store";

export interface MetricsPullResult {
  postId: string;
  platform: string;
  ok: boolean;
  metrics?: PostMetrics;
  error?: string;
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Number((num / den).toFixed(4));
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function oauth1Authorization(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const allParams = { ...queryParams, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(allParams[k]!)}`)
    .join("&");

  const baseUrl = url.split("?")[0]!;
  const signatureBase = `${method.toUpperCase()}&${encodeRfc3986(baseUrl)}&${encodeRfc3986(paramString)}`;
  const signingKey = `${encodeRfc3986(consumerSecret)}&${encodeRfc3986(tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const authHeader =
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${encodeRfc3986(k)}="${encodeRfc3986(headerParams[k]!)}"`)
      .join(", ");

  return authHeader;
}

export function extractTweetId(post: { publishedUrl?: string | null; platformPostId?: string | null }): string | null {
  if (post.platformPostId) return post.platformPostId;
  const url = post.publishedUrl ?? "";
  const m = url.match(/status\/(\d+)/);
  return m?.[1] ?? null;
}

export function normalizeLinkedInUrn(postId: string): string {
  if (postId.startsWith("urn:li:")) return postId;
  return `urn:li:ugcPost:${postId}`;
}

export async function fetchXTweetMetrics(tweetId: string): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const env = await loadDigitalEnv();
  const consumerKey = env.X_API_KEY?.trim();
  const consumerSecret = env.X_API_SECRET?.trim();
  const token = env.X_ACCESS_TOKEN?.trim();
  const tokenSecret = env.X_ACCESS_TOKEN_SECRET?.trim();

  if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
    throw new Error("X API credentials incomplete in digital.env");
  }

  const baseUrl = `https://api.twitter.com/2/tweets/${tweetId}`;
  const queryParams = { "tweet.fields": "public_metrics,organic_metrics" };
  const qs = new URLSearchParams(queryParams).toString();
  const url = `${baseUrl}?${qs}`;

  const auth = oauth1Authorization("GET", baseUrl, queryParams, consumerKey, consumerSecret, token, tokenSecret);

  const res = await fetch(url, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await res.json()) as {
    data?: {
      public_metrics?: {
        impression_count?: number;
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
        quote_count?: number;
      };
      organic_metrics?: {
        impression_count?: number;
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (!res.ok) {
    const msg = body.errors?.[0]?.message ?? `X API HTTP ${res.status}`;
    throw new Error(msg);
  }

  const pm = body.data?.organic_metrics ?? body.data?.public_metrics ?? {};
  const views = pm.impression_count ?? 0;
  const likes = pm.like_count ?? 0;
  const comments = pm.reply_count ?? 0;
  const shares = (pm.retweet_count ?? 0) + ((pm as { quote_count?: number }).quote_count ?? 0);

  return { views, likes, comments, shares };
}

export async function fetchLinkedInPostMetrics(postUrn: string): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const env = await loadDigitalEnv();
  const token = env.LINKEDIN_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN not set in digital.env");

  const urn = normalizeLinkedInUrn(postUrn);
  const encoded = encodeURIComponent(urn);
  const version = process.env.CURXOR_LINKEDIN_API_VERSION?.trim() || "202405";

  const url = `https://api.linkedin.com/rest/memberCreatorPostAnalytics?q=entity&entity=(ugc:${encoded})`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 404 || res.status === 403) {
    return fetchLinkedInSocialMetadata(urn, token);
  }

  const body = (await res.json()) as {
    elements?: Array<{
      totalShareStatistics?: {
        impressionCount?: number;
        likeCount?: number;
        commentCount?: number;
        shareCount?: number;
      };
      count?: number;
      reactionTypeCounts?: Record<string, number>;
    }>;
    message?: string;
  };

  if (!res.ok) {
    const fallback = await fetchLinkedInSocialMetadata(urn, token).catch(() => null);
    if (fallback) return fallback;
    throw new Error(body.message ?? `LinkedIn API HTTP ${res.status}`);
  }

  const el = body.elements?.[0];
  const stats = el?.totalShareStatistics;
  if (stats) {
    return {
      views: stats.impressionCount ?? 0,
      likes: stats.likeCount ?? 0,
      comments: stats.commentCount ?? 0,
      shares: stats.shareCount ?? 0,
    };
  }

  const reactions = el?.reactionTypeCounts ?? {};
  const likes = Object.values(reactions).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
  return {
    views: el?.count ?? 0,
    likes,
    comments: 0,
    shares: 0,
  };
}

async function fetchLinkedInSocialMetadata(
  urn: string,
  token: string,
): Promise<{ views: number; likes: number; comments: number; shares: number }> {
  const encoded = encodeURIComponent(urn);
  const url = `https://api.linkedin.com/v2/socialMetadata/${encoded}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await res.json()) as {
    reactionSummaries?: { totalCount?: number };
    commentSummary?: { totalCount?: number };
  };

  if (!res.ok) {
    throw new Error(`LinkedIn socialMetadata HTTP ${res.status}`);
  }

  return {
    views: 0,
    likes: body.reactionSummaries?.totalCount ?? 0,
    comments: body.commentSummary?.totalCount ?? 0,
    shares: 0,
  };
}

export function extractYouTubeVideoId(post: { publishedUrl?: string | null; platformPostId?: string | null }): string | null {
  if (post.platformPostId) return post.platformPostId;
  const url = post.publishedUrl ?? "";
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
  return m?.[1] ?? null;
}

export function extractInstagramMediaId(post: { publishedUrl?: string | null; platformPostId?: string | null }): string | null {
  if (post.platformPostId) return post.platformPostId;
  const url = post.publishedUrl ?? "";
  const m = url.match(/\/(p|reel|tv)\/([^/?#]+)/);
  return m?.[2] ?? null;
}

export function extractTikTokVideoId(post: { publishedUrl?: string | null; platformPostId?: string | null }): string | null {
  if (post.platformPostId) return post.platformPostId;
  const url = post.publishedUrl ?? "";
  const m = url.match(/video\/(\d+)/);
  return m?.[1] ?? null;
}

async function fetchYouTubeVideoMetrics(videoId: string): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const env = await loadDigitalEnv();
  const key = env.YOUTUBE_API_KEY?.trim() ?? env.YOUTUBE_CLIENT_ID?.trim();
  if (!key) throw new Error("YouTube API key not set in digital.env");

  const qs = new URLSearchParams({ part: "statistics", id: videoId, key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, {
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as {
    items?: Array<{ statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `YouTube API HTTP ${res.status}`);
  const stats = body.items?.[0]?.statistics ?? {};
  return {
    views: Number.parseInt(stats.viewCount ?? "0", 10) || 0,
    likes: Number.parseInt(stats.likeCount ?? "0", 10) || 0,
    comments: Number.parseInt(stats.commentCount ?? "0", 10) || 0,
    shares: 0,
  };
}

async function fetchInstagramMediaMetrics(mediaId: string): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const env = await loadDigitalEnv();
  const token = env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("META_ACCESS_TOKEN not set in digital.env");

  const insightsUrl = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,saved&access_token=${encodeURIComponent(token)}`;
  const mediaUrl = `https://graph.facebook.com/v19.0/${mediaId}?fields=like_count,comments_count&access_token=${encodeURIComponent(token)}`;

  const [insightsRes, mediaRes] = await Promise.all([
    fetch(insightsUrl, { signal: AbortSignal.timeout(15_000) }),
    fetch(mediaUrl, { signal: AbortSignal.timeout(15_000) }),
  ]);

  let views = 0;
  if (insightsRes.ok) {
    const insights = (await insightsRes.json()) as {
      data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
    };
    for (const row of insights.data ?? []) {
      const val = row.values?.[0]?.value ?? 0;
      if (row.name === "impressions" || row.name === "reach") views = Math.max(views, val);
    }
  }

  let likes = 0;
  let comments = 0;
  if (mediaRes.ok) {
    const media = (await mediaRes.json()) as { like_count?: number; comments_count?: number };
    likes = media.like_count ?? 0;
    comments = media.comments_count ?? 0;
  } else if (!insightsRes.ok) {
    throw new Error(`Instagram Graph API HTTP ${mediaRes.status}`);
  }

  return { views, likes, comments, shares: 0 };
}

async function fetchTikTokVideoMetrics(videoId: string): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const env = await loadDigitalEnv();
  const token = env.TIKTOK_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("TIKTOK_ACCESS_TOKEN not set in digital.env");

  const res = await fetch("https://open.tiktokapis.com/v2/video/query/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as {
    data?: { videos?: Array<{ view_count?: number; like_count?: number; comment_count?: number; share_count?: number }> };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `TikTok API HTTP ${res.status}`);
  const v = body.data?.videos?.[0];
  return {
    views: v?.view_count ?? 0,
    likes: v?.like_count ?? 0,
    comments: v?.comment_count ?? 0,
    shares: v?.share_count ?? 0,
  };
}

export async function pullMetricsForPost(postId: string): Promise<MetricsPullResult> {
  const post = await getContentPost(postId);
  if (!post) return { postId, platform: "unknown", ok: false, error: "Post not found" };
  if (post.stage !== "PUBLISHED") {
    return { postId, platform: post.platform, ok: false, error: "Post not published yet" };
  }

  try {
    if (post.platform === "x") {
      const tweetId = extractTweetId(post);
      if (!tweetId) return { postId, platform: "x", ok: false, error: "No tweet id on post" };
      const m = await fetchXTweetMetrics(tweetId);
      const row = await upsertPostMetrics({
        postId,
        platform: "x",
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        ctr: pct(m.likes + m.comments, m.views),
        hookVariantId: post.selectedHookId ?? null,
        publishedAt: post.publishedAt,
        platformPostId: tweetId,
        source: "live",
      });
      return { postId, platform: "x", ok: true, metrics: row };
    }

    if (post.platform === "linkedin") {
      const urn = post.platformPostId ?? post.publishedUrl ?? "";
      if (!urn) return { postId, platform: "linkedin", ok: false, error: "No LinkedIn post URN" };
      const m = await fetchLinkedInPostMetrics(urn);
      const row = await upsertPostMetrics({
        postId,
        platform: "linkedin",
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        ctr: pct(m.likes + m.comments, Math.max(m.views, 1)),
        hookVariantId: post.selectedHookId ?? null,
        publishedAt: post.publishedAt,
        platformPostId: normalizeLinkedInUrn(urn),
        source: "live",
      });
      return { postId, platform: "linkedin", ok: true, metrics: row };
    }

    if (post.platform === "youtube") {
      const videoId = extractYouTubeVideoId(post);
      if (!videoId) return { postId, platform: "youtube", ok: false, error: "No YouTube video id" };
      const m = await fetchYouTubeVideoMetrics(videoId);
      const row = await upsertPostMetrics({
        postId,
        platform: "youtube",
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        ctr: pct(m.likes + m.comments, Math.max(m.views, 1)),
        hookVariantId: post.selectedHookId ?? null,
        thumbnailVariantId: post.selectedThumbnailId ?? null,
        publishedAt: post.publishedAt,
        platformPostId: videoId,
        source: "live",
      });
      return { postId, platform: "youtube", ok: true, metrics: row };
    }

    if (post.platform === "instagram") {
      const mediaId = post.platformPostId ?? extractInstagramMediaId(post);
      if (!mediaId) return { postId, platform: "instagram", ok: false, error: "No Instagram media id" };
      const m = await fetchInstagramMediaMetrics(mediaId);
      const row = await upsertPostMetrics({
        postId,
        platform: "instagram",
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        ctr: pct(m.likes + m.comments, Math.max(m.views, 1)),
        hookVariantId: post.selectedHookId ?? null,
        thumbnailVariantId: post.selectedThumbnailId ?? null,
        publishedAt: post.publishedAt,
        platformPostId: mediaId,
        source: "live",
      });
      return { postId, platform: "instagram", ok: true, metrics: row };
    }

    if (post.platform === "tiktok") {
      const videoId = post.platformPostId ?? extractTikTokVideoId(post);
      if (!videoId) return { postId, platform: "tiktok", ok: false, error: "No TikTok video id" };
      const m = await fetchTikTokVideoMetrics(videoId);
      const row = await upsertPostMetrics({
        postId,
        platform: "tiktok",
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        ctr: pct(m.likes + m.comments, Math.max(m.views, 1)),
        hookVariantId: post.selectedHookId ?? null,
        publishedAt: post.publishedAt,
        platformPostId: videoId,
        source: "live",
      });
      return { postId, platform: "tiktok", ok: true, metrics: row };
    }

    return { postId, platform: post.platform, ok: false, error: `Live metrics not supported for ${post.platform}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { postId, platform: post.platform, ok: false, error: msg };
  }
}

export async function pullAllLiveMetrics(): Promise<MetricsPullResult[]> {
  const queue = await ensureContentQueue();
  const targets = queue.posts.filter((p) => p.stage === "PUBLISHED");
  const results: MetricsPullResult[] = [];
  for (const post of targets.slice(0, 24)) {
    results.push(await pullMetricsForPost(post.id));
  }
  return results;
}
