import "server-only";

import type { ContentPost } from "./content-queue-types";

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}

export function buildUtmParams(
  post: Pick<ContentPost, "id" | "platform" | "campaignId" | "utmCampaign" | "utmSource">,
  config: Record<string, unknown> = {},
): UtmParams {
  const brandKit =
    typeof config.brandKit === "object" && config.brandKit !== null
      ? (config.brandKit as Record<string, unknown>)
      : {};
  return {
    source:
      post.utmSource?.trim() ||
      (typeof brandKit.utmSource === "string" ? brandKit.utmSource : "") ||
      (typeof config.utmSource === "string" ? config.utmSource : "curxor"),
    medium: "social",
    campaign: post.utmCampaign?.trim() || post.campaignId?.trim() || post.id,
    content: `${post.platform}-${post.id}`,
  };
}

export function appendUtmToUrl(url: string, params: UtmParams): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", params.source);
    u.searchParams.set("utm_medium", params.medium);
    u.searchParams.set("utm_campaign", params.campaign);
    if (params.content) u.searchParams.set("utm_content", params.content);
    return u.toString();
  } catch {
    return url;
  }
}

function trackingEnabled(config: Record<string, unknown>): boolean {
  const brandKit =
    typeof config.brandKit === "object" && config.brandKit !== null
      ? (config.brandKit as Record<string, unknown>)
      : {};
  if (brandKit.trackLinks === false) return false;
  if (config.trackLinks === false) return false;
  return Boolean(process.env.CURXOR_CONTENT_PUBLIC_BASE?.trim());
}

export function buildTrackedRedirectUrl(postId: string, destination: string): string {
  const base = process.env.CURXOR_CONTENT_PUBLIC_BASE?.trim().replace(/\/$/, "");
  if (!base) return destination;
  const payload = Buffer.from(JSON.stringify({ postId, to: destination }), "utf8").toString("base64url");
  return `${base}/api/content/click?c=${encodeURIComponent(payload)}`;
}

export function decodeTrackedClickToken(token: string): { postId: string; to: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { postId?: string; to?: string };
    if (typeof parsed.postId !== "string" || typeof parsed.to !== "string") return null;
    if (!parsed.to.startsWith("http")) return null;
    return { postId: parsed.postId, to: parsed.to };
  } catch {
    return null;
  }
}

export function applyUtmToDraftText(
  text: string,
  post: ContentPost,
  config: Record<string, unknown>,
): string {
  const params = buildUtmParams(post, config);
  const track = trackingEnabled(config);
  return text.replace(/https?:\/\/[^\s<>"')\]]+/gi, (url) => {
    const cleaned = url.replace(/[.,;:!?)]+$/, "");
    const suffix = url.slice(cleaned.length);
    const withUtm = appendUtmToUrl(cleaned, params);
    const final = track ? buildTrackedRedirectUrl(post.id, withUtm) : withUtm;
    return final + suffix;
  });
}
