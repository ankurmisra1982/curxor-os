import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface ClickEvent {
  id: string;
  postId: string;
  platform: string;
  destination: string;
  utmCampaign: string | null;
  clickedAt: string;
  userAgent: string | null;
}

interface ClickFile {
  version: 1;
  clicks: ClickEvent[];
  updatedAt: string;
}

function clickPath(): string {
  return process.env.CURXOR_CONTENT_CLICKS_PATH ?? "/etc/curxor/content-clicks.json";
}

async function readFile_(): Promise<ClickFile> {
  try {
    const raw = await readFile(clickPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ClickFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.clicks)) throw new Error("invalid");
    return {
      version: 1,
      clicks: parsed.clicks,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, clicks: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: ClickFile): Promise<void> {
  const filePath = clickPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function recordClick(input: {
  postId: string;
  platform: string;
  destination: string;
  utmCampaign?: string | null;
  userAgent?: string | null;
}): Promise<ClickEvent> {
  const file = await readFile_();
  const row: ClickEvent = {
    id: randomUUID(),
    postId: input.postId,
    platform: input.platform,
    destination: input.destination,
    utmCampaign: input.utmCampaign ?? null,
    clickedAt: new Date().toISOString(),
    userAgent: input.userAgent ?? null,
  };
  file.clicks.unshift(row);
  if (file.clicks.length > 2048) file.clicks = file.clicks.slice(0, 2048);
  await writeFile_(file);
  return row;
}

export async function listClicks(postId?: string, limit = 64): Promise<ClickEvent[]> {
  const file = await readFile_();
  const rows = postId ? file.clicks.filter((c) => c.postId === postId) : file.clicks;
  return rows.slice(0, limit);
}

export interface ClickSummary {
  postId: string;
  clicks: number;
  lastClickedAt: string | null;
}

export async function summarizeClicksByPost(): Promise<ClickSummary[]> {
  const file = await readFile_();
  const byPost = new Map<string, ClickSummary>();
  for (const c of file.clicks) {
    const existing = byPost.get(c.postId) ?? { postId: c.postId, clicks: 0, lastClickedAt: null };
    existing.clicks += 1;
    if (!existing.lastClickedAt || c.clickedAt > existing.lastClickedAt) {
      existing.lastClickedAt = c.clickedAt;
    }
    byPost.set(c.postId, existing);
  }
  return [...byPost.values()].sort((a, b) => b.clicks - a.clicks);
}
