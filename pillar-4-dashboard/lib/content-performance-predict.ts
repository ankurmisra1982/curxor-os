import "server-only";

import type { PostMetrics } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";
import { scoreDraftAgainstStyleGuide, parseStyleGuide } from "./content-style-guide";

export interface PerformancePrediction {
  score: number;
  band: "low" | "medium" | "high";
  factors: Array<{ id: string; label: string; impact: "positive" | "negative" | "neutral"; detail: string }>;
}

function hookStrength(text: string): number {
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  if (firstLine.length < 12) return 40;
  if (firstLine.length > 120) return 55;
  if (/[?!]/.test(firstLine)) return 78;
  if (/^\d+[.)]/.test(firstLine)) return 72;
  if (/\b(how|why|what|secret|stop|never)\b/i.test(firstLine)) return 80;
  return 65;
}

export function predictPostPerformance(input: {
  post: ContentPost;
  brandKitRaw: unknown;
  historicalMetrics?: PostMetrics[];
}): PerformancePrediction {
  const { post, brandKitRaw, historicalMetrics = [] } = input;
  const text = post.draftText.trim();
  const factors: PerformancePrediction["factors"] = [];
  let score = 58;

  const hook = hookStrength(text);
  score += (hook - 60) * 0.35;
  factors.push({
    id: "hook",
    label: "Hook strength",
    impact: hook >= 70 ? "positive" : hook < 55 ? "negative" : "neutral",
    detail: `Opener score ${Math.round(hook)}/100`,
  });

  const style = scoreDraftAgainstStyleGuide(text, parseStyleGuide(brandKitRaw));
  score += (style.score - 70) * 0.25;
  factors.push({
    id: "style",
    label: "Brand voice fit",
    impact: style.band === "high" ? "positive" : style.band === "low" ? "negative" : "neutral",
    detail: `Voice score ${style.score}/100`,
  });

  const hasMedia = Boolean(post.imageUrl || post.imagePath || post.videoUrl || post.videoPath);
  if (post.platform === "instagram" || post.platform === "tiktok" || post.platform === "youtube") {
    if (hasMedia) {
      score += 8;
      factors.push({ id: "media", label: "Media attached", impact: "positive", detail: "Visual platforms favor media posts" });
    } else {
      score -= 12;
      factors.push({ id: "media", label: "Missing media", impact: "negative", detail: `${post.platform} posts need image or video` });
    }
  }

  if (post.selectedHookId && post.hookVariants?.length) {
    score += 5;
    factors.push({ id: "ab_hook", label: "Hook variant", impact: "positive", detail: "A/B hook selected" });
  }
  if (post.selectedThumbnailId && post.thumbnailVariants?.length) {
    score += 4;
    factors.push({ id: "ab_thumb", label: "Thumbnail variant", impact: "positive", detail: "A/B thumbnail selected" });
  }

  const platformHistory = historicalMetrics.filter((m) => m.platform === post.platform);
  if (platformHistory.length >= 2) {
    const avgEng =
      platformHistory.reduce((s, m) => s + m.likes + m.comments * 2, 0) / platformHistory.length;
    if (avgEng > 50) {
      score += 6;
      factors.push({
        id: "history",
        label: "Platform track record",
        impact: "positive",
        detail: `Strong past engagement on ${post.platform}`,
      });
    }
  }

  if (post.threadParts && post.threadParts.length > 1) {
    score += 3;
    factors.push({
      id: "thread",
      label: "Thread format",
      impact: "positive",
      detail: `${post.threadParts.length}-part thread`,
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band: PerformancePrediction["band"] = score >= 72 ? "high" : score >= 48 ? "medium" : "low";
  return { score, band, factors };
}
