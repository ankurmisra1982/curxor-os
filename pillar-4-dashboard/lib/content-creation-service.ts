import "server-only";

import { generateText, generateImageLocal, isImageGenerationAvailable } from "./local-inference";
import {
  buildAdaptPrompt,
  parseAdaptedDraft,
  platformFormatSpec,
  type PlatformAdaptedDraft,
} from "./content-platform-format";
import {
  ffmpegAvailable,
  renderVerticalVideoFromImage,
  saveImageBuffer,
  saveThumbnailFromBase64,
  ttsLabel,
  concatVideoClips,
  cropImageForPlatform,
  platformAspectDimensions,
} from "./content-assets-store";
import {
  advancePostStage,
  createContentPost,
  getContentPost,
  savePostDraft,
  savePostMedia,
  savePlatformVariants,
  saveHookVariants,
  scheduleContentPost,
  saveCarouselSlides,
  saveTimelineClips,
} from "./content-queue-store";
import { parseContentTemplates, templateById } from "./content-templates";
import { randomUUID } from "node:crypto";
import type { CarouselSlide } from "./content-queue-types";
import { brandKitFromConfig, applyBrandToCaption, type BrandKit } from "./content-brand-kit";
import { readAppFreState } from "./app-fre-state";
import { enqueueContentJob } from "./content-jobs-store";
import { validatePostMedia } from "./content-media-validation";
import type { HookVariant, ContentPost } from "./content-queue-types";
import { platformLabel, type SocialPlatformId } from "./social-channels";

async function loadBrandKit(): Promise<BrandKit> {
  const fre = await readAppFreState("my-content-creator");
  return brandKitFromConfig(fre.config);
}

export async function enqueueRenderJob(
  postId: string,
  options?: { voiceover?: boolean; script?: string },
): Promise<{ jobId: string }> {
  const job = await enqueueContentJob(postId, "render_video", {
    voiceover: options?.voiceover !== false,
    script: options?.script,
  });
  return { jobId: job.id };
}

export async function enqueueAiImageJob(postId: string, prompt?: string): Promise<{ jobId: string }> {
  const job = await enqueueContentJob(postId, "generate_ai_image", { prompt });
  return { jobId: job.id };
}

export async function generateHookVariantsForPost(
  postId: string,
  count = 3,
): Promise<HookVariant[]> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const source = post.masterDraftText?.trim() || post.draftText.trim();
  if (!source) throw new Error("No draft text for hook generation");

  const raw = await generateText(
    `You write ${count} distinct opening hooks (first line only) for social posts. Output JSON array: [{"label":"A","text":"..."}, ...]. No markdown.`,
    `Platform: ${post.platform}\nDraft:\n${source.slice(0, 600)}`,
  );

  let hooks: HookVariant[] = [];
  try {
    const parsed = JSON.parse(raw ?? "[]") as Array<{ label?: string; text?: string }>;
    hooks = parsed
      .filter((h) => typeof h.text === "string" && h.text.trim())
      .slice(0, count)
      .map((h, i) => ({
        id: `hook-${i + 1}`,
        label: h.label?.trim() || String.fromCharCode(65 + i),
        text: h.text!.trim(),
      }));
  } catch {
    /* fall through */
  }

  if (hooks.length === 0) {
    hooks = [
      { id: "hook-1", label: "A", text: source.split("\n")[0]!.slice(0, 120) },
      { id: "hook-2", label: "B", text: `Why ${post.platform} creators should read this:` },
      { id: "hook-3", label: "C", text: source.slice(0, 80).trim() },
    ];
  }

  await saveHookVariants(postId, hooks, hooks[0]!.id);
  return hooks;
}

export type RepurposePreset = "long_to_social" | "video_to_thread" | "single_to_all";

