import "server-only";

import { readAppFreState } from "./app-fre-state";
import { listPostMetrics } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";

export interface HashtagInsight {
  tag: string;
  usedCount: number;
  avgEngagement: number;
  recommendation: "use" | "avoid" | "neutral";
}

export interface HashtagReport {
  insights: HashtagInsight[];
  violations: string[];
  suggestions: string[];
}

const TAG_RE = /#[\w\u0080-\uFFFF]+/g;

function extractHashtags(text: string): string[] {
  return (text.match(TAG_RE) ?? []).map((t) => t.toLowerCase());
}

export async function analyzeHashtagsForDraft(text: string, post?: ContentPost): Promise<HashtagReport> {
  const fre = await readAppFreState("my-content-creator");
  const kit =
    typeof fre.config.brandKit === "object" && fre.config.brandKit !== null
      ? (fre.config.brandKit as Record<string, unknown>)
      : {};

  const banned = new Set(
    (Array.isArray(kit.bannedHashtags) ? kit.bannedHashtags : [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase()),
  );
  const suggested = (Array.isArray(kit.suggestedHashtags) ? kit.suggestedHashtags : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.toLowerCase());

  const tagsInDraft = extractHashtags(text);
  const violations: string[] = [];
  for (const tag of tagsInDraft) {
    if (banned.has(tag)) violations.push(`Banned hashtag: ${tag}`);
  }

  const metrics = await listPostMetrics();
  const tagStats = new Map<string, { count: number; engagement: number }>();

  const { ensureContentQueue } = await import("./content-queue-store");
  const queue = await ensureContentQueue();

  for (const m of metrics) {
    const p = queue.posts.find((x) => x.id === m.postId);
    if (!p) continue;
    const tags = extractHashtags(p.draftText);
    const eng = m.likes + m.comments * 2;
    for (const tag of tags) {
      const row = tagStats.get(tag) ?? { count: 0, engagement: 0 };
      row.count += 1;
      row.engagement += eng;
      tagStats.set(tag, row);
    }
  }

  const insights: HashtagInsight[] = [...tagStats.entries()]
    .map(([tag, s]) => ({
      tag,
      usedCount: s.count,
      avgEngagement: s.count ? s.engagement / s.count : 0,
      recommendation: banned.has(tag) ? ("avoid" as const) : s.count >= 2 && s.engagement / s.count > 20 ? ("use" as const) : ("neutral" as const),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 12);

  const suggestions = suggested.filter((t) => !tagsInDraft.includes(t)).slice(0, 4);

  return { insights, violations, suggestions };
}
