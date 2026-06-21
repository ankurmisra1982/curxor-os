import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { platformFormatSpec } from "./content-platform-format";
import type { ContentPost } from "./content-queue-types";
import type { SocialPlatformId } from "./social-channels";

export interface VideoProbe {
  durationSec: number;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface MediaValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  probe: VideoProbe | null;
}

export function probeVideoFile(videoPath: string): VideoProbe | null {
  if (!videoPath || !existsSync(videoPath)) return null;

  const proc = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-show_entries",
      "format=size",
      "-of",
      "json",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) return null;

  try {
    const data = JSON.parse(proc.stdout) as {
      streams?: Array<{ width?: number; height?: number; duration?: string }>;
      format?: { size?: string; duration?: string };
    };
    const stream = data.streams?.[0];
    const dur = Number.parseFloat(stream?.duration ?? data.format?.duration ?? "0");
    const width = stream?.width ?? 0;
    const height = stream?.height ?? 0;
    const sizeBytes = Number.parseInt(data.format?.size ?? "0", 10);
    if (!Number.isFinite(dur) || dur <= 0) return null;
    return { durationSec: dur, width, height, sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0 };
  } catch {
    return null;
  }
}

export async function validatePostMedia(post: ContentPost): Promise<MediaValidationResult> {
  const spec = platformFormatSpec(post.platform);
  const errors: string[] = [];
  const warnings: string[] = [];
  let probe: VideoProbe | null = null;

  if (spec.media === "image" && !post.imageUrl && !post.imagePath) {
    errors.push("Image required — Capture Thumbnail or Generate AI Image");
  }
  if (spec.media === "video" && !post.videoUrl && !post.videoPath) {
    errors.push("Video required — Render Video first");
  }

  if (post.videoPath) {
    probe = probeVideoFile(post.videoPath);
    if (!probe) {
      warnings.push("Could not ffprobe video — install ffprobe on appliance");
    } else {
      const minDur = post.platform === "snapchat" ? 6 : 5;
      const maxDur = spec.videoMaxSec ?? 600;
      if (probe.durationSec < minDur) errors.push(`Video too short (${probe.durationSec.toFixed(1)}s · min ${minDur}s)`);
      if (probe.durationSec > maxDur) errors.push(`Video too long (${probe.durationSec.toFixed(1)}s · max ${maxDur}s)`);

      const isVertical = probe.height >= probe.width;
      if (["tiktok", "instagram", "youtube", "snapchat"].includes(post.platform) && !isVertical) {
        warnings.push(`Aspect ${probe.width}×${probe.height} — prefer 9:16 vertical`);
      }
      if (probe.width > 0 && probe.width < 540) {
        errors.push(`Width ${probe.width}px below 540px minimum`);
      }
    }
  }

  if (post.platform === "youtube" && post.format === "short" && post.draftText && !post.draftText.toLowerCase().includes("#shorts")) {
    warnings.push("YouTube Shorts — #Shorts tag recommended in caption");
  }

  return { ok: errors.length === 0, errors, warnings, probe };
}

export function validationSummaryForPlatform(platform: SocialPlatformId): string[] {
  const spec = platformFormatSpec(platform);
  const lines = [`Media: ${spec.media}`, spec.aspectRatio ? `Aspect: ${spec.aspectRatio}` : ""];
  if (spec.videoMaxSec) lines.push(`Max video: ${spec.videoMaxSec}s`);
  return lines.filter(Boolean);
}
