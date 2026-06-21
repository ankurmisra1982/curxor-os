import "server-only";

import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

import { ensureContentQueue } from "./content-queue-store";

function assetsRoot(): string {
  return process.env.CURXOR_CONTENT_ASSETS_PATH ?? "/etc/curxor/content-assets";
}

function exportRoot(): string {
  return process.env.CURXOR_CONTENT_EXPORT_PATH ?? "/tmp/curxor-content-exports";
}

export async function buildContentExportBundle(): Promise<{ manifestPath: string; archivePath: string | null }> {
  const queue = await ensureContentQueue();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(exportRoot(), stamp);
  await mkdir(dir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    postCount: queue.posts.length,
    posts: queue.posts.map((p) => ({
      id: p.id,
      platform: p.platform,
      stage: p.stage,
      draftText: p.draftText,
      imagePath: p.imagePath,
      videoPath: p.videoPath,
      scheduledAt: p.scheduledAt,
      publishedUrl: p.publishedUrl,
      hookVariants: p.hookVariants,
      carouselSlides: p.carouselSlides,
    })),
  };

  const manifestPath = path.join(dir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const assetsDir = path.join(dir, "assets");
  await mkdir(assetsDir, { recursive: true });

  for (const post of queue.posts) {
    for (const assetPath of [post.imagePath, post.videoPath]) {
      if (!assetPath) continue;
      try {
        const base = path.basename(assetPath);
        const dest = path.join(assetsDir, `${post.id}-${base}`);
        await copyFile(assetPath, dest);
      } catch {
        /* skip missing assets */
      }
    }
    if (post.carouselSlides?.length) {
      for (let i = 0; i < post.carouselSlides.length; i++) {
        const slide = post.carouselSlides[i]!;
        if (!slide.imagePath) continue;
        try {
          const dest = path.join(assetsDir, `${post.id}-slide-${i + 1}${path.extname(slide.imagePath)}`);
          await copyFile(slide.imagePath, dest);
        } catch {
          /* skip */
        }
      }
    }
  }

  const archivePath = path.join(dir, "content-export.tar.gz");
  const tarOk = spawnSync("tar", ["-czf", archivePath, "-C", dir, "manifest.json", "assets"], {
    encoding: "utf8",
  }).status === 0;

  if (!tarOk) {
    const jsonGz = path.join(dir, "manifest.json.gz");
    const src = await readFile(manifestPath);
    await pipeline(
      async function* () {
        yield src;
      },
      createGzip(),
      createWriteStream(jsonGz),
    );
    return { manifestPath, archivePath: jsonGz };
  }

  return { manifestPath, archivePath };
}

export async function readExportFile(relativePath: string): Promise<Buffer | null> {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return null;
  const filePath = path.join(exportRoot(), normalized);
  const root = path.resolve(exportRoot());
  if (!path.resolve(filePath).startsWith(root)) return null;
  try {
    const st = await stat(filePath);
    if (!st.isFile()) return null;
    return readFile(filePath);
  } catch {
    return null;
  }
}
