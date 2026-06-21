import type { ContentFormat } from "./social-channels";
import type { SocialPlatformId } from "./social-channels";

export interface ContentTemplate {
  id: string;
  name: string;
  tone: string;
  platforms: SocialPlatformId[];
  format: ContentFormat;
  draftSeed: string;
  brandHashtags: string[];
}

export const DEFAULT_CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "ship-log",
    name: "Ship log",
    tone: "technical",
    platforms: ["x", "threads", "linkedin"],
    format: "thread",
    draftSeed: "Ship log: what we built, why it matters, what ships next.",
    brandHashtags: ["#buildinpublic"],
  },
  {
    id: "short-tip",
    name: "Short tip",
    tone: "casual",
    platforms: ["tiktok", "youtube", "instagram"],
    format: "short",
    draftSeed: "One tip that saves you an hour this week:",
    brandHashtags: ["#tips"],
  },
  {
    id: "brand-launch",
    name: "Brand launch",
    tone: "brand",
    platforms: ["instagram", "pinterest", "facebook"],
    format: "carousel",
    draftSeed: "Introducing our latest — swipe for the story.",
    brandHashtags: ["#launch"],
  },
];

export function parseContentTemplates(raw: unknown): ContentTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_CONTENT_TEMPLATES;
  const parsed: ContentTemplate[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string") continue;
    parsed.push({
      id: o.id,
      name: o.name,
      tone: typeof o.tone === "string" ? o.tone : "technical",
      platforms: Array.isArray(o.platforms) ? (o.platforms.filter((p) => typeof p === "string") as SocialPlatformId[]) : ["x"],
      format: (typeof o.format === "string" ? o.format : "thread") as ContentFormat,
      draftSeed: typeof o.draftSeed === "string" ? o.draftSeed : "",
      brandHashtags: Array.isArray(o.brandHashtags) ? o.brandHashtags.filter((t): t is string => typeof t === "string") : [],
    });
  }
  return parsed.length > 0 ? parsed : DEFAULT_CONTENT_TEMPLATES;
}

export function templateById(templates: ContentTemplate[], id: string): ContentTemplate | null {
  return templates.find((t) => t.id === id) ?? null;
}