const REPURPOSE_TARGETS: Record<RepurposePreset, SocialPlatformId[]> = {
  long_to_social: ["x", "threads", "linkedin", "bluesky"],
  video_to_thread: ["x", "threads"],
  single_to_all: ["x", "tiktok", "youtube", "instagram", "linkedin"],
};

export async function repurposeContent(
  postId: string,
  preset: RepurposePreset,
  tone: string,
): Promise<{ adapted: PlatformAdaptedDraft[]; createdIds: string[] }> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const platforms = REPURPOSE_TARGETS[preset];
  const adapted = await adaptPostForPlatforms(postId, platforms, tone);

  const createdIds: string[] = [];
  for (const item of adapted) {
    if (item.platform === post.platform) continue;
    const child = await createContentPost({
      channel: `${platformLabel(item.platform)} · repurpose`,
      platform: item.platform,
      format: item.format,
      draftText: item.text,
    });
    await savePostMedia(child.id, {
      imageUrl: post.imageUrl,
      imagePath: post.imagePath,
      videoUrl: post.videoUrl,
      videoPath: post.videoPath,
    });
    createdIds.push(child.id);
  }

  return { adapted, createdIds };
}

export interface FanOutResult {
  createdIds: string[];
  scheduledIds: string[];
}

export async function captureThumbnailForPost(
  postId: string,
  imageBase64: string,
): Promise<{ imagePath: string; imageUrl: string | null }> {
  const saved = await saveThumbnailFromBase64(postId, imageBase64);
  await savePostMedia(postId, {
    imagePath: saved.imagePath,
    imageUrl: saved.imageUrl,
  });
  return saved;
}

export async function generateAiThumbnailForPost(
  postId: string,
  promptOverride?: string,
): Promise<{ imagePath: string; imageUrl: string | null; prompt: string }> {
  if (!(await isImageGenerationAvailable())) {
    throw new Error("Image generation requires Ollama — set CURXOR_IMAGE_MODEL (e.g. flux) and ollama pull");
  }

  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const draft = post.masterDraftText?.trim() || post.draftText.trim();
  const spec = platformFormatSpec(post.platform);
  const kit = await loadBrandKit();
  const brandedDraft = draft ? applyBrandToCaption(draft, kit) : draft;

  let imagePrompt = promptOverride?.trim();
  if (!imagePrompt) {
    const expanded = await generateText(
      "You write concise image generation prompts for social thumbnails. Output one line only — vivid, 9:16 vertical, no quotes.",
      draft
        ? `Thumbnail for ${post.platform} post:\n${brandedDraft.slice(0, 400)}`
        : `Eye-catching ${spec.aspectRatio ?? "9:16"} tech creator thumbnail for ${post.platform}`,
    );
    imagePrompt =
      expanded?.trim() ||
      `Professional ${post.platform} thumbnail, vertical 9:16, bold typography, tech aesthetic, high contrast`;
  }

  const buf = await generateImageLocal(imagePrompt);
  if (!buf) {
    throw new Error(`Image model failed — run: ollama pull ${process.env.CURXOR_IMAGE_MODEL ?? "flux"}`);
  }

  const saved = await saveImageBuffer(postId, buf, "ai-thumbnail.png");
  await savePostMedia(postId, {
    imagePath: saved.imagePath,
    imageUrl: saved.imageUrl,
  });
  return { ...saved, prompt: imagePrompt };
}

