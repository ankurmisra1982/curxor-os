import "server-only";

import { compareHookPerformance, listPostMetrics } from "./content-analytics-store";
import { fetchContentStatus } from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";
import { deriveContentRecommendations } from "./content-recommendations";
import { applyContentRecommendationAction } from "./content-recommendation-actions";
import { metricsRulesEnabled } from "./content-metrics-rules-config";
import {
  appendMetricsRuleFire,
  listMetricsRuleFires,
  listMetricsRules,
  ruleOnCooldown,
} from "./content-metrics-rules-store";
import type {
  MetricsRule,
  MetricsRuleMatch,
  MetricsRuleRunResult,
} from "./content-metrics-rules-types";
import { readAppFreState } from "./app-fre-state";
import type { PostMetrics } from "./content-analytics-store";

function engagementScore(m: PostMetrics): number {
  const views = Math.max(m.views, 1);
  return m.likes / views + (m.comments * 0.5) / views + (m.shares ?? 0) * 0.3 / views;
}

function findNextDraftPost(posts: ContentPost[], source?: ContentPost): ContentPost | null {
  const candidates = posts.filter(
    (p) =>
      (p.stage === "IDEATE" || p.stage === "SCRIPT" || p.stage === "RENDER") &&
      p.draftText.trim().length > 10 &&
      (p.hookVariants?.length ?? 0) > 0,
  );
  if (source?.campaignId) {
    const inCampaign = candidates.find((p) => p.campaignId === source.campaignId && p.id !== source.id);
    if (inCampaign) return inCampaign;
  }
  return candidates.find((p) => p.id !== source?.id) ?? null;
}

function matchViewsGte(rule: MetricsRule, metrics: PostMetrics[], posts: ContentPost[]): MetricsRuleMatch[] {
  if (rule.condition.type !== "views_gte") return [];
  const matches: MetricsRuleMatch[] = [];
  for (const m of metrics) {
    if (m.views < rule.condition.minViews) continue;
    const post = posts.find((p) => p.id === m.postId);
    if (!post || post.stage !== "PUBLISHED") continue;
    matches.push({
      rule,
      postId: m.postId,
      detail: `${m.views} views on ${m.platform}`,
    });
  }
  return matches;
}

function matchEngagementGte(rule: MetricsRule, metrics: PostMetrics[], posts: ContentPost[]): MetricsRuleMatch[] {
  if (rule.condition.type !== "engagement_gte") return [];
  const matches: MetricsRuleMatch[] = [];
  for (const m of metrics) {
    if (engagementScore(m) < rule.condition.minRate) continue;
    const post = posts.find((p) => p.id === m.postId);
    if (!post) continue;
    if (post.stage !== "PUBLISHED" && post.stage !== "RENDER" && post.stage !== "SCRIPT") continue;
    matches.push({
      rule,
      postId: m.postId,
      detail: `${(engagementScore(m) * 100).toFixed(1)}% engagement on ${m.platform}`,
    });
  }
  return matches;
}

function matchHookWinner(
  rule: MetricsRule,
  metrics: PostMetrics[],
  posts: ContentPost[],
): MetricsRuleMatch[] {
  if (rule.condition.type !== "hook_winner") return [];
  const allHooks = posts.flatMap((p) => p.hookVariants ?? []);
  const hookPerf = compareHookPerformance(
    metrics,
    allHooks.map((h) => ({ id: h.id, label: h.label })),
  );
  const recs = deriveContentRecommendations({ metrics, posts, hookPerformance: hookPerf });
  const hookRec = recs.find((r) => r.kind === "hook");
  if (!hookRec) return [];

  const minSamples = rule.condition.minSamples ?? 2;
  const marginPct = rule.condition.marginPct ?? 5;
  const winner = hookPerf.sort((a, b) => b.avgLikes - a.avgLikes)[0];
  const runner = hookPerf.sort((a, b) => b.avgLikes - a.avgLikes)[1];
  if (!winner || winner.samples < minSamples) return [];
  if (runner && runner.avgLikes > 0 && winner.avgLikes < runner.avgLikes * (1 + marginPct / 100)) {
    return [];
  }

  const postId = typeof hookRec.payload.postId === "string" ? hookRec.payload.postId : "";
  const hookId = typeof hookRec.payload.hookId === "string" ? hookRec.payload.hookId : "";
  if (!postId || !hookId) return [];

  return [
    {
      rule,
      postId,
      hookId,
      detail: hookRec.detail,
    },
  ];
}

function evaluateRule(
  rule: MetricsRule,
  metrics: PostMetrics[],
  posts: ContentPost[],
): MetricsRuleMatch[] {
  switch (rule.condition.type) {
    case "views_gte":
      return matchViewsGte(rule, metrics, posts);
    case "engagement_gte":
      return matchEngagementGte(rule, metrics, posts);
    case "hook_winner":
      return matchHookWinner(rule, metrics, posts);
    default:
      return [];
  }
}

