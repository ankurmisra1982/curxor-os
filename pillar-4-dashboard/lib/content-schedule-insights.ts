import type { PostMetrics } from "./content-analytics-store";
import type { ContentPost } from "./content-queue-types";
import type { SocialPlatformId } from "./social-channels";
import { isSocialPlatform } from "./social-channels";

/** Static fallback when analytics sample is too small. */
export const FALLBACK_OPTIMAL_HOUR: Partial<Record<SocialPlatformId, number>> = {
  x: 9,
  linkedin: 8,
  tiktok: 19,
  instagram: 18,
  youtube: 17,
  facebook: 13,
  threads: 10,
  bluesky: 11,
  reddit: 10,
  pinterest: 20,
  snapchat: 21,
  discord: 12,
};

const FALLBACK_DOW: Partial<Record<SocialPlatformId, number>> = {
  x: 2,
  linkedin: 2,
  tiktok: 5,
  instagram: 4,
  youtube: 3,
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_SAMPLES = 2;

export interface PlatformScheduleInsight {
  platform: string;
  bestDayOfWeek: number;
  bestHour: number;
  avgEngagement: number;
  sampleCount: number;
  source: "data" | "fallback";
  label: string;
}

export interface ScheduleSlotSuggestion {
  platform: string;
  postId?: string;
  scheduledAt: string;
  label: string;
  source: "data" | "fallback";
  confidence: number;
  detail: string;
}

function engagementScore(m: PostMetrics): number {
  const views = Math.max(m.views, 1);
  return m.likes / views + (m.comments * 0.5) / views + (m.shares ?? 0) * 0.3 / views;
}

function localDayAndHour(iso: string, timeZone?: string): { dow: number; hour: number } | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || undefined,
      weekday: "short",
      hour: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "12";
    const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = dowMap[weekday] ?? 1;
    let hour = Number.parseInt(hourRaw, 10);
    if (hour === 24) hour = 0;
    return { dow, hour };
  } catch {
    const d = new Date(iso);
    return { dow: d.getDay(), hour: d.getHours() };
  }
}

