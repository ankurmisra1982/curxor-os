import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { curxorDataPath } from "./curxor-data-dir";

export type BuildDelegationStatus = "pending" | "approved" | "rejected" | "completed";
export type BuildDelegationSource = "master_ai" | "user" | "webhook";

export interface BuildDelegationItem {
  id: string;
  title: string;
  detail: string;
  source: BuildDelegationSource;
  status: BuildDelegationStatus;
  appId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

const MAX_ITEMS = 100;

function queuePath(): string {
  return process.env.CURXOR_BUILD_DELEGATION_QUEUE_PATH ?? curxorDataPath("build-delegation-queue.json");
}

async function readFileItems(): Promise<BuildDelegationItem[]> {
  try {
    const raw = await readFile(queuePath(), "utf8");
    const parsed = JSON.parse(raw) as { items?: BuildDelegationItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeFileItems(items: BuildDelegationItem[]): Promise<void> {
  const filePath = queuePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ items: items.slice(-MAX_ITEMS) }, null, 2)}\n`, {
    mode: 0o640,
  });
}

export async function readBuildDelegationQueue(limit = 24): Promise<BuildDelegationItem[]> {
  const items = await readFileItems();
  return items.slice(-Math.min(Math.max(1, limit), MAX_ITEMS));
}

export async function enqueueBuildDelegation(input: {
  title: string;
  detail?: string;
  source?: BuildDelegationSource;
  appId?: string | null;
}): Promise<BuildDelegationItem> {
  const now = new Date().toISOString();
  const item: BuildDelegationItem = {
    id: `BDQ-${randomUUID().slice(0, 8)}`,
    title: input.title.trim(),
    detail: input.detail?.trim() ?? "",
    source: input.source ?? "user",
    status: "pending",
    appId: input.appId ?? null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };
  const items = await readFileItems();
  await writeFileItems([...items, item]);
  return item;
}

export async function updateBuildDelegationStatus(
  id: string,
  status: BuildDelegationStatus,
): Promise<BuildDelegationItem | null> {
  const items = await readFileItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const next = {
    ...items[idx]!,
    status,
    updatedAt: now,
    resolvedAt: status === "pending" ? null : now,
  };
  items[idx] = next;
  await writeFileItems(items);
  return next;
}
