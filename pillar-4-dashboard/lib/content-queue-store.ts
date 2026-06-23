import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readAppFreState } from "./app-fre-state";
import { upsertSchedulerJob } from "./agent-runtime/scheduler-store";
import { listCampaigns } from "./content-campaigns-store";
import type {
  ContentFormat,
  ContentPlatform,
  ContentPost,
  ContentQueueFile,
  ContentQueueStatus,
  ContentStage,
} from "./content-queue-types";
import { fetchCreatorChannelStatuses } from "./content-channels-status";
import {
  defaultFormatForPlatform,
  isSocialPlatform,
  platformLabel,
  type SocialPlatformId,
} from "./social-channels";

function queuePath(): string {
  return process.env.CURXOR_CONTENT_QUEUE_PATH ?? "/etc/curxor/content-queue.json";
}

function digitalEnvPath(): string {
  return process.env.CURXOR_DIGITAL_ENV_PATH ?? "/etc/curxor/digital.env";
}

async function loadXBridgeConfigured(): Promise<boolean> {
  // retained for tests; live bridge count uses platformVault
  try {
    const raw = await readFile(digitalEnvPath(), "utf8");
    const vars: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [k, ...rest] = trimmed.split("=");
      vars[k!.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
    return Boolean(
      vars.X_API_KEY &&
        vars.X_API_SECRET &&
        vars.X_ACCESS_TOKEN &&
        vars.X_ACCESS_TOKEN_SECRET,
    );
  } catch {
    return false;
  }
}

const STAGE_ORDER: ContentStage[] = [
  "IDEATE",
  "SCRIPT",
  "RENDER",
  "SCHEDULED",
  "PENDING_APPROVAL",
  "SUBMITTED",
  "PUBLISHED",
];

const CHANNEL_SEEDS: Array<{
  id: string;
  channel: string;
  platform: ContentPlatform;
  format: ContentFormat;
  stage: ContentStage;
  draftText: string;
  scheduledAt: string | null;
}> = [
  {
    id: "POST-881",
    channel: "Tech Briefs Daily",
    platform: "youtube",
    format: "long-form",
    stage: "SCRIPT",
    draftText:
      "Sovereign edge AI is not a buzzword — it is bare-metal Claws that draft, decide, and publish without API rent. Here is how we run the full stack on a MINISFORUM box.",
    scheduledAt: null,
  },
  {
    id: "POST-882",
    channel: "Market Pulse Shorts",
    platform: "tiktok",
    format: "reel",
    stage: "RENDER",
    draftText:
      "Three signals before the open: BTC funding flat, NVDA vol compressing, macro calendar light. Capital Claw stays in paper until the rule fires.",
    scheduledAt: null,
  },
  {
    id: "POST-883",
    channel: "CurXor Dev Log",
    platform: "x",
    format: "thread",
    stage: "SCHEDULED",
    draftText:
      "Ship log: Creator Claw now persists the content queue on appliance storage. Draft locally, publish via eno2 bridge — LLM never touches the internet.",
    scheduledAt: null,
  },
];

function nextPostId(posts: ContentPost[]): string {
  const nums = posts
    .map((p) => /^POST-(\d+)$/.exec(p.id)?.[1])
    .filter(Boolean)
    .map((n) => Number.parseInt(n!, 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 884;
  return `POST-${next}`;
}

async function readQueueFile(): Promise<ContentQueueFile> {
  try {
    const raw = await readFile(queuePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ContentQueueFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.posts)) throw new Error("invalid");
    return {
      version: 1,
      posts: parsed.posts,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, posts: [], updatedAt: new Date().toISOString() };
  }
}

async function writeQueueFile(data: ContentQueueFile): Promise<void> {
  const filePath = queuePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

function seedPosts(channels: string[]): ContentPost[] {
  const now = new Date().toISOString();
  const platforms = channels.filter((c): c is SocialPlatformId => isSocialPlatform(c));
  const primary = platforms[0] ?? "x";

  return CHANNEL_SEEDS.map((seed, i) => {
    const platform = platforms[i] ?? seed.platform ?? primary;
    return {
      id: seed.id,
      channel: seed.channel,
      platform,
      format: seed.format ?? defaultFormatForPlatform(platform),
      stage: seed.stage,
      draftText: seed.draftText,
      scheduledAt: seed.scheduledAt,
      publishedAt: null,
      publishedUrl: null,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function ensureContentQueue(): Promise<ContentQueueFile> {
  const file = await readQueueFile();
  if (file.posts.length > 0) return file;

  const fre = await readAppFreState("my-content-creator");
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : ["youtube", "x"];

  const seeded: ContentQueueFile = {
    version: 1,
    posts: seedPosts(channels),
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(seeded);
  return seeded;
}

export async function fetchContentStatus(): Promise<ContentQueueStatus> {
  const fre = await readAppFreState("my-content-creator");
  const contentTone =
    typeof fre.config.contentTone === "string" ? fre.config.contentTone : "technical";
  const channels = Array.isArray(fre.config.channels)
    ? fre.config.channels.filter((x): x is string => typeof x === "string")
    : ["youtube", "x"];

  const file = await ensureContentQueue();
  const platformVault = await fetchCreatorChannelStatuses(channels);
  const bridgeConfigured = platformVault.liveCount > 0;
  const hasPublished = file.posts.some((p) => p.stage === "PUBLISHED");
  const campaigns = await listCampaigns();

  return {
    source: bridgeConfigured && hasPublished ? "live" : "demo",
    bridgeConfigured,
    contentTone,
    channels,
    posts: file.posts,
    campaigns,
    updatedAt: file.updatedAt,
    platformVault,
  };
}

export async function getContentPost(postId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  return file.posts.find((p) => p.id === postId) ?? null;
}

export async function createContentPost(input: {
  channel: string;
  platform: ContentPlatform;
  format?: ContentFormat;
  draftText?: string;
  inIdeaBacklog?: boolean;
  campaignId?: string | null;
}): Promise<ContentPost> {
  const file = await ensureContentQueue();
  const now = new Date().toISOString();
  const post: ContentPost = {
    id: nextPostId(file.posts),
    channel: input.channel.trim() || `${platformLabel(input.platform)} Channel`,
    platform: input.platform,
    format: input.format ?? defaultFormatForPlatform(input.platform),
    stage: "IDEATE",
    draftText: input.draftText?.trim() ?? "",
    inIdeaBacklog: input.inIdeaBacklog === true,
    campaignId: input.campaignId ?? null,
    scheduledAt: null,
    publishedAt: null,
    publishedUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  file.posts.unshift(post);
  await writeQueueFile(file);
  return post;
}

export async function savePostDraft(postId: string, draftText: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const current = file.posts[idx]!;
  const stage: ContentStage =
    current.stage === "IDEATE" || current.stage === "SCRIPT" ? "SCRIPT" : current.stage;

  file.posts[idx] = {
    ...current,
    draftText: draftText.trim(),
    stage,
    updatedAt: now,
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function savePostMedia(
  postId: string,
  media: {
    imageUrl?: string | null;
    imagePath?: string | null;
    videoUrl?: string | null;
    videoPath?: string | null;
  },
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const current = file.posts[idx]!;
  const stage: ContentStage = current.stage === "IDEATE" ? "SCRIPT" : current.stage;
  file.posts[idx] = {
    ...current,
    ...media,
    stage,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function savePlatformVariants(
  postId: string,
  masterDraftText: string,
  variants: ContentPost["platformVariants"],
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    masterDraftText,
    platformVariants: variants,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function advancePostStage(postId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const current = file.posts[idx]!;
  const stageIdx = STAGE_ORDER.indexOf(current.stage);
  const next = STAGE_ORDER[Math.min(stageIdx + 1, STAGE_ORDER.length - 1)] ?? current.stage;

  file.posts[idx] = { ...current, stage: next, updatedAt: new Date().toISOString() };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function listPublishablePosts(): Promise<ContentPost[]> {
  const file = await ensureContentQueue();
  return file.posts.filter(
    (p) =>
      p.stage !== "PUBLISHED" &&
      p.stage !== "PENDING_APPROVAL" &&
      p.stage !== "SUBMITTED" &&
      p.draftText.trim(),
  );
}

export async function rescheduleContentPost(
  postId: string,
  scheduledAt: string,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const current = file.posts[idx]!;
  file.posts[idx] = {
    ...current,
    stage: "SCHEDULED",
    scheduledAt,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);

  const whenDate = new Date(scheduledAt);
  const cron = `${whenDate.getMinutes()} ${whenDate.getHours()} * * *`;
  await upsertSchedulerJob({
    id: `content-${postId}`,
    appId: "my-content-creator",
    kind: "skill",
    skillId: "publish_post",
    schedule: cron,
    enabled: true,
  });

  return file.posts[idx]!;
}

export async function scheduleContentPost(
  postId: string,
  scheduledAt?: string,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const when =
    scheduledAt ??
    (() => {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
      return d.toISOString();
    })();

  const current = file.posts[idx]!;
  file.posts[idx] = {
    ...current,
    stage: "SCHEDULED",
    scheduledAt: when,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);

  const whenDate = new Date(when);
  const cron = `${whenDate.getMinutes()} ${whenDate.getHours()} * * *`;
  await upsertSchedulerJob({
    id: `content-${postId}`,
    appId: "my-content-creator",
    kind: "skill",
    skillId: "publish_post",
    schedule: cron,
    enabled: true,
  });

  const scheduled = file.posts[idx]!;
  const { emitCreatorXpEvent } = await import("./creator-xp-events");
  void emitCreatorXpEvent("post_scheduled", {
    postId,
    channel: scheduled.channel,
    platform: scheduled.platform,
    scheduledAt: when,
  });

  return scheduled;
}

export async function saveHookVariants(
  postId: string,
  hooks: import("./content-queue-types").HookVariant[],
  selectedHookId?: string | null,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    hookVariants: hooks,
    selectedHookId: selectedHookId ?? hooks[0]?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function selectHookVariant(postId: string, hookId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const current = file.posts[idx]!;
  const hook = current.hookVariants?.find((h) => h.id === hookId);
  if (!hook) return null;

  const body = current.draftText.includes("\n")
    ? current.draftText.slice(current.draftText.indexOf("\n") + 1)
    : "";
  const newDraft = body ? `${hook.text}\n${body}` : hook.text;

  file.posts[idx] = {
    ...current,
    draftText: newDraft,
    selectedHookId: hookId,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function markPostPendingApproval(
  postId: string,
  note?: string | null,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  file.posts[idx] = {
    ...file.posts[idx]!,
    stage: "PENDING_APPROVAL",
    approvalRequestedAt: now,
    approvalNote: note ?? null,
    pendingPublishIntentId: null,
    updatedAt: now,
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function listPendingApprovalPosts(): Promise<ContentPost[]> {
  const file = await ensureContentQueue();
  return file.posts.filter((p) => p.stage === "PENDING_APPROVAL");
}

export async function markPostSubmitted(postId: string, intentId?: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  file.posts[idx] = {
    ...file.posts[idx]!,
    stage: "SUBMITTED",
    pendingPublishIntentId: intentId ?? null,
    approvalNote: null,
    updatedAt: now,
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function failPostPublish(
  postId: string,
  error?: string,
  options?: { notify?: boolean },
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const current = file.posts[idx]!;
  const revertStage: ContentStage =
    current.stage === "PENDING_APPROVAL"
      ? current.scheduledAt
        ? "SCHEDULED"
        : "RENDER"
      : current.scheduledAt
        ? "SCHEDULED"
        : "RENDER";
  file.posts[idx] = {
    ...current,
    stage: revertStage,
    pendingPublishIntentId: null,
    approvalRequestedAt: null,
    approvalNote: error?.trim() || current.approvalNote || null,
    lastPublishError: error?.trim() || current.lastPublishError || null,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  const post = file.posts[idx]!;
  if (options?.notify !== false) {
    void import("./content-publish-failure-notify")
      .then((m) => m.notifyPublishFailure(post, error))
      .catch(() => {});
  }
  return post;
}

export async function bulkReschedulePosts(
  postIds: string[],
  hourOffset: number,
): Promise<ContentPost[]> {
  const updated: ContentPost[] = [];
  for (const postId of postIds) {
    const file = await ensureContentQueue();
    const post = file.posts.find((p) => p.id === postId);
    if (!post?.scheduledAt) continue;
    const when = new Date(post.scheduledAt);
    when.setHours(when.getHours() + hourOffset);
    const rescheduled = await rescheduleContentPost(postId, when.toISOString());
    if (rescheduled) updated.push(rescheduled);
  }
  return updated;
}

export async function promoteFromIdeaBacklog(postId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    inIdeaBacklog: false,
    stage: "IDEATE",
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function saveCarouselSlides(
  postId: string,
  slides: import("./content-queue-types").CarouselSlide[],
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    format: "carousel",
    carouselSlides: slides,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function saveTimelineClips(
  postId: string,
  clips: import("./content-queue-types").TimelineClip[],
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    timelineClips: clips,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function saveCaptionStyle(
  postId: string,
  captionStyle: import("./content-queue-types").CaptionStyle,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  file.posts[idx] = { ...file.posts[idx]!, captionStyle, updatedAt: new Date().toISOString() };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function saveThumbnailVariants(
  postId: string,
  variants: import("./content-queue-types").ThumbnailVariant[],
  selectedThumbnailId?: string | null,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  file.posts[idx] = {
    ...file.posts[idx]!,
    thumbnailVariants: variants,
    selectedThumbnailId: selectedThumbnailId ?? variants[0]?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function selectThumbnailVariant(postId: string, thumbId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  const current = file.posts[idx]!;
  const thumb = current.thumbnailVariants?.find((t) => t.id === thumbId);
  if (!thumb) return null;
  file.posts[idx] = {
    ...current,
    selectedThumbnailId: thumbId,
    imagePath: thumb.imagePath ?? current.imagePath,
    imageUrl: thumb.imageUrl ?? current.imageUrl,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function updateCarouselSlideImage(
  postId: string,
  slideId: string,
  image: { imagePath: string; imageUrl: string | null },
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  const slides = file.posts[idx]!.carouselSlides ?? [];
  const slideIdx = slides.findIndex((s) => s.id === slideId);
  if (slideIdx < 0) return null;
  slides[slideIdx] = {
    ...slides[slideIdx]!,
    imagePath: image.imagePath,
    imageUrl: image.imageUrl,
  };
  file.posts[idx] = {
    ...file.posts[idx]!,
    carouselSlides: slides,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function savePinterestBoard(postId: string, boardId: string): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  file.posts[idx] = {
    ...file.posts[idx]!,
    pinterestBoardId: boardId.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function listIdeaBacklog(): Promise<ContentPost[]> {
  const file = await ensureContentQueue();
  return file.posts.filter((p) => p.inIdeaBacklog);
}

export async function listActivePosts(): Promise<ContentPost[]> {
  const file = await ensureContentQueue();
  return file.posts.filter((p) => !p.inIdeaBacklog);
}

export async function markPostPublished(
  postId: string,
  publishedUrl?: string | null,
  platformPostId?: string | null,
  extras?: { platformPostUri?: string | null; platformPostCid?: string | null },
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  file.posts[idx] = {
    ...file.posts[idx]!,
    stage: "PUBLISHED",
    publishedAt: now,
    publishedUrl: publishedUrl ?? null,
    platformPostId: platformPostId ?? file.posts[idx]!.platformPostId ?? null,
    platformPostUri: extras?.platformPostUri ?? file.posts[idx]!.platformPostUri ?? null,
    platformPostCid: extras?.platformPostCid ?? file.posts[idx]!.platformPostCid ?? null,
    pendingPublishIntentId: null,
    lastPublishError: null,
    updatedAt: now,
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function setPostCampaignId(
  postId: string,
  campaignId: string | null,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  file.posts[idx] = {
    ...file.posts[idx]!,
    campaignId,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function clearCampaignFromPosts(campaignId: string): Promise<number> {
  const file = await ensureContentQueue();
  let count = 0;
  for (const post of file.posts) {
    if (post.campaignId === campaignId) {
      post.campaignId = null;
      post.updatedAt = new Date().toISOString();
      count += 1;
    }
  }
  if (count > 0) await writeQueueFile(file);
  return count;
}

export async function removeContentPost(postId: string): Promise<boolean> {
  const file = await ensureContentQueue();
  const before = file.posts.length;
  file.posts = file.posts.filter((p) => p.id !== postId);
  if (file.posts.length === before) return false;
  await writeQueueFile(file);
  return true;
}

export async function resolvePostForPublish(postId: string): Promise<ContentPost | null> {
  const post = await getContentPost(postId);
  if (!post) return null;
  if (!post.draftText.trim()) return null;
  return post;
}

export async function savePostPublishMeta(
  postId: string,
  meta: {
    firstCommentText?: string | null;
    firstCommentScheduledAt?: string | null;
    altText?: string | null;
    threadParts?: string[] | null;
    utmCampaign?: string | null;
    utmSource?: string | null;
    evergreen?: boolean;
    evergreenIntervalDays?: number | null;
    libraryAssetId?: string | null;
    performanceScore?: number | null;
    lastPublishError?: string | null;
  },
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const idx = file.posts.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  file.posts[idx] = {
    ...file.posts[idx]!,
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  await writeQueueFile(file);
  return file.posts[idx]!;
}

export async function clonePostForEvergreenRecycle(
  sourceId: string,
  scheduledAt: string,
): Promise<ContentPost | null> {
  const file = await ensureContentQueue();
  const source = file.posts.find((p) => p.id === sourceId);
  if (!source || source.stage !== "PUBLISHED") return null;

  const now = new Date().toISOString();
  const clone: ContentPost = {
    ...source,
    id: nextPostId(file.posts),
    stage: "SCHEDULED",
    scheduledAt,
    publishedAt: null,
    publishedUrl: null,
    platformPostId: null,
    platformPostUri: null,
    platformPostCid: null,
    pendingPublishIntentId: null,
    approvalRequestedAt: null,
    approvalNote: null,
    sourcePostId: source.id,
    evergreenLastRecycledAt: now,
    createdAt: now,
    updatedAt: now,
  };

  file.posts.unshift(clone);
  const srcIdx = file.posts.findIndex((p) => p.id === sourceId);
  if (srcIdx >= 0) {
    file.posts[srcIdx] = {
      ...file.posts[srcIdx]!,
      evergreenLastRecycledAt: now,
      updatedAt: now,
    };
  }
  await writeQueueFile(file);
  return clone;
}

export async function createPostFromSource(
  source: ContentPost,
  overrides?: Partial<Pick<ContentPost, "libraryAssetId" | "sourcePostId" | "stage" | "draftText">>,
): Promise<ContentPost> {
  const file = await ensureContentQueue();
  const now = new Date().toISOString();
  const post: ContentPost = {
    ...source,
    id: nextPostId(file.posts),
    stage: overrides?.stage ?? "SCRIPT",
    draftText: overrides?.draftText ?? source.draftText,
    libraryAssetId: overrides?.libraryAssetId ?? source.libraryAssetId ?? null,
    sourcePostId: overrides?.sourcePostId ?? source.id,
    scheduledAt: null,
    publishedAt: null,
    publishedUrl: null,
    platformPostId: null,
    platformPostUri: null,
    platformPostCid: null,
    pendingPublishIntentId: null,
    approvalRequestedAt: null,
    approvalNote: null,
    createdAt: now,
    updatedAt: now,
  };
  file.posts.unshift(post);
  await writeQueueFile(file);
  return post;
}