function formatSlotLabel(dow: number, hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const hr = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${DOW_LABELS[dow] ?? "?"} ${hr}${ampm}`;
}

function fallbackInsight(platform: SocialPlatformId): PlatformScheduleInsight {
  const hour = FALLBACK_OPTIMAL_HOUR[platform] ?? 18;
  const dow = FALLBACK_DOW[platform] ?? 2;
  return {
    platform,
    bestDayOfWeek: dow,
    bestHour: hour,
    avgEngagement: 0,
    sampleCount: 0,
    source: "fallback",
    label: formatSlotLabel(dow, hour),
  };
}

export function buildPlatformScheduleInsights(input: {
  metrics: PostMetrics[];
  posts: ContentPost[];
  timeZone?: string;
}): PlatformScheduleInsight[] {
  const buckets = new Map<string, { engagement: number; count: number }>();

  for (const m of input.metrics) {
    const post = input.posts.find((p) => p.id === m.postId);
    const iso = post?.publishedAt ?? m.publishedAt ?? post?.scheduledAt;
    if (!iso) continue;

    const local = localDayAndHour(iso, input.timeZone);
    if (!local) continue;

    const platform = m.platform || post?.platform || "x";
    const key = `${platform}:${local.dow}:${local.hour}`;
    const prev = buckets.get(key) ?? { engagement: 0, count: 0 };
    prev.engagement += engagementScore(m);
    prev.count += 1;
    buckets.set(key, prev);
  }

  const byPlatform = new Map<string, PlatformScheduleInsight>();

  for (const [key, stats] of buckets) {
    const [platform, dowStr, hourStr] = key.split(":");
    if (!platform || dowStr === undefined || hourStr === undefined) continue;
    const avg = stats.engagement / stats.count;
    const current = byPlatform.get(platform);
    if (!current || avg > current.avgEngagement) {
      byPlatform.set(platform, {
        platform,
        bestDayOfWeek: Number.parseInt(dowStr, 10),
        bestHour: Number.parseInt(hourStr, 10),
        avgEngagement: avg,
        sampleCount: stats.count,
        source: "data",
        label: formatSlotLabel(Number.parseInt(dowStr, 10), Number.parseInt(hourStr, 10)),
      });
    }
  }

  const platforms = new Set<string>();
  for (const m of input.metrics) platforms.add(m.platform);
  for (const p of input.posts) platforms.add(p.platform);

  const out: PlatformScheduleInsight[] = [];
  for (const platform of platforms) {
    if (!isSocialPlatform(platform)) continue;
    const insight = byPlatform.get(platform);
    if (insight && insight.sampleCount >= MIN_SAMPLES) {
      out.push(insight);
    } else {
      out.push(fallbackInsight(platform));
    }
  }

  return out.sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function insightForPlatform(
  platform: string,
  insights: PlatformScheduleInsight[],
): PlatformScheduleInsight {
  const hit = insights.find((i) => i.platform === platform);
  if (hit) return hit;
  if (isSocialPlatform(platform)) return fallbackInsight(platform);
  return {
    platform,
    bestDayOfWeek: 2,
    bestHour: 18,
    avgEngagement: 0,
    sampleCount: 0,
    source: "fallback",
    label: formatSlotLabel(2, 18),
  };
}

export function findNextSlotISO(input: {
  dayOfWeek: number;
  hour: number;
  timeZone?: string;
  after?: Date;
}): string {
  const after = input.after ?? new Date();
  const cursor = new Date(after);
  cursor.setMinutes(0, 0, 0);

  for (let day = 0; day < 21; day++) {
    const probe = new Date(cursor);
    probe.setDate(cursor.getDate() + day);
    const ymd = probe.toLocaleDateString("en-CA", { timeZone: input.timeZone });
    const candidate = new Date(`${ymd}T${String(input.hour).padStart(2, "0")}:00:00`);
    const local = localDayAndHour(candidate.toISOString(), input.timeZone);
    if (local?.dow !== input.dayOfWeek) continue;
    if (candidate.getTime() <= after.getTime()) continue;
    return candidate.toISOString();
  }

  const fallback = new Date(after);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(input.hour, 0, 0, 0);
  return fallback.toISOString();
}

export function suggestBestSlotForPlatform(
  platform: string,
  insights: PlatformScheduleInsight[],
  options?: { after?: Date; timeZone?: string },
): ScheduleSlotSuggestion {
  const insight = insightForPlatform(platform, insights);
  const scheduledAt = findNextSlotISO({
    dayOfWeek: insight.bestDayOfWeek,
    hour: insight.bestHour,
    timeZone: options?.timeZone,
    after: options?.after,
  });

  const confidence =
    insight.source === "data" ? Math.min(1, insight.sampleCount / 8) : 0.35;

  return {
    platform,
    scheduledAt,
    label: insight.label,
    source: insight.source,
    confidence,
    detail:
      insight.source === "data"
        ? `${insight.sampleCount} publish sample(s) · ${(insight.avgEngagement * 100).toFixed(1)}% avg engagement`
        : "Industry default slot — publish more to learn your audience",
  };
}

export function suggestBestSlotForPost(
  postId: string,
  metrics: PostMetrics[],
  posts: ContentPost[],
  timeZone?: string,
): ScheduleSlotSuggestion | null {
  const post = posts.find((p) => p.id === postId);
  if (!post) return null;

  const insights = buildPlatformScheduleInsights({ metrics, posts, timeZone });
  const slot = suggestBestSlotForPlatform(post.platform, insights, { timeZone });
  return { ...slot, postId };
}

export function suggestBestSlotsThisWeek(
  platforms: string[],
  metrics: PostMetrics[],
  posts: ContentPost[],
  anchor: Date,
  timeZone?: string,
): ScheduleSlotSuggestion[] {
  const insights = buildPlatformScheduleInsights({ metrics, posts, timeZone });
  const weekStart = new Date(anchor);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const unique = [...new Set(platforms.filter(Boolean))];
  const suggestions: ScheduleSlotSuggestion[] = [];

  for (const platform of unique) {
    let after = new Date(Math.max(Date.now(), weekStart.getTime()));
    const insight = insightForPlatform(platform, insights);

    for (let n = 0; n < 3; n++) {
      const scheduledAt = findNextSlotISO({
        dayOfWeek: insight.bestDayOfWeek,
        hour: insight.bestHour,
        timeZone,
        after,
      });
      const when = new Date(scheduledAt);
      if (when.getTime() >= weekEnd.getTime()) break;

      const slot = suggestBestSlotForPlatform(platform, insights, { after, timeZone });
      slot.scheduledAt = scheduledAt;
      suggestions.push(slot);
      after = new Date(when.getTime() + 60 * 60 * 1000);
    }
  }

  return suggestions.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export async function resolveScheduleTimeForPost(
  postId: string,
  explicit?: string | null,
): Promise<string> {
  if (explicit?.trim()) return explicit;

  const { readAppFreState } = await import("./app-fre-state");
  const { listPostMetrics } = await import("./content-analytics-store");
  const { fetchContentStatus, getContentPost } = await import("./content-queue-store");

  const post = await getContentPost(postId);
  if (!post) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString();
  }

  const fre = await readAppFreState("my-content-creator");
  const timeZone = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;
  const useDataDriven = fre.config.useDataDrivenSchedule !== false;

  if (useDataDriven) {
    const [metrics, status] = await Promise.all([listPostMetrics(), fetchContentStatus()]);
    const suggestion = suggestBestSlotForPost(postId, metrics, status.posts, timeZone);
    if (suggestion) return suggestion.scheduledAt;
  }

  const { suggestScheduleTime } = await import("./content-calendar");
  return suggestScheduleTime(post.platform, 1, timeZone);
}
