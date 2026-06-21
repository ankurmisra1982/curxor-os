import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ensureContentQueue, setPostCampaignId, clearCampaignFromPosts } from "./content-queue-store";
import type { ContentPost, ContentStage } from "./content-queue-types";
import type { CampaignStage, ContentCampaign, ContentCampaignsFile } from "./content-campaign-types";

function campaignsPath(): string {
  return process.env.CURXOR_CONTENT_CAMPAIGNS_PATH ?? "/etc/curxor/content-campaigns.json";
}

async function readCampaigns(): Promise<ContentCampaignsFile> {
  try {
    const raw = await readFile(campaignsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ContentCampaignsFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.campaigns)) throw new Error("invalid");
    return {
      version: 1,
      campaigns: parsed.campaigns,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, campaigns: [], updatedAt: new Date().toISOString() };
  }
}

async function writeCampaigns(data: ContentCampaignsFile): Promise<void> {
  const filePath = campaignsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

function deriveStageFromPosts(posts: ContentPost[]): CampaignStage {
  if (posts.length === 0) return "IDEATE";
  const stages = new Set(posts.map((p) => p.stage));
  if (posts.some((p) => p.stage === "PUBLISHED")) return "LIVE";
  if (stages.has("PENDING_APPROVAL")) return "REVIEW";
  if (stages.has("SCHEDULED") || stages.has("SUBMITTED")) return "SCHEDULED";
  if (stages.has("RENDER")) return "CREATE";
  if (posts.every((p) => p.draftText.trim().length > 40)) return "REVIEW";
  return "IDEATE";
}

export async function listCampaigns(): Promise<ContentCampaign[]> {
  const file = await readCampaigns();
  return file.campaigns.slice(0, 32);
}

export async function listCampaignsWithPosts(): Promise<
  Array<ContentCampaign & { postIds: string[]; postCount: number; suggestedStage: CampaignStage }>
> {
  const file = await readCampaigns();
  const queue = await ensureContentQueue();
  return file.campaigns.map((campaign) => {
    const posts = queue.posts.filter((p) => p.campaignId === campaign.id);
    return {
      ...campaign,
      postIds: posts.map((p) => p.id),
      postCount: posts.length,
      suggestedStage: deriveStageFromPosts(posts),
    };
  });
}

export async function getCampaign(campaignId: string): Promise<ContentCampaign | null> {
  const file = await readCampaigns();
  return file.campaigns.find((c) => c.id === campaignId) ?? null;
}

export async function createCampaign(input: {
  name: string;
  masterDraft?: string;
  stage?: CampaignStage;
  channels?: string[];
}): Promise<ContentCampaign> {
  const file = await readCampaigns();
  const now = new Date().toISOString();
  const campaign: ContentCampaign = {
    id: `CAMP-${randomUUID().slice(0, 8)}`,
    name: input.name.trim() || "Untitled campaign",
    masterDraft: input.masterDraft?.trim() ?? "",
    stage: input.stage ?? "IDEATE",
    channels: input.channels ?? [],
    createdAt: now,
    updatedAt: now,
  };
  file.campaigns.unshift(campaign);
  await writeCampaigns(file);
  return campaign;
}

export async function updateCampaign(
  campaignId: string,
  patch: Partial<Pick<ContentCampaign, "name" | "masterDraft" | "stage" | "channels">>,
): Promise<ContentCampaign | null> {
  const file = await readCampaigns();
  const idx = file.campaigns.findIndex((c) => c.id === campaignId);
  if (idx < 0) return null;
  file.campaigns[idx] = {
    ...file.campaigns[idx]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeCampaigns(file);
  return file.campaigns[idx]!;
}

export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const file = await readCampaigns();
  const before = file.campaigns.length;
  file.campaigns = file.campaigns.filter((c) => c.id !== campaignId);
  if (file.campaigns.length === before) return false;
  await writeCampaigns(file);
  await clearCampaignFromPosts(campaignId);
  return true;
}

export async function assignPostToCampaign(
  postId: string,
  campaignId: string | null,
): Promise<ContentPost | null> {
  if (campaignId) {
    const campaign = await getCampaign(campaignId);
    if (!campaign) return null;
  }
  return setPostCampaignId(postId, campaignId);
}

export async function syncCampaignStageFromPosts(campaignId: string): Promise<ContentCampaign | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return null;
  const queue = await ensureContentQueue();
  const posts = queue.posts.filter((p) => p.campaignId === campaignId);
  const stage = deriveStageFromPosts(posts);
  return updateCampaign(campaignId, { stage });
}

export async function fanOutCampaign(
  campaignId: string,
  tone: string,
  options?: { autoSchedule?: boolean; staggerMinutes?: number },
): Promise<{ seedPostId: string; createdIds: string[]; scheduledIds: string[] }> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.masterDraft.trim()) throw new Error("Campaign needs a master draft");

  const { fanOutPostToPlatforms } = await import("./content-creation-service");
  const { createContentPost, savePostDraft, savePlatformVariants } = await import("./content-queue-store");
  const channels = campaign.channels.length > 0 ? campaign.channels : ["x", "linkedin", "instagram"];
  const platforms = channels.filter((c): c is import("./social-channels").SocialPlatformId =>
    ["x", "threads", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "reddit", "pinterest", "snapchat", "facebook", "discord"].includes(c),
  );

  const primary = (platforms[0] ?? "x") as import("./social-channels").SocialPlatformId;
  const seed = await createContentPost({
    channel: `${campaign.name} · seed`,
    platform: primary,
    draftText: campaign.masterDraft,
    campaignId,
  });
  await savePostDraft(seed.id, campaign.masterDraft);
  await savePlatformVariants(seed.id, campaign.masterDraft, {});

  const result = await fanOutPostToPlatforms(seed.id, platforms, tone, {
    autoSchedule: options?.autoSchedule,
    staggerMinutes: options?.staggerMinutes,
  });

  await syncCampaignStageFromPosts(campaignId);
  return { seedPostId: seed.id, ...result };
}

export function stageRank(stage: ContentStage): number {
  const order: ContentStage[] = ["IDEATE", "SCRIPT", "RENDER", "SCHEDULED", "SUBMITTED", "PUBLISHED"];
  return order.indexOf(stage);
}