export async function renderVideoForPost(
  postId: string,
  script?: string,
  options?: { voiceover?: boolean },
): Promise<{ videoPath: string; videoUrl: string | null; ttsEngine: string }> {
  if (!ffmpegAvailable()) {
    throw new Error("ffmpeg not found on appliance — install ffmpeg for video render");
  }
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const imagePath = post.imagePath;
  if (!imagePath) {
    throw new Error("Add a thumbnail first — Capture Thumbnail, Generate AI Image, or vision frame");
  }

  const text = script?.trim() || post.draftText.trim() || post.masterDraftText?.trim() || "CurXor Creator Claw";
  const kit = await loadBrandKit();
  const voiceText = applyBrandToCaption(text, kit);
  const spec = platformFormatSpec(post.platform);
  const duration = Math.min(spec.videoMaxSec ?? 30, 30);

  const { w, h } = platformAspectDimensions(post.platform);
  const musicBed = process.env.CURXOR_MUSIC_BED_PATH?.trim() || undefined;
  const style = post.captionStyle ?? "burned";
  const burnCaptions = style === "burned" || style === "srt-only";
  const voiceover = style === "none" ? false : options?.voiceover !== false;

  const rendered = await renderVerticalVideoFromImage(postId, imagePath, voiceText, duration, {
    voiceover,
    ttsVoice: kit.ttsVoice ?? undefined,
    watermarkPath: kit.watermarkPath,
    musicBedPath: musicBed,
    aspectW: w,
    aspectH: h,
    burnCaptions: style === "drawtext" ? true : burnCaptions,
    captionStyle: style,
  });
  await savePostMedia(postId, {
    videoPath: rendered.videoPath,
    videoUrl: rendered.videoUrl,
  });
  await advancePostStage(postId);
  return rendered;
}

export async function renderAdvancedVideoForPost(
  postId: string,
  payload: Record<string, unknown>,
): Promise<{ videoPath: string; videoUrl: string | null; ttsEngine: string }> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  if (post.timelineClips && post.timelineClips.length > 1) {
    const paths = post.timelineClips.map((c) => c.path).filter(Boolean);
    const concat = await concatVideoClips(postId, paths);
    await savePostMedia(postId, { videoPath: concat.videoPath, videoUrl: concat.videoUrl });
    return { ...concat, ttsEngine: "concat" };
  }

  const script = typeof payload.script === "string" ? payload.script : undefined;
  return renderVideoForPost(postId, script, { voiceover: payload.voiceover !== false });
}

export async function cropPostImageForPlatform(postId: string): Promise<{ imagePath: string; imageUrl: string | null }> {
  const post = await getContentPost(postId);
  if (!post?.imagePath) throw new Error("No image to crop");
  const { w, h } = platformAspectDimensions(post.platform);
  const cropped = await cropImageForPlatform(postId, post.imagePath, w, h);
  await savePostMedia(postId, { imagePath: cropped.imagePath, imageUrl: cropped.imageUrl });
  return cropped;
}

export async function buildCarouselForPost(
  postId: string,
  slideCount = 3,
): Promise<import("./content-queue-types").CarouselSlide[]> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");
  const master = post.masterDraftText?.trim() || post.draftText.trim();
  if (!master) throw new Error("No draft for carousel");

  const raw = await generateText(
    `Split this into ${slideCount} carousel slide captions (one line each). Output JSON array of strings.`,
    master.slice(0, 800),
  );

  let captions: string[] = [];
  try {
    captions = JSON.parse(raw ?? "[]") as string[];
  } catch {
    captions = master.split(/\n+/).filter(Boolean).slice(0, slideCount);
  }

  const slides: CarouselSlide[] = captions.slice(0, slideCount).map((caption, i) => ({
    id: randomUUID(),
    caption: caption.trim(),
    imagePath: i === 0 ? post.imagePath ?? null : null,
    imageUrl: i === 0 ? post.imageUrl ?? null : null,
  }));

  await saveCarouselSlides(postId, slides);
  const combined = slides.map((s, i) => `Slide ${i + 1}: ${s.caption}`).join("\n\n");
  await savePostDraft(postId, combined);
  return slides;
}

