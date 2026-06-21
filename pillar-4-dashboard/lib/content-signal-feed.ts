import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createContentPost, scheduleContentPost } from "./content-queue-store";
import { generateText, isLocalInferenceAvailable } from "./local-inference";
import { defaultFormatForPlatform, platformLabel, type SocialPlatformId } from "./social-channels";

export interface SignalFeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  urgency: "low" | "medium" | "high";
  suggestedPlatforms: SocialPlatformId[];
  createdAt: string;
  consumedAt: string | null;
}

interface SignalFile {
  version: 1;
  items: SignalFeedItem[];
  updatedAt: string;
}

function storePath(): string {
  return process.env.CURXOR_SIGNAL_FEED_PATH ?? "/etc/curxor/signal-feed.json";
}

async function readFile_(): Promise<SignalFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SignalFile>;
    return {
      version: 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { version: 1, items: [], updatedAt: new Date().toISOString() };
  }
}

async function writeFile_(data: SignalFile): Promise<void> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  data.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o640 });
}

export async function listSignalFeedItems(includeConsumed = false): Promise<SignalFeedItem[]> {
  const file = await readFile_();
  return file.items.filter((i) => includeConsumed || !i.consumedAt).slice(0, 24);
}

export async function ingestSignalFeedItem(input: Omit<SignalFeedItem, "id" | "createdAt" | "consumedAt">): Promise<SignalFeedItem> {
  const file = await readFile_();
  const item: SignalFeedItem = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    consumedAt: null,
  };
  file.items.unshift(item);
  if (file.items.length > 64) file.items = file.items.slice(0, 64);
  await writeFile_(file);
  return item;
}

export async function createReactiveDraftFromSignal(
  signalId: string,
  platform: SocialPlatformId = "x",
): Promise<{ postId: string; draftText: string } | null> {
  const file = await readFile_();
  const idx = file.items.findIndex((i) => i.id === signalId);
  if (idx < 0) return null;
  const signal = file.items[idx]!;

  let draftText = `${signal.title}\n\n${signal.summary}`.slice(0, 800);
  if (await isLocalInferenceAvailable()) {
    draftText = (
      await generateText(
        "You write timely social posts for a technical creator brand.",
        `Write a timely ${platform} post reacting to this signal. Include why it matters now. 2-3 short paragraphs max.\n\nTitle: ${signal.title}\nSummary: ${signal.summary}\nSource: ${signal.source}`,
      )
    )?.trim() ?? draftText;
  }

  const post = await createContentPost({
    channel: `${platformLabel(platform)} · Signal`,
    platform,
    format: defaultFormatForPlatform(platform),
    draftText,
  });

  const when = new Date(Date.now() + 2 * 3_600_000).toISOString();
  await scheduleContentPost(post.id, when);

  file.items[idx] = { ...signal, consumedAt: new Date().toISOString() };
  await writeFile_(file);

  return { postId: post.id, draftText };
}
