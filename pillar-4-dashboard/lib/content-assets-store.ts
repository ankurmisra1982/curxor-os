import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { detectTtsEngine, synthesizeVoiceover, ttsLabel } from "./content-tts";

export { ttsLabel, detectTtsEngine };

function assetsRoot(): string {
  return process.env.CURXOR_CONTENT_ASSETS_PATH ?? "/etc/curxor/content-assets";
}

function publicBaseUrl(): string | null {
  const base = process.env.CURXOR_CONTENT_PUBLIC_BASE?.trim().replace(/\/$/, "");
  return base || null;
}

export function assetPublicUrl(relativePath: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}/api/content/asset?file=${encodeURIComponent(relativePath)}`;
}

export async function saveThumbnailFromBase64(
  postId: string,
  base64: string,
): Promise<{ imagePath: string; imageUrl: string | null }> {
  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });

  const payload = base64.includes(",") ? base64.split(",", 2)[1]! : base64;
  const buf = Buffer.from(payload, "base64");
  if (buf.length === 0) throw new Error("Empty image data");

  const fileName = "thumbnail.jpg";
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buf, { mode: 0o640 });

  const relative = `${safeId}/${fileName}`;
  return { imagePath: filePath, imageUrl: assetPublicUrl(relative) };
}

export async function saveImageBuffer(
  postId: string,
  buf: Buffer,
  fileName = "ai-thumbnail.png",
): Promise<{ imagePath: string; imageUrl: string | null }> {
  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buf, { mode: 0o640 });

  const relative = `${safeId}/${fileName}`;
  return { imagePath: filePath, imageUrl: assetPublicUrl(relative) };
}

export async function readAssetFile(relativeFile: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const normalized = relativeFile.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return null;

  const filePath = path.join(assetsRoot(), normalized);
  const root = path.resolve(assetsRoot());
  if (!path.resolve(filePath).startsWith(root)) return null;

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".mp4"
            ? "video/mp4"
            : "application/octet-stream";
    return { buf, contentType };
  } catch {
    return null;
  }
}

export async function renderVerticalVideoFromImage(
  postId: string,
  imagePath: string,
  script: string,
  durationSec = 15,
  options?: {
    voiceover?: boolean;
    ttsVoice?: string;
    watermarkPath?: string | null;
    musicBedPath?: string | null;
    aspectW?: number;
    aspectH?: number;
    burnCaptions?: boolean;
    captionStyle?: "burned" | "drawtext" | "none" | "srt-only";
  },
): Promise<{ videoPath: string; videoUrl: string | null; ttsEngine: string; srtPath: string | null }> {
  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });

  const silentPath = path.join(dir, "render-silent.mp4");
  const outPath = path.join(dir, "render.mp4");
  const wavPath = path.join(dir, "voiceover.wav");
  const srtPath = path.join(dir, "captions.srt");
  const hook = script.split("\n")[0]?.trim().slice(0, 80) ?? "CurXor Creator Claw";

  let videoDuration = Math.min(Math.max(durationSec, 6), 60);
  let ttsEngine = "none";
  let audioPath: string | null = null;
  let generatedSrt: string | null = null;

  const wantVoice = options?.voiceover !== false && detectTtsEngine() !== "none";
  if (wantVoice) {
    try {
      const synth = synthesizeVoiceover(script, wavPath, { voice: options?.ttsVoice });
      ttsEngine = synth.engine;
      audioPath = synth.path;
      const audioDur = wavDurationSec(wavPath);
      if (audioDur !== null) {
        videoDuration = Math.min(Math.max(Math.ceil(audioDur) + 1, 6), 60);
        if (options?.burnCaptions !== false) {
          generatedSrt = writeSimpleSrt(script, audioDur, srtPath);
        }
      }
    } catch {
      ttsEngine = "none";
      audioPath = null;
    }
  }

  const w = options?.aspectW ?? 1080;
  const h = options?.aspectH ?? 1920;
  const vfParts = [
    `scale=${w}:${h}:force_original_aspect_ratio=decrease`,
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`,
  ];
  if (!generatedSrt && options?.burnCaptions !== false) {
    vfParts.push(
      `drawtext=text='${hook.replace(/'/g, "\\'")}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=h-120:box=1:boxcolor=black@0.5`,
    );
  }
  const vf = vfParts.join(",");

  const silentProc = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-c:v",
      "libx264",
      "-t",
      String(videoDuration),
      "-pix_fmt",
      "yuv420p",
      "-vf",
      vf,
      "-an",
      silentPath,
    ],
    { encoding: "utf8" },
  );

  if (silentProc.status !== 0 || silentProc.error) {
    throw new Error((silentProc.stderr || silentProc.error?.message || "ffmpeg render failed").slice(0, 300));
  }

  if (audioPath) {
    let muxProc;
    if (options?.musicBedPath) {
      muxProc = spawnSync(
        "ffmpeg",
        [
          "-y",
          "-i",
          silentPath,
          "-i",
          audioPath,
          "-i",
          options.musicBedPath,
          "-filter_complex",
          "[1:a]volume=1.0[v1];[2:a]volume=0.25[v2];[v1][v2]amix=inputs=2:duration=first:dropout_transition=2[aout]",
          "-map",
          "0:v",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-shortest",
          outPath,
        ],
        { encoding: "utf8" },
      );
    } else {
      muxProc = spawnSync(
        "ffmpeg",
        ["-y", "-i", silentPath, "-i", audioPath, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outPath],
        { encoding: "utf8" },
      );
    }
    if (muxProc.status !== 0) {
      throw new Error((muxProc.stderr || "ffmpeg audio mux failed").slice(0, 300));
    }
    if (generatedSrt && options?.captionStyle !== "srt-only") {
      const captioned = path.join(dir, "render-captioned.mp4");
      burnSrtCaptions(outPath, generatedSrt, captioned);
    }
  } else {
    const moveProc = spawnSync("ffmpeg", ["-y", "-i", silentPath, "-c", "copy", outPath], { encoding: "utf8" });
    if (moveProc.status !== 0) {
      throw new Error((moveProc.stderr || "ffmpeg copy failed").slice(0, 300));
    }
  }

  if (options?.watermarkPath) {
    applyWatermark(outPath, options.watermarkPath, path.join(dir, "render-wm.mp4"));
  }

  const relative = `${safeId}/render.mp4`;
  return {
    videoPath: outPath,
    videoUrl: assetPublicUrl(relative),
    ttsEngine,
    srtPath: generatedSrt,
  };
}

