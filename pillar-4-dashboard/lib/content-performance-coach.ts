import "server-only";

import { generateText, isLocalInferenceAvailable } from "./local-inference";
import { readAppFreState } from "./app-fre-state";
import { listPostMetrics } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";
import { parseStyleGuide, styleGuidePromptBlock } from "./content-style-guide";
import { predictPostPerformance } from "./content-performance-predict";

export interface PerformanceCoachTip {
  id: string;
  severity: "critical" | "suggestion" | "positive";
  message: string;
  suggestedEdit?: string;
}

export interface PerformanceCoachReport {
  score: number;
  band: "low" | "medium" | "high";
  heuristic: ReturnType<typeof predictPostPerformance>;
  tips: PerformanceCoachTip[];
  llmSummary: string | null;
}

export async function runPerformanceCoach(post: ContentPost): Promise<PerformanceCoachReport> {
  const fre = await readAppFreState("my-content-creator");
  const metrics = await listPostMetrics();
  const heuristic = predictPostPerformance({
    post,
    brandKitRaw: fre.config.brandKit,
    historicalMetrics: metrics,
  });

  const tips: PerformanceCoachTip[] = heuristic.factors.map((f) => ({
    id: f.id,
    severity: f.impact === "negative" ? "critical" : f.impact === "positive" ? "positive" : "suggestion",
    message: `${f.label}: ${f.detail}`,
  }));

  let llmSummary: string | null = null;
  if (await isLocalInferenceAvailable()) {
    const guide = parseStyleGuide(fre.config.brandKit);
    const prompt = `You are a social content coach. Review this ${post.platform} draft and give 2-3 specific edits (one line each). Score context: ${heuristic.score}/100.

Brand: ${styleGuidePromptBlock(guide)}

Draft:
${post.draftText.slice(0, 1200)}

Reply as plain bullet lines starting with "- ". No preamble.`;

    try {
      llmSummary = (
        await generateText(
          "Concise creator coach. Actionable edits only.",
          prompt,
        )
      )?.trim() ?? null;
      if (llmSummary) {
        for (const line of llmSummary.split("\n").filter((l) => l.trim().startsWith("-"))) {
        tips.push({
          id: `llm-${tips.length}`,
          severity: "suggestion",
          message: line.replace(/^-\s*/, "").trim(),
        });
        }
      }
    } catch {
      llmSummary = null;
    }
  }

  return {
    score: heuristic.score,
    band: heuristic.band,
    heuristic,
    tips: tips.slice(0, 8),
    llmSummary,
  };
}
