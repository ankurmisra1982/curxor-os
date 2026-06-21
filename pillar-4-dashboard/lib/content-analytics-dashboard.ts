import "server-only";

import type { PostMetrics } from "./content-analytics-store";
import type { ClickSummary } from "./content-click-store";
import type { ContentPost } from "./content-queue-types";
import { platformLabel } from "./social-channels";

export interface PlatformFunnelRow {
  platform: string;
  label: string;
  posts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalClicks: number;
  avgEngagementRate: number;
  liveSourceCount: number;
}

export interface AnalyticsFunnelReport {
  platforms: PlatformFunnelRow[];
  totals: {
    views: number;
    likes: number;
    comments: number;
    clicks: number;
    postsTracked: number;
  };
  topPosts: Array<{
    postId: string;
    platform: string;
    views: number;
    likes: number;
    clicks: number;
    engagementRate: number;
  }>;
}

export function buildAnalyticsFunnelReport(input: {
  metrics: PostMetrics[];
  posts: ContentPost[];
  clicks: ClickSummary[];
}): AnalyticsFunnelReport {
  const { metrics, posts, clicks } = input;
  const clickByPost = new Map(clicks.map((c) => [c.postId, c.clicks]));

  const byPlatform = new Map<string, PlatformFunnelRow>();

  for (const m of metrics) {
    const row =
      byPlatform.get(m.platform) ??
      ({
        platform: m.platform,
        label: platformLabel(m.platform as import("./social-channels").SocialPlatformId),
        posts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalClicks: 0,
        avgEngagementRate: 0,
        liveSourceCount: 0,
      } satisfies PlatformFunnelRow);
    row.posts += 1;
    row.totalViews += m.views;
    row.totalLikes += m.likes;
    row.totalComments += m.comments;
    row.totalClicks += clickByPost.get(m.postId) ?? 0;
    if (m.source === "live") row.liveSourceCount += 1;
    byPlatform.set(m.platform, row);
  }

  for (const row of byPlatform.values()) {
    const denom = Math.max(row.totalViews, 1);
    row.avgEngagementRate = Number(((row.totalLikes + row.totalComments) / denom).toFixed(4));
  }

  const topPosts = [...metrics]
    .map((m) => {
      const views = Math.max(m.views, 1);
      return {
        postId: m.postId,
        platform: m.platform,
        views: m.views,
        likes: m.likes,
        clicks: clickByPost.get(m.postId) ?? 0,
        engagementRate: Number(((m.likes + m.comments) / views).toFixed(4)),
      };
    })
    .sort((a, b) => b.views + b.clicks * 10 - (a.views + a.clicks * 10))
    .slice(0, 8);

  const platforms = [...byPlatform.values()].sort((a, b) => b.totalViews - a.totalViews);

  return {
    platforms,
    totals: {
      views: metrics.reduce((s, m) => s + m.views, 0),
      likes: metrics.reduce((s, m) => s + m.likes, 0),
      comments: metrics.reduce((s, m) => s + m.comments, 0),
      clicks: clicks.reduce((s, c) => s + c.clicks, 0),
      postsTracked: new Set(metrics.map((m) => m.postId)).size,
    },
    topPosts,
  };
}

export async function importManualMetrics(input: {
  postId: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}): Promise<PostMetrics> {
  const { upsertPostMetrics } = await import("./content-analytics-store");
  const { getContentPost } = await import("./content-queue-store");
  const post = await getContentPost(input.postId);
  if (!post) throw new Error("Post not found");

  const views = input.views ?? 0;
  const likes = input.likes ?? 0;
  const comments = input.comments ?? 0;
  const shares = input.shares ?? 0;

  return upsertPostMetrics({
    postId: input.postId,
    platform: post.platform,
    views,
    likes,
    comments,
    shares,
    ctr: views > 0 ? Number(((likes + comments) / views).toFixed(4)) : null,
    hookVariantId: post.selectedHookId ?? null,
    thumbnailVariantId: post.selectedThumbnailId ?? null,
    publishedAt: post.publishedAt,
    source: "manual",
  });
}