export async function generateCarouselSlideImage(
  postId: string,
  slideId: string,
): Promise<{ imagePath: string; imageUrl: string | null }> {
  const post = await getContentPost(postId);
  if (!post?.carouselSlides?.length) throw new Error("Build carousel first");
  const slide = post.carouselSlides.find((s) => s.id === slideId);
  if (!slide) throw new Error("Slide not found");

  const generated = await generateAiThumbnailForPost(postId, slide.caption);
  const { updateCarouselSlideImage } = await import("./content-queue-store");
  await updateCarouselSlideImage(postId, slideId, {
    imagePath: generated.imagePath,
    imageUrl: generated.imageUrl,
  });
  return { imagePath: generated.imagePath, imageUrl: generated.imageUrl };
}

export async function generateThumbnailVariantsForPost(
  postId: string,
  count = 2,
): Promise<import("./content-queue-types").ThumbnailVariant[]> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const existing = post.thumbnailVariants ?? [];
  const variants: import("./content-queue-types").ThumbnailVariant[] = [...existing];

  for (let i = variants.length; i < count; i++) {
    const label = String.fromCharCode(65 + i);
    const prompt = `Alternate thumbnail ${label} for: ${(post.draftText || post.masterDraftText || "").slice(0, 200)}`;
    const gen = await generateAiThumbnailForPost(postId, prompt);
    variants.push({
      id: `thumb-${label.toLowerCase()}`,
      label,
      imagePath: gen.imagePath,
      imageUrl: gen.imageUrl,
    });
  }

  const { saveThumbnailVariants } = await import("./content-queue-store");
  await saveThumbnailVariants(postId, variants, variants[0]?.id ?? null);
  return variants;
}

export async function applyContentTemplate(postId: string, templateId: string): Promise<ContentPost | null> {
  const fre = await readAppFreState("my-content-creator");
  const templates = parseContentTemplates(fre.config.contentTemplates);
  const tpl = templateById(templates, templateId);
  if (!tpl) throw new Error("Template not found");

  await savePostDraft(postId, tpl.draftSeed);
  return getContentPost(postId);
}

export async function adaptPostForPlatforms(
  postId: string,
  platforms: SocialPlatformId[],
  tone: string,
  options?: { autoSchedule?: boolean; staggerMinutes?: number },
): Promise<PlatformAdaptedDraft[]> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const master = post.masterDraftText?.trim() || post.draftText.trim();
  if (!master) throw new Error("No draft text — write or generate a master draft first");

  const variants: Partial<
    Record<SocialPlatformId, { draftText: string; format: import("./social-channels").ContentFormat }>
  > = {};
  const results: PlatformAdaptedDraft[] = [];

  for (const platform of platforms) {
    const spec = platformFormatSpec(platform);
    const prompt = buildAdaptPrompt(platform, master, tone, spec.defaultFormat);
    const raw = await generateText(
      "You are Creator Claw — adapt social copy per platform rules. Output only publish-ready text.",
      prompt,
    );
    if (!raw?.trim()) continue;
    const adapted = parseAdaptedDraft(platform, raw, spec.defaultFormat);
    variants[platform] = { draftText: adapted.text, format: adapted.format };
    results.push(adapted);
  }

  await savePlatformVariants(postId, master, variants);

  if (variants[post.platform]) {
    await savePostDraft(postId, variants[post.platform]!.draftText);
  }

  if (options?.autoSchedule) {
    const { resolveScheduleTimeForPost } = await import("./content-schedule-insights");
    const when = await resolveScheduleTimeForPost(postId);
    await scheduleContentPost(postId, when);
  }

  return results;
}