async function executeRuleAction(
  rule: MetricsRule,
  match: MetricsRuleMatch,
  tone: string,
  posts: ContentPost[],
): Promise<{ ok: boolean; detail: string; error?: string; targetPostId: string }> {
  const sourcePost = posts.find((p) => p.id === match.postId);

  if (rule.action.type === "repurpose") {
    const out = await applyContentRecommendationAction(
      "repurpose_content",
      { postId: match.postId, preset: rule.action.preset },
      tone,
    );
    return { ...out, targetPostId: match.postId };
  }

  if (rule.action.type === "select_hook") {
    const hookId = match.hookId;
    if (!hookId) return { ok: false, detail: rule.id, error: "No hook id", targetPostId: match.postId };

    let targetPostId = match.postId;
    if (rule.action.target === "next_draft") {
      const next = findNextDraftPost(posts, sourcePost);
      if (!next) {
        return { ok: false, detail: rule.id, error: "No draft with hook variants", targetPostId: match.postId };
      }
      const winnerHook = sourcePost?.hookVariants?.find((h) => h.id === hookId);
      const matchingHook = next.hookVariants?.find((h) => h.label === winnerHook?.label)?.id;
      if (!matchingHook) {
        return {
          ok: false,
          detail: rule.id,
          error: "Next draft has no matching hook variant",
          targetPostId: next.id,
        };
      }
      targetPostId = next.id;
      const out = await applyContentRecommendationAction(
        "select_hook",
        { postId: targetPostId, hookId: matchingHook },
        tone,
      );
      return { ...out, targetPostId };
    }

    const out = await applyContentRecommendationAction(
      "select_hook",
      { postId: targetPostId, hookId },
      tone,
    );
    return { ...out, targetPostId };
  }

  if (rule.action.type === "schedule") {
    let targetPostId = match.postId;
    const source = posts.find((p) => p.id === match.postId);
    if (source?.stage === "PUBLISHED") {
      const draft =
        posts.find(
          (p) =>
            p.campaignId === source.campaignId &&
            (p.stage === "RENDER" || p.stage === "SCRIPT") &&
            !p.scheduledAt,
        ) ?? findNextDraftPost(posts, source);
      if (!draft) {
        return { ok: false, detail: rule.id, error: "No draft to schedule", targetPostId: match.postId };
      }
      targetPostId = draft.id;
    }
    const out = await applyContentRecommendationAction(
      "schedule",
      { postId: targetPostId, offsetHours: rule.action.offsetHours ?? 24 },
      tone,
    );
    return { ...out, targetPostId };
  }

  return { ok: false, detail: rule.id, error: "Unknown action", targetPostId: match.postId };
}

export async function runMetricsRules(force = false): Promise<{
  ran: boolean;
  results: MetricsRuleRunResult[];
  rulesEnabled: boolean;
}> {
  const { readContentOpsState } = await import("./content-ops-controls");
  const ops = await readContentOpsState();
  if (ops.metricsRulesPaused && !force) {
    return { ran: false, results: [], rulesEnabled: await metricsRulesEnabled() };
  }

  const rulesEnabled = await metricsRulesEnabled();
  if (!rulesEnabled && !force) {
    return { ran: false, results: [], rulesEnabled };
  }

  const fre = await readAppFreState("my-content-creator");
  const tone = typeof fre.config.contentTone === "string" ? fre.config.contentTone : "technical";

  const [rules, fires, metrics, status] = await Promise.all([
    listMetricsRules(),
    listMetricsRuleFires(256),
    listPostMetrics(),
    fetchContentStatus(),
  ]);
  const posts = status.posts;

  const results: MetricsRuleRunResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const matches = evaluateRule(rule, metrics, posts);
    for (const match of matches) {
      if (ruleOnCooldown(fires, rule.id, match.postId, rule.cooldownHours)) {
        results.push({
          ruleId: rule.id,
          postId: match.postId,
          ok: false,
          detail: match.detail,
          skipped: true,
          skipReason: "cooldown",
        });
        continue;
      }

      const executed = await executeRuleAction(rule, match, tone, posts);
      await appendMetricsRuleFire({
        ruleId: rule.id,
        postId: executed.targetPostId,
        action: rule.action.type,
        detail: executed.detail,
        ok: executed.ok,
        error: executed.error ?? null,
      });

      results.push({
        ruleId: rule.id,
        postId: executed.targetPostId,
        ok: executed.ok,
        detail: executed.ok ? executed.detail : match.detail,
        error: executed.error,
      });
    }
  }

  return { ran: true, results, rulesEnabled };
}
