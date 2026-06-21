import "server-only";

import type { PostMetrics, HookPerformance } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";
import { platformLabel } from "./social-channels";

export type RecommendationKind =
  | "hook"
  | "platform"
  | "repurpose"
  | "thumb"
  | "schedule"
  | "campaign";

export interface ContentRecommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  action: string;
  payload: Record<string, unknown>;
  score: number;
}

function engagementScore(m: PostMetrics): number {
  const views = Math.max(m.views, 1);
  return m.likes / views + (m.comments * 0.5) / views + (m.shares ?? 0) * 0.3 / views;
}

export function deriveContentRecommendations(input: {
  metrics: PostMetrics[];
  posts: ContentPost[];
  hookPerformance: HookPerformance[];
  campaignId?: string | null;
}): ContentRecommendation[] {
  const { metrics, posts, hookPerformance, campaignId } = input;
  const scopedPosts = campaignId ? posts.filter((p) => p.campaignId === campaignId) : posts;
  const scopedIds = new Set(scopedPosts.map((p) => p.id));
  const scopedMetrics = metrics.filter((m) => scopedIds.has(m.postId));

  const recs: ContentRecommendation[] = [];

  if (hookPerformance.length >= 2) {
    const ranked = [...hookPerformance].sort((a, b) => b.avgLikes - a.avgLikes || b.avgViews - a.avgViews);
    const winner = ranked[0]!;
    const runner = ranked[1]!;
    if (winner.avgLikes > runner.avgLikes * 1.05 || winner.samples >= 2) {
      const post = scopedPosts.find((p) => p.hookVariants?.some((h) => h.id === winner.hookVariantId));
      recs.push({
        id: `hook-${winner.hookVariantId}`,
        kind: "hook",
        title: `Use hook ${winner.label} on your next post`,
        detail: `Avg ${Math.round(winner.avgLikes)} likes vs ${Math.round(runner.avgLikes)} for ${runner.label} (n=${winner.samples}).`,
        action: "select_hook",
        payload: { postId: post?.id, hookId: winner.hookVariantId },
        score: winner.avgLikes,
      });
    }
  }

  if (scopedMetrics.length >= 2) {
    const byPlatform = new Map<string, PostMetrics[]>();
    for (const m of scopedMetrics) {
      const list = byPlatform.get(m.platform) ?? [];
      list.push(m);
      byPlatform.set(m.platform, list);
    }
    let bestPlatform = "";
    let bestScore = 0;
    for (const [platform, rows] of byPlatform) {
      const avg = rows.reduce((s, m) => s + engagementScore(m), 0) / rows.length;
      if (avg > bestScore) {
        bestScore = avg;
        bestPlatform = platform;
      }
    }
    if (bestPlatform) {
      recs.push({
        id: `platform-${bestPlatform}`,
        kind: "platform",
        title: `Double down on ${platformLabel(bestPlatform as import("./social-channels").SocialPlatformId)}`,
        detail: `Highest engagement rate in your recent metrics (${(bestScore * 100).toFixed(1)}% composite).`,
        action: "fan_out_channels",
        payload: { platform: bestPlatform },
        score: bestScore * 1000,
      });
    }
  }

  if (scopedMetrics.length > 0) {
    const ranked = [...scopedMetrics].sort((a, b) => engagementScore(b) - engagementScore(a));
    const top = ranked[0]!;
    const topPost = scopedPosts.find((p) => p.id === top.postId);
    if (topPost && top.views > 100) {
      recs.push({
        id: `repurpose-${top.postId}`,
        kind: "repurpose",
        title: "Repurpose your top post",
        detail: `${top.postId} — ${top.likes} likes on ${top.views} views. Clone to other channels.`,
        action: "repurpose_content",
        payload: { postId: top.postId, preset: "single_to_all" },
        score: engagementScore(top) * 1000,
      });
    }
  }

  const thumbPosts = scopedPosts.filter((p) => (p.thumbnailVariants?.length ?? 0) >= 2);
  for (const post of thumbPosts.slice(0, 2)) {
    const selected = post.selectedThumbnailId;
    recs.push({
      id: `thumb-${post.id}`,
      kind: "thumb",
      title: "Run thumb A/B on next publish",
      detail: `${post.thumbnailVariants!.length} variants ready on ${post.id} — track which wins.`,
      action: "generate_thumb_variants",
      payload: { postId: post.id, selectedThumbnailId: selected },
      score: 50,
    });
  }

  const scheduled = scopedPosts.filter((p) => p.stage === "SCHEDULED");
  if (scheduled.length === 0 && scopedPosts.some((p) => p.stage === "SCRIPT" || p.stage === "RENDER")) {
    const draft = scopedPosts.find((p) => p.draftText.trim().length > 20);
    if (draft) {
      recs.push({
        id: `schedule-${draft.id}`,
        kind: "schedule",
        title: "Schedule your ready draft",
        detail: `${draft.channel} has copy but no slot — add to calendar.`,
        action: "schedule",
        payload: { postId: draft.id },
        score: 40,
      });
    }
  }

  if (campaignId) {
    const campaignPosts = scopedPosts.filter((p) => p.campaignId === campaignId);
    const published = campaignPosts.filter((p) => p.stage === "PUBLISHED").length;
    if (published > 0 && published < campaignPosts.length) {
      recs.push({
        id: `campaign-live-${campaignId}`,
        kind: "campaign",
        title: "Finish campaign rollout",
        detail: `${published}/${campaignPosts.length} posts live — publish remaining channels.`,
        action: "batch_publish",
        payload: { campaignId },
        score: 60,
      });
    }
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, 8);
}
