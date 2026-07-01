import "server-only";

import { readAppFreState } from "./app-fre-state";
import { createContentPost } from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";
import { scrapeUrlViaFirecrawl } from "./firecrawl-scrape";
import { isSocialPlatform, type SocialPlatformId } from "./social-channels";

export interface CreatorDraftSeedResult {
  ok: boolean;
  demo: boolean;
  url: string;
  post: ContentPost | null;
  source: "firecrawl" | "demo";
  via: string;
  title: string;
  detail: string;
}

function resolveSeedPlatform(freChannels: string[], override?: string): SocialPlatformId {
  if (override && isSocialPlatform(override)) return override;
  const first = freChannels.find((c) => isSocialPlatform(c));
  return first && isSocialPlatform(first) ? first : "x";
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return "trend";
  }
}

export function outlineFromScrapeMarkdown(
  url: string,
  title: string,
  markdown: string,
): string {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const heading = title || lines.find((l) => l.startsWith("#"))?.replace(/^#+\s*/, "") || "Trend outline";
  const bullets = lines
    .filter((l) => !l.startsWith("#") && l.length > 24)
    .slice(0, 6)
    .map((l) => `- ${l.replace(/^[-*]\s*/, "").slice(0, 200)}`);

  return [
    `# Draft seed: ${heading}`,
    "",
    `Source: ${url}`,
    "",
    "## Outline (review before publish)",
    ...(bullets.length > 0 ? bullets : ["- Add your hook here", "- Add proof point", "- Add CTA"]),
    "",
    "## Notes",
    "Generated from web context — edit before scheduling. Publish still requires bridge approval.",
  ].join("\n");
}

export async function seedCreatorDraftFromUrl(
  inputUrl: string,
  platformOverride?: string,
): Promise<CreatorDraftSeedResult> {
  const url = inputUrl.trim().startsWith("http") ? inputUrl.trim() : `https://${inputUrl.trim()}`;
  const fre = await readAppFreState("my-content-creator");
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : [];
  const platform = resolveSeedPlatform(channels, platformOverride);

  const scrape = await scrapeUrlViaFirecrawl(url);
  if (!scrape.ok) {
    return {
      ok: false,
      demo: scrape.demo,
      url,
      post: null,
      source: scrape.source,
      via: scrape.via,
      title: scrape.title,
      detail: scrape.error ?? "Scrape failed",
    };
  }

  const draftText = outlineFromScrapeMarkdown(url, scrape.title, scrape.markdown);
  const post = await createContentPost({
    channel: `Trend seed · ${hostnameFromUrl(url)}`,
    platform,
    draftText,
    inIdeaBacklog: true,
  });

  return {
    ok: true,
    demo: scrape.demo,
    url,
    post,
    source: scrape.demo ? "demo" : "firecrawl",
    via: scrape.via,
    title: scrape.title || hostnameFromUrl(url),
    detail: scrape.demo
      ? "Demo seed created — add FIRECRAWL_API_KEY for live scrape context"
      : `Draft seeded via ${scrape.via}`,
  };
}
