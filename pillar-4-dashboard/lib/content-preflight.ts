import "server-only";

import { readAppFreState } from "./app-fre-state";
import { buildBridgeHealthReport } from "./content-bridge-health";
import { validatePostMedia } from "./content-media-validation";
import { charLimitForPlatform, getSocialChannel } from "./social-channels";
import { truncateForPlatform } from "./content-platform-format";
import { getContentPost } from "./content-queue-store";
import { predictPostPerformance } from "./content-performance-predict";
import { parseStyleGuide, scoreDraftAgainstStyleGuide } from "./content-style-guide";
import { listPostMetrics } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";
import type { SocialPlatformId } from "./social-channels";

export type PreflightSeverity = "error" | "warning" | "info";

export interface PreflightCheck {
  id: string;
  severity: PreflightSeverity;
  message: string;
  fixHint?: string;
}

export interface PreflightReport {
  postId: string;
  platform: SocialPlatformId;
  ready: boolean;
  blockers: number;
  warnings: number;
  checks: PreflightCheck[];
  brandKitApplied: boolean;
  performanceScore: number | null;
  performanceBand: "low" | "medium" | "high" | null;
  styleScore: number | null;
}

interface BrandKit {
  captionPrefix?: string;
  bannedWords?: string[];
  requiredHashtags?: string[];
  requiredDisclaimer?: string;
  linkAllowlist?: string[];
}

function parseBrandKit(raw: unknown): BrandKit {
  if (typeof raw === "string") {
    try {
      return parseBrandKit(JSON.parse(raw) as unknown);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    captionPrefix: typeof o.captionPrefix === "string" ? o.captionPrefix : undefined,
    bannedWords: Array.isArray(o.bannedWords)
      ? o.bannedWords.filter((x): x is string => typeof x === "string")
      : undefined,
    requiredHashtags: Array.isArray(o.requiredHashtags)
      ? o.requiredHashtags.filter((x): x is string => typeof x === "string")
      : undefined,
    requiredDisclaimer:
      typeof o.requiredDisclaimer === "string" ? o.requiredDisclaimer : undefined,
    linkAllowlist: Array.isArray(o.linkAllowlist)
      ? o.linkAllowlist.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s]+/gi) ?? [];
}