export async function fanOutPostToPlatforms(
  postId: string,
  platforms: SocialPlatformId[],
  tone: string,
  options?: { autoSchedule?: boolean; staggerMinutes?: number },
): Promise<FanOutResult> {
  const post = await getContentPost(postId);
  if (!post) throw new Error("Post not found");

  const master = post.masterDraftText?.trim() || post.draftText.trim();
  if (!master) throw new Error("No master draft to fan out");

  const adapted = await adaptPostForPlatforms(postId, platforms, tone);
  const createdIds: string[] = [];
  const scheduledIds: string[] = [];
  const stagger = options?.staggerMinutes ?? 30;

  for (const item of adapted) {
    if (item.platform === post.platform) continue;
    const child = await createContentPost({
      channel: `${platformLabel(item.platform)} · ${post.channel}`,
      platform: item.platform,
      format: item.format,
      draftText: item.text,
      campaignId: post.campaignId ?? null,
    });
    await savePostMedia(child.id, {
      imageUrl: post.imageUrl,
      imagePath: post.imagePath,
      videoUrl: post.videoUrl,
      videoPath: post.videoPath,
    });
    createdIds.push(child.id);
  }

  if (options?.autoSchedule) {
    const { readAppFreState } = await import("./app-fre-state");
    const { listPostMetrics } = await import("./content-analytics-store");
    const { fetchContentStatus } = await import("./content-queue-store");
    const { buildPlatformScheduleInsights, suggestBestSlotForPlatform } = await import(
      "./content-schedule-insights"
    );
    const fre = await readAppFreState("my-content-creator");
    const timeZone = typeof fre.config.timezone === "string" ? fre.config.timezone : undefined;
    const { posts } = await fetchContentStatus();
    const metrics = await listPostMetrics();
    const insights = buildPlatformScheduleInsights({ metrics, posts, timeZone });
    const allIds = [postId, ...createdIds];
    for (let i = 0; i < allIds.length; i++) {
      const p = posts.find((row) => row.id === allIds[i]) ?? (await getContentPost(allIds[i]!));
      if (!p) continue;
      const slot = suggestBestSlotForPlatform(p.platform, insights, { timeZone });
      const when = new Date(slot.scheduledAt);
      when.setMinutes(when.getMinutes() + i * stagger);
      const scheduled = await scheduleContentPost(allIds[i]!, when.toISOString());
      if (scheduled) scheduledIds.push(scheduled.id);
    }
  }

  return { createdIds, scheduledIds };
}

function defaultScheduleBase(): Date {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export function creationStudioStatus(): {
  ffmpeg: boolean;
  tts: string;
  imageGen: boolean;
} {
  return {
    ffmpeg: ffmpegAvailable(),
    tts: ttsLabel(),
    imageGen: false,
  };
}

export async function creationStudioStatusAsync(): Promise<{
  ffmpeg: boolean;
  tts: string;
  imageGen: boolean;
}> {
  return {
    ffmpeg: ffmpegAvailable(),
    tts: ttsLabel(),
    imageGen: await isImageGenerationAvailable(),
  };
}

export function mediaReadiness(post: {
  platform: SocialPlatformId;
  draftText: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  videoUrl?: string | null;
  videoPath?: string | null;
}): { ready: boolean; missing: string[]; validationErrors?: string[] } {
  const spec = platformFormatSpec(post.platform);
  const missing: string[] = [];
  if (!post.draftText.trim()) missing.push("draft text");
  if (spec.media === "image" && !post.imageUrl && !post.imagePath) missing.push("thumbnail/image");
  if (spec.media === "video" && !post.videoUrl && !post.videoPath) missing.push("video");
  return { ready: missing.length === 0, missing };
}

export async function mediaReadinessAsync(
  post: Parameters<typeof mediaReadiness>[0] & { id?: string },
): Promise<{ ready: boolean; missing: string[]; validationErrors: string[]; warnings: string[] }> {
  const base = mediaReadiness(post);
  if (!post.id) {
    return { ...base, validationErrors: [], warnings: [] };
  }
  const full = await getContentPost(post.id);
  if (!full) {
    return { ...base, validationErrors: [], warnings: [] };
  }
  const v = await validatePostMedia(full);
  const validationErrors = base.ready ? v.errors : [...base.missing.map((m) => `missing ${m}`), ...v.errors];
  return {
    ready: base.ready && v.ok,
    missing: base.missing,
    validationErrors,
    warnings: v.warnings,
  };
}