function writeSimpleSrt(script: string, totalSec: number, srtPath: string): string {
  const lines = script.split(/\n+/).filter(Boolean).slice(0, 8);
  const chunk = totalSec / Math.max(lines.length, 1);
  let srt = "";
  lines.forEach((line, i) => {
    const start = i * chunk;
    const end = Math.min(totalSec, (i + 1) * chunk);
    srt += `${i + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${line.trim()}\n\n`;
  });
  writeFileSync(srtPath, srt, "utf8");
  return srtPath;
}

function applyWatermark(videoIn: string, watermarkPath: string, videoOut: string): void {
  const proc = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      videoIn,
      "-i",
      watermarkPath,
      "-filter_complex",
      "overlay=W-w-24:24",
      "-c:a",
      "copy",
      videoOut,
    ],
    { encoding: "utf8" },
  );
  if (proc.status === 0) {
    spawnSync("ffmpeg", ["-y", "-i", videoOut, "-c", "copy", videoIn], { encoding: "utf8" });
  }
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function burnSrtCaptions(videoIn: string, srtPath: string, videoOut: string): void {
  const proc = spawnSync(
    "ffmpeg",
    ["-y", "-i", videoIn, "-vf", `subtitles=${srtPath.replace(/\\/g, "/").replace(/:/g, "\\:")}`, "-c:a", "copy", videoOut],
    { encoding: "utf8" },
  );
  if (proc.status === 0) {
    spawnSync("ffmpeg", ["-y", "-i", videoOut, "-c", "copy", videoIn], { encoding: "utf8" });
  }
}

export async function concatVideoClips(
  postId: string,
  clipPaths: string[],
): Promise<{ videoPath: string; videoUrl: string | null }> {
  if (clipPaths.length === 0) throw new Error("No clips to concat");
  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });
  const listPath = path.join(dir, "concat-list.txt");
  const listContent = clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, listContent, "utf8");
  const outPath = path.join(dir, "timeline.mp4");
  const proc = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) {
    throw new Error((proc.stderr || "ffmpeg concat failed").slice(0, 300));
  }
  const relative = `${safeId}/timeline.mp4`;
  return { videoPath: outPath, videoUrl: assetPublicUrl(relative) };
}

export async function cropImageForPlatform(
  postId: string,
  imagePath: string,
  aspectW: number,
  aspectH: number,
): Promise<{ imagePath: string; imageUrl: string | null }> {
  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, `cropped-${aspectW}x${aspectH}.jpg`);
  const vf = `scale=${aspectW}:${aspectH}:force_original_aspect_ratio=increase,crop=${aspectW}:${aspectH}`;
  const proc = spawnSync("ffmpeg", ["-y", "-i", imagePath, "-vf", vf, "-q:v", "2", outPath], { encoding: "utf8" });
  if (proc.status !== 0) {
    throw new Error((proc.stderr || "ffmpeg crop failed").slice(0, 300));
  }
  const relative = `${safeId}/${path.basename(outPath)}`;
  return { imagePath: outPath, imageUrl: assetPublicUrl(relative) };
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);

export async function saveUploadedMedia(
  postId: string,
  buf: Buffer,
  originalName: string,
  kind: "image" | "video",
): Promise<{
  imagePath?: string;
  imageUrl?: string | null;
  videoPath?: string;
  videoUrl?: string | null;
}> {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = kind === "image" ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  if (!allowed.has(ext)) {
    throw new Error(`Unsupported ${kind} type — use ${[...allowed].join(", ")}`);
  }

  const safeId = postId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(assetsRoot(), safeId);
  await mkdir(dir, { recursive: true });

  const fileName = kind === "image" ? `upload${ext}` : `upload${ext}`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buf, { mode: 0o640 });

  const relative = `${safeId}/${fileName}`;
  if (kind === "image") {
    return { imagePath: filePath, imageUrl: assetPublicUrl(relative) };
  }
  return { videoPath: filePath, videoUrl: assetPublicUrl(relative) };
}

export function platformAspectDimensions(platform: string): { w: number; h: number } {
  switch (platform) {
    case "youtube":
      return { w: 1920, h: 1080 };
    case "pinterest":
      return { w: 1000, h: 1500 };
    case "linkedin":
      return { w: 1200, h: 627 };
    default:
      return { w: 1080, h: 1920 };
  }
}

function wavDurationSec(wavPath: string): number | null {
  const proc = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wavPath],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) return null;
  const n = Number.parseFloat(proc.stdout.trim());
  return Number.isFinite(n) ? n : null;
}

export function ffmpegAvailable(): boolean {
  const proc = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return proc.status === 0;
}
