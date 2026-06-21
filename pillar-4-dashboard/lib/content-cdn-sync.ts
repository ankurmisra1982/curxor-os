import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { assetPublicUrl } from "./content-assets-store";

export interface CdnSyncResult {
  synced: string[];
  skipped: string[];
  errors: string[];
}

/** Optional S3-compatible upload via presigned PUT URLs (one URL per line in env). */
export async function syncAssetToCdn(relativePath: string): Promise<string | null> {
  const endpoint = process.env.CURXOR_CDN_SYNC_ENDPOINT?.trim();
  const token = process.env.CURXOR_CDN_SYNC_TOKEN?.trim();
  if (!endpoint || !token) return assetPublicUrl(relativePath);

  const assetsRoot = process.env.CURXOR_CONTENT_ASSETS_PATH ?? "/etc/curxor/content-assets";
  const filePath = path.join(assetsRoot, relativePath);
  let buf: Buffer;
  try {
    buf = await readFile(filePath);
  } catch {
    return null;
  }

  const key = relativePath.replace(/\\/g, "/");
  const url = `${endpoint.replace(/\/$/, "")}/${key}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buf),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const publicBase = process.env.CURXOR_CDN_PUBLIC_BASE?.trim().replace(/\/$/, "");
    return publicBase ? `${publicBase}/${key}` : url;
  } catch {
    return null;
  }
}

export async function syncPostAssetsToCdn(post: {
  id: string;
  imagePath?: string | null;
  videoPath?: string | null;
}): Promise<CdnSyncResult> {
  const synced: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const assetsRoot = process.env.CURXOR_CONTENT_ASSETS_PATH ?? "/etc/curxor/content-assets";

  for (const p of [post.imagePath, post.videoPath]) {
    if (!p) continue;
    const rel = path.relative(assetsRoot, p).replace(/\\/g, "/");
    const url = await syncAssetToCdn(rel);
    if (url) synced.push(url);
    else errors.push(`Failed CDN sync: ${rel}`);
  }

  if (!process.env.CURXOR_CDN_SYNC_ENDPOINT) {
    skipped.push("CDN sync not configured — using CURXOR_CONTENT_PUBLIC_BASE");
  }

  return { synced, skipped, errors };
}