export async function runPostPreflight(postId: string): Promise<PreflightReport | null> {
  const post = await getContentPost(postId);
  if (!post) return null;

  const fre = await readAppFreState("my-content-creator");
  const brandKit = parseBrandKit(fre.config.brandKit);
  const checks: PreflightCheck[] = [];

  const text = truncateForPlatform(post.draftText.trim(), post.platform);
  const cap = charLimitForPlatform(post.platform);
  if (cap !== null && text.length > cap) {
    checks.push({
      id: "char_limit",
      severity: "error",
      message: `Caption ${text.length} chars exceeds ${getSocialChannel(post.platform).name} limit (${cap})`,
      fixHint: "Shorten draft or use Adapt All for platform trim",
    });
  }

  const media = await validatePostMedia(post);
  for (const e of media.errors) {
    checks.push({ id: "media", severity: "error", message: e });
  }
  for (const w of media.warnings) {
    checks.push({ id: "media_warn", severity: "warning", message: w });
  }

  if (post.platform === "instagram" || post.platform === "pinterest") {
    const hasPublicUrl = Boolean(post.imageUrl?.startsWith("http"));
    if (!hasPublicUrl && (post.imagePath || post.imageUrl)) {
      checks.push({
        id: "public_base",
        severity: "warning",
        message: "No public image URL — set CURXOR_CONTENT_PUBLIC_BASE for IG/Pinterest",
        fixHint: "Configure CURXOR_CONTENT_PUBLIC_BASE in digital.env",
      });
    }
  }

  const health = await buildBridgeHealthReport(
    (Array.isArray(fre.config.channels)
      ? fre.config.channels.filter((x): x is SocialPlatformId => typeof x === "string")
      : []) ?? [],
  );
  const platformHealth = health.platforms.find((p) => p.platform === post.platform);
  if (platformHealth) {
    if (platformHealth.health === "unconfigured" || platformHealth.health === "auth_expired") {
      checks.push({
        id: "bridge",
        severity: "error",
        message: `Bridge ${platformHealth.healthLabel} for ${platformHealth.name}`,
        fixHint: platformHealth.fixHints[0],
      });
    } else if (platformHealth.health === "degraded") {
      checks.push({
        id: "bridge_degraded",
        severity: "warning",
        message: `Bridge degraded — ${platformHealth.lastError ?? "recent failures"}`,
        fixHint: platformHealth.fixHints[0],
      });
    }
  }

  for (const word of brandKit.bannedWords ?? []) {
    if (word && new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
      checks.push({
        id: `banned_${word}`,
        severity: "error",
        message: `Banned word in draft: "${word}"`,
        fixHint: "Remove or rephrase in brand kit rules",
      });
    }
  }

  for (const tag of brandKit.requiredHashtags ?? []) {
    if (tag && !text.includes(tag)) {
      checks.push({
        id: `hashtag_${tag}`,
        severity: "warning",
        message: `Missing required hashtag: ${tag}`,
      });
    }
  }

  if (brandKit.requiredDisclaimer && !text.includes(brandKit.requiredDisclaimer)) {
    checks.push({
      id: "disclaimer",
      severity: "warning",
      message: "Missing required disclaimer from brand kit",
    });
  }

  const urls = extractUrls(text);
  const allowlist = brandKit.linkAllowlist ?? [];
  if (allowlist.length > 0 && urls.length > 0) {
    for (const url of urls) {
      const ok = allowlist.some((host) => url.includes(host));
      if (!ok) {
        checks.push({
          id: "link_allowlist",
          severity: "error",
          message: `Link not in allowlist: ${url.slice(0, 60)}`,
        });
      }
    }
  }

  const blockers = checks.filter((c) => c.severity === "error").length;
  const warnings = checks.filter((c) => c.severity === "warning").length;

  const styleGuide = parseStyleGuide(fre.config.brandKit);
  const style = scoreDraftAgainstStyleGuide(text, styleGuide);
  if (style.band === "low") {
    checks.push({
      id: "style_guide",
      severity: "warning",
      message: `Brand voice score ${style.score}/100 — review tone and POV`,
      fixHint: style.issues[0] ?? style.tips[0],
    });
  }
  for (const tip of style.issues.slice(0, 2)) {
    checks.push({ id: `style_${tip.slice(0, 12)}`, severity: "warning", message: tip });
  }

  const { analyzeHashtagsForDraft } = await import("./content-hashtag-intelligence");
  const hashtagReport = await analyzeHashtagsForDraft(text, post);
  for (const v of hashtagReport.violations) {
    checks.push({ id: "hashtag_banned", severity: "error", message: v });
  }
  for (const s of hashtagReport.suggestions.slice(0, 2)) {
    checks.push({ id: `hashtag_suggest_${s}`, severity: "info", message: `Consider adding ${s}` });
  }

  const metrics = await listPostMetrics();
  const prediction = predictPostPerformance({
    post,
    brandKitRaw: fre.config.brandKit,
    historicalMetrics: metrics,
  });
  if (prediction.band === "low") {
    checks.push({
      id: "perf_predict",
      severity: "info",
      message: `Predicted performance ${prediction.score}/100 — consider stronger hook or media`,
    });
  }

  const { savePostPublishMeta } = await import("./content-queue-store");
  await savePostPublishMeta(postId, { performanceScore: prediction.score });

  const finalBlockers = checks.filter((c) => c.severity === "error").length;

  return {
    postId,
    platform: post.platform,
    ready: finalBlockers === 0,
    blockers: finalBlockers,
    warnings: checks.filter((c) => c.severity === "warning").length,
    checks,
    brandKitApplied: Boolean(
      brandKit.bannedWords?.length ||
        brandKit.requiredHashtags?.length ||
        brandKit.requiredDisclaimer ||
        brandKit.linkAllowlist?.length ||
        styleGuide.styleGuide ||
        styleGuide.voiceTone,
    ),
    performanceScore: prediction.score,
    performanceBand: prediction.band,
    styleScore: style.score,
  };
}

export async function assertPostPreflightReady(postId: string): Promise<void> {
  const report = await runPostPreflight(postId);
  if (!report) throw new Error("Post not found");
  if (!report.ready) {
    const first = report.checks.find((c) => c.severity === "error");
    throw new Error(first?.message ?? "Pre-flight validation failed");
  }
}

export function preflightSummaryForPost(post: ContentPost, report: PreflightReport): string {
  if (report.ready && report.warnings === 0) return `${post.id} ready to publish`;
  if (report.ready) return `${post.id} ready with ${report.warnings} warning(s)`;
  return `${post.id} blocked — ${report.blockers} error(s)`;
}
