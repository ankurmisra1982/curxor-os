import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ForgedCreatorPlatform,
  ForgedCreatorPost,
  ForgedCreatorQueueFile,
  ForgedCreatorStage,
} from "./forged-creator-types";

function workspaceRoot(): string {
  return process.env.CURXOR_AGENT_WORKSPACE_PATH ?? "/etc/curxor/agent-workspace";
}

function queuePath(forgedAppId: string): string {
  return path.join(workspaceRoot(), forgedAppId, "content-queue.json");
}

function emptyFile(): ForgedCreatorQueueFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    posts: [],
  };
}

function nextPostId(posts: ForgedCreatorPost[]): string {
  const nums = posts
    .map((p) => /^POST-(\d+)$/.exec(p.id)?.[1])
    .filter(Boolean)
    .map((n) => Number.parseInt(n!, 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `POST-${String(next).padStart(3, "0")}`;
}

function normalizePlatform(v: unknown): ForgedCreatorPlatform {
  if (v === "x" || v === "linkedin" || v === "youtube" || v === "tiktok" || v === "multi") return v;
  return "x";
}

async function ensureForgedCreatorQueue(forgedAppId: string): Promise<ForgedCreatorQueueFile> {
  const filePath = queuePath(forgedAppId);
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ForgedCreatorQueueFile>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
    };
  } catch {
    const file = emptyFile();
    await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
    return file;
  }
}

async function writeForgedCreatorQueue(forgedAppId: string, file: ForgedCreatorQueueFile): Promise<void> {
  file.updatedAt = new Date().toISOString();
  await writeFile(queuePath(forgedAppId), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o644 });
}

export interface ForgedCreatorQueueStatus {
  forgedAppId: string;
  source: "demo" | "live";
  posts: ForgedCreatorPost[];
  stats: {
    postCount: number;
    draftCount: number;
    scheduledCount: number;
  };
}

export async function fetchForgedCreatorStatus(forgedAppId: string): Promise<ForgedCreatorQueueStatus> {
  const file = await ensureForgedCreatorQueue(forgedAppId);
  const draftCount = file.posts.filter((p) => p.stage === "IDEATE" || p.stage === "SCRIPT").length;
  const scheduledCount = file.posts.filter((p) => p.stage === "SCHEDULED").length;
  return {
    forgedAppId,
    source: file.posts.length === 0 ? "demo" : "live",
    posts: file.posts,
    stats: {
      postCount: file.posts.length,
      draftCount,
      scheduledCount,
    },
  };
}

export async function upsertForgedDraftPost(
  forgedAppId: string,
  input: {
    postId?: string;
    draftText: string;
    channel?: string;
    platform?: ForgedCreatorPlatform;
  },
): Promise<ForgedCreatorPost> {
  const file = await ensureForgedCreatorQueue(forgedAppId);
  const now = new Date().toISOString();
  const text = input.draftText.trim();
  const platform = normalizePlatform(input.platform);
  const channel = input.channel?.trim() || (platform === "x" ? "X / Twitter" : platform);

  if (input.postId) {
    const idx = file.posts.findIndex((p) => p.id === input.postId);
    if (idx >= 0) {
      const current = file.posts[idx]!;
      const stage: ForgedCreatorStage =
        current.stage === "IDEATE" || current.stage === "SCRIPT" ? "SCRIPT" : current.stage;
      file.posts[idx] = {
        ...current,
        draftText: text,
        channel: channel || current.channel,
        platform,
        stage,
        updatedAt: now,
      };
      await writeForgedCreatorQueue(forgedAppId, file);
      return file.posts[idx]!;
    }
  }

  const post: ForgedCreatorPost = {
    id: nextPostId(file.posts),
    channel,
    platform,
    stage: text ? "SCRIPT" : "IDEATE",
    draftText: text,
    scheduledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  file.posts.push(post);
  await writeForgedCreatorQueue(forgedAppId, file);
  return post;
}

export async function scheduleForgedPost(
  forgedAppId: string,
  input: { postId: string; scheduledAt?: string },
): Promise<ForgedCreatorPost | null> {
  const file = await ensureForgedCreatorQueue(forgedAppId);
  const idx = file.posts.findIndex((p) => p.id === input.postId);
  if (idx < 0) return null;

  const when =
    input.scheduledAt ??
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
  await writeForgedCreatorQueue(forgedAppId, file);
  return file.posts[idx]!;
}

export async function seedForgedCreatorDemoIfEmpty(forgedAppId: string): Promise<ForgedCreatorPost | null> {
  const file = await ensureForgedCreatorQueue(forgedAppId);
  if (file.posts.length > 0) return file.posts[0] ?? null;
  return upsertForgedDraftPost(forgedAppId, {
    draftText:
      "Sovereign creator desk on CurXor — draft locally, schedule on appliance, publish via eno2 bridge when wired.",
    channel: "CurXor Dev Log",
    platform: "x",
  });
}
