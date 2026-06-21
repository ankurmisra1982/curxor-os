import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface PostMetrics {
  postId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  ctr: number | null;
  hookVariantId: string | null;
  thumbnailVariantId?: string | null;
  platformPostId?: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  source: "manual" | "bridge" | "demo" | "live";
}

interface AnalyticsFile {
  version: 1;
  metrics: PostMetrics[];
  updatedAt: string;
}

function analyticsPath(): string {
  return process.env.CURXOR_CONTENT_ANALYTICS_PATH ?? "/etc/curxor/content-analytics.json";
}

async function readFile_(): Promise<AnalyticsFile> {
  try {
    const raw = await readFile(analyticsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AnalyticsFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.metrics)) throw new Error("invalid");
    return {
      version: 1,
      metrics: parsed.metrics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, metrics: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: AnalyticsFile): Promise<void> {
  const filePath = analyticsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listPostMetrics(postId?: string): Promise<PostMetrics[]> {
  const file = await readFile_();
  const rows = postId ? file.metrics.filter((m) => m.postId === postId) : file.metrics;
  return rows.slice(0, 128);
}

export async function upsertPostMetrics(input: Omit<PostMetrics, "fetchedAt"> & { fetchedAt?: string }): Promise<PostMetrics> {
  const file = await readFile_();
  const now = input.fetchedAt ?? new Date().toISOString();
  const row: PostMetrics = { ...input, fetchedAt: now };
  const idx = file.metrics.findIndex((m) => m.postId === row.postId);
  if (idx >= 0) file.metrics[idx] = row;
  else file.metrics.unshift(row);
  if (file.metrics.length > 256) file.metrics = file.metrics.slice(0, 256);
  await writeFile_(file);
  return row;
}

export async function ingestDemoMetrics(postIds: string[]): Promise<PostMetrics[]> {
  const out: PostMetrics[] = [];
  for (let i = 0; i < postIds.length; i++) {
    const postId = postIds[i]!;
    const views = 800 + Math.floor(Math.random() * 4200);
    const likes = Math.floor(views * (0.02 + Math.random() * 0.06));
    const published = new Date();
    published.setDate(published.getDate() - (i % 14));
    published.setHours(8 + (i * 3) % 12, 0, 0, 0);
    const row = await upsertPostMetrics({
      postId,
      platform: i % 3 === 0 ? "linkedin" : i % 2 === 0 ? "tiktok" : "x",
      views,
      likes,
      comments: Math.floor(likes * 0.15),
      shares: Math.floor(likes * 0.08),
      ctr: Number((likes / views).toFixed(4)),
      hookVariantId: null,
      publishedAt: published.toISOString(),
      source: "demo",
    });
    out.push(row);
  }
  return out;
}

export interface HookPerformance {
  hookVariantId: string;
  label: string;
  avgViews: number;
  avgLikes: number;
  samples: number;
}

export function compareHookPerformance(
  metrics: PostMetrics[],
  hooks: Array<{ id: string; label: string }>,
): HookPerformance[] {
  const byHook = new Map<string, PostMetrics[]>();
  for (const m of metrics) {
    if (!m.hookVariantId) continue;
    const list = byHook.get(m.hookVariantId) ?? [];
    list.push(m);
    byHook.set(m.hookVariantId, list);
  }
  return hooks.map((h) => {
    const samples = byHook.get(h.id) ?? [];
    const avgViews = samples.length ? samples.reduce((s, m) => s + m.views, 0) / samples.length : 0;
    const avgLikes = samples.length ? samples.reduce((s, m) => s + m.likes, 0) / samples.length : 0;
    return { hookVariantId: h.id, label: h.label, avgViews, avgLikes, samples: samples.length };
  });
}

export function compareThumbnailPerformance(
  metrics: PostMetrics[],
  thumbs: Array<{ id: string; label: string }>,
): HookPerformance[] {
  const byThumb = new Map<string, PostMetrics[]>();
  for (const m of metrics) {
    if (!m.thumbnailVariantId) continue;
    const list = byThumb.get(m.thumbnailVariantId) ?? [];
    list.push(m);
    byThumb.set(m.thumbnailVariantId, list);
  }
  return thumbs.map((t) => {
    const samples = byThumb.get(t.id) ?? [];
    const avgViews = samples.length ? samples.reduce((s, m) => s + m.views, 0) / samples.length : 0;
    const avgLikes = samples.length ? samples.reduce((s, m) => s + m.likes, 0) / samples.length : 0;
    return { hookVariantId: t.id, label: t.label, avgViews, avgLikes, samples: samples.length };
  });
}

export async function recordMetricsFromReceipt(
  postId: string,
  platform: string,
  hookVariantId: string | null,
  platformPostId?: string | null,
  thumbnailVariantId?: string | null,
): Promise<PostMetrics> {
  return upsertPostMetrics({
    postId,
    platform,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    ctr: null,
    hookVariantId,
    thumbnailVariantId: thumbnailVariantId ?? null,
    platformPostId: platformPostId ?? null,
    publishedAt: new Date().toISOString(),
    source: "bridge",
  });
}
