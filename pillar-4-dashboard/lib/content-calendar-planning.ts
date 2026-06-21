import "server-only";

import { readAppFreState } from "./app-fre-state";
import { listAllContentTemplates } from "./content-templates-store";
import { listLibraryAssets } from "./content-library-store";
import { ensureContentQueue, createContentPost } from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";
import { suggestBestSlotsThisWeek } from "./content-schedule-insights";
import { listPostMetrics } from "./content-analytics-store";
import { defaultFormatForPlatform, platformLabel, type SocialPlatformId } from "./social-channels";

export interface ContentGap {
  platform: SocialPlatformId;
  label: string;
  daysSinceLastPost: number;
  severity: "warn" | "info";
  message: string;
}

export interface FillWeekPlanItem {
  platform: SocialPlatformId;
  scheduledAt: string;
  source: "template" | "evergreen" | "gap_fill";
  templateId?: string;
  assetId?: string;
  draftSeed: string;
}

export interface ContentPlanReport {
  gaps: ContentGap[];
  fillPlan: FillWeekPlanItem[];
  weekTheme: string | null;
}

export async function buildContentPlanReport(weekAnchor = new Date()): Promise<ContentPlanReport> {
  const fre = await readAppFreState("my-content-creator");
  const file = await ensureContentQueue();
  const metrics = await listPostMetrics();
  const channels = (Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is SocialPlatformId => typeof x === "string")
    : ["x"]) as SocialPlatformId[];

  const gaps: ContentGap[] = [];
  const now = Date.now();

  for (const platform of channels) {
    const recent = file.posts
      .filter((p) => p.platform === platform && (p.publishedAt || p.scheduledAt))
      .sort((a, b) => (b.publishedAt ?? b.scheduledAt ?? "").localeCompare(a.publishedAt ?? a.scheduledAt ?? ""));
    const last = recent[0];
    const lastWhen = last?.publishedAt ?? last?.scheduledAt;
    const daysSince = lastWhen
      ? Math.floor((now - new Date(lastWhen).getTime()) / 86_400_000)
      : 999;

    if (daysSince >= 7) {
      gaps.push({
        platform,
        label: platformLabel(platform),
        daysSinceLastPost: daysSince,
        severity: daysSince >= 14 ? "warn" : "info",
        message: `No ${platformLabel(platform)} post in ${daysSince >= 999 ? "ever" : `${daysSince} days`}`,
      });
    }
  }

  const weekSlots = suggestBestSlotsThisWeek(channels, metrics, file.posts, weekAnchor);
  const [templates, assets] = await Promise.all([listAllContentTemplates(), listLibraryAssets()]);
  const fillPlan: FillWeekPlanItem[] = [];

  for (let i = 0; i < Math.min(gaps.length, 5); i++) {
    const gap = gaps[i]!;
    const slot = weekSlots.find((s) => s.platform === gap.platform) ?? weekSlots[i % Math.max(weekSlots.length, 1)];
    const evergreen = assets.find((a) => a.evergreen && a.platform === gap.platform);
    const tpl = templates.find((t) => t.platforms.includes(gap.platform));

    if (evergreen) {
      fillPlan.push({
        platform: gap.platform,
        scheduledAt: slot?.scheduledAt ?? new Date(now + (i + 1) * 86_400_000).toISOString(),
        source: "evergreen",
        assetId: evergreen.id,
        draftSeed: evergreen.draftPreview,
      });
    } else if (tpl) {
      fillPlan.push({
        platform: gap.platform,
        scheduledAt: slot?.scheduledAt ?? new Date(now + (i + 1) * 86_400_000).toISOString(),
        source: "template",
        templateId: tpl.id,
        draftSeed: tpl.draftSeed,
      });
    } else {
      fillPlan.push({
        platform: gap.platform,
        scheduledAt: slot?.scheduledAt ?? new Date(now + (i + 1) * 86_400_000).toISOString(),
        source: "gap_fill",
        draftSeed: `Quick update for ${platformLabel(gap.platform)} — what shipped this week?`,
      });
    }
  }

  const weekTheme =
    typeof fre.config.weeklyTheme === "string" && fre.config.weeklyTheme.trim()
      ? fre.config.weeklyTheme.trim()
      : null;

  return { gaps, fillPlan, weekTheme };
}

export async function executeFillWeekPlan(maxItems = 5): Promise<ContentPost[]> {
  const plan = await buildContentPlanReport();
  const created: ContentPost[] = [];

  for (const item of plan.fillPlan.slice(0, maxItems)) {
    if (item.assetId) {
      const { createPostFromLibraryAsset } = await import("./content-evergreen-engine");
      const post = await createPostFromLibraryAsset(item.assetId);
      if (post) {
        const { scheduleContentPost } = await import("./content-queue-store");
        await scheduleContentPost(post.id, item.scheduledAt);
        created.push(post);
      }
      continue;
    }

    const post = await createContentPost({
      channel: `${platformLabel(item.platform)} Channel`,
      platform: item.platform,
      format: defaultFormatForPlatform(item.platform),
      draftText: item.draftSeed,
    });
    const { scheduleContentPost } = await import("./content-queue-store");
    await scheduleContentPost(post.id, item.scheduledAt);
    created.push(post);
  }

  return created;
}
