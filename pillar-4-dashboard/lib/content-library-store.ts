import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ContentPost } from "./content-queue-types";

export interface LibraryAsset {
  id: string;
  name: string;
  type: "image" | "video" | "carousel" | "post_bundle";
  postId: string | null;
  platform: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  videoPath: string | null;
  draftPreview: string;
  tags: string[];
  evergreen: boolean;
  evergreenIntervalDays: number;
  lastRecycledAt: string | null;
  performanceViews: number;
  createdAt: string;
  updatedAt: string;
}

interface LibraryFile {
  version: 1;
  assets: LibraryAsset[];
  updatedAt: string;
}

function libraryPath(): string {
  return process.env.CURXOR_CONTENT_LIBRARY_PATH ?? "/etc/curxor/content-library.json";
}

async function readFile_(): Promise<LibraryFile> {
  try {
    const raw = await readFile(libraryPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LibraryFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.assets)) throw new Error("invalid");
    return {
      version: 1,
      assets: parsed.assets,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, assets: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: LibraryFile): Promise<void> {
  const filePath = libraryPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listLibraryAssets(tag?: string): Promise<LibraryAsset[]> {
  const file = await readFile_();
  let rows = file.assets;
  if (tag) rows = rows.filter((a) => a.tags.includes(tag));
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLibraryAsset(id: string): Promise<LibraryAsset | null> {
  const file = await readFile_();
  return file.assets.find((a) => a.id === id) ?? null;
}

export async function upsertLibraryAssetFromPost(
  post: ContentPost,
  input?: { evergreen?: boolean; evergreenIntervalDays?: number; tags?: string[] },
): Promise<LibraryAsset> {
  const file = await readFile_();
  const now = new Date().toISOString();
  const existing = file.assets.find((a) => a.postId === post.id);
  const type: LibraryAsset["type"] = post.carouselSlides?.length
    ? "carousel"
    : post.videoPath || post.videoUrl
      ? "video"
      : post.imagePath || post.imageUrl
        ? "image"
        : "post_bundle";

  const asset: LibraryAsset = {
    id: existing?.id ?? `LIB-${randomUUID().slice(0, 8)}`,
    name: existing?.name ?? `${post.id} · ${post.platform}`,
    type,
    postId: post.id,
    platform: post.platform,
    imageUrl: post.imageUrl ?? null,
    imagePath: post.imagePath ?? null,
    videoPath: post.videoPath ?? null,
    draftPreview: post.draftText.slice(0, 160),
    tags: input?.tags ?? existing?.tags ?? [post.platform, post.format],
    evergreen: input?.evergreen ?? existing?.evergreen ?? post.evergreen === true,
    evergreenIntervalDays:
      input?.evergreenIntervalDays ?? existing?.evergreenIntervalDays ?? post.evergreenIntervalDays ?? 30,
    lastRecycledAt: existing?.lastRecycledAt ?? post.evergreenLastRecycledAt ?? null,
    performanceViews: existing?.performanceViews ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    const idx = file.assets.findIndex((a) => a.id === existing.id);
    file.assets[idx] = asset;
  } else {
    file.assets.unshift(asset);
  }
  if (file.assets.length > 256) file.assets = file.assets.slice(0, 256);
  await writeFile_(file);
  return asset;
}

export async function updateLibraryAsset(
  id: string,
  patch: Partial<
    Pick<LibraryAsset, "name" | "tags" | "evergreen" | "evergreenIntervalDays" | "performanceViews" | "lastRecycledAt">
  >,
): Promise<LibraryAsset | null> {
  const file = await readFile_();
  const idx = file.assets.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  file.assets[idx] = { ...file.assets[idx]!, ...patch, updatedAt: new Date().toISOString() };
  await writeFile_(file);
  return file.assets[idx]!;
}

export async function removeLibraryAsset(id: string): Promise<boolean> {
  const file = await readFile_();
  const before = file.assets.length;
  file.assets = file.assets.filter((a) => a.id !== id);
  if (file.assets.length === before) return false;
  await writeFile_(file);
  return true;
}
