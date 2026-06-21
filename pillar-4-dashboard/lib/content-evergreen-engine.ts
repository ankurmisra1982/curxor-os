import "server-only";

import {
  clonePostForEvergreenRecycle,
  createPostFromSource,
  ensureContentQueue,
  getContentPost,
} from "./content-queue-store";
import type { ContentPost } from "./content-queue-types";
import { listLibraryAssets, updateLibraryAsset } from "./content-library-store";
import { resolveScheduleTimeForPost } from "./content-schedule-insights";

export interface EvergreenRecycleResult {
  sourcePostId: string;
  newPostId: string;
  scheduledAt: string;
}

function isEvergreenDue(post: ContentPost): boolean {
  const intervalDays = post.evergreenIntervalDays ?? 30;
  const last = post.evergreenLastRecycledAt ?? post.publishedAt;
  if (!last) return false;
  const dueAt = new Date(last);
  dueAt.setDate(dueAt.getDate() + intervalDays);
  return dueAt <= new Date();
}

export async function recycleEvergreenPost(source: ContentPost): Promise<EvergreenRecycleResult | null> {
  if (source.stage !== "PUBLISHED" || !source.evergreen) return null;
  if (!isEvergreenDue(source)) return null;

  const scheduledAt = await resolveScheduleTimeForPost(source.id);
  const clone = await clonePostForEvergreenRecycle(source.id, scheduledAt);
  if (!clone) return null;
  return { sourcePostId: source.id, newPostId: clone.id, scheduledAt };
}

export async function processDueEvergreenRecycles(): Promise<EvergreenRecycleResult[]> {
  const file = await ensureContentQueue();
  const results: EvergreenRecycleResult[] = [];

  for (const post of file.posts.filter((p) => p.evergreen === true && p.stage === "PUBLISHED").slice(0, 8)) {
    const recycled = await recycleEvergreenPost(post);
    if (recycled) results.push(recycled);
  }

  const assets = await listLibraryAssets();
  for (const asset of assets.filter((a) => a.evergreen && a.postId).slice(0, 8)) {
    const post = await getContentPost(asset.postId!);
    if (!post || post.stage !== "PUBLISHED" || !isEvergreenDue({ ...post, evergreen: true, evergreenIntervalDays: asset.evergreenIntervalDays })) {
      continue;
    }
    const recycled = await recycleEvergreenPost({ ...post, evergreen: true, evergreenIntervalDays: asset.evergreenIntervalDays });
    if (recycled) {
      await updateLibraryAsset(asset.id, { lastRecycledAt: new Date().toISOString() });
      results.push(recycled);
    }
  }

  return results;
}

export async function createPostFromLibraryAsset(assetId: string): Promise<ContentPost | null> {
  const assets = await listLibraryAssets();
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return null;

  const source = asset.postId ? await getContentPost(asset.postId) : null;
  if (source) {
    return createPostFromSource(source, {
      libraryAssetId: asset.id,
      sourcePostId: source.id,
      draftText: source.draftText || asset.draftPreview,
    });
  }

  const { createContentPost } = await import("./content-queue-store");
  const platform = (asset.platform ?? "x") as import("./social-channels").SocialPlatformId;
  return createContentPost({
    channel: `${platform} Channel`,
    platform,
    draftText: asset.draftPreview,
  });
}
