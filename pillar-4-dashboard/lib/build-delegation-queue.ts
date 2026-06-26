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

/** Pending rows always included; remaining slots filled from newest resolved history. */
export async function readBuildDelegationReportItems(limit = 24): Promise<BuildDelegationItem[]> {
  const items = await readFileItems();
  const cap = Math.min(Math.max(1, limit), MAX_ITEMS);
  const pending = items.filter((i) => i.status === "pending");
  const pendingIds = new Set(pending.map((i) => i.id));
  const history = items.filter((i) => !pendingIds.has(i.id));
  const historyBudget = Math.max(0, cap - pending.length);
  return [...pending, ...history.slice(-historyBudget)];
}

export async function countPendingBuildDelegations(): Promise<number> {
  const items = await readFileItems();
  return items.reduce((n, i) => n + (i.status === "pending" ? 1 : 0), 0);
}

export type ResolveBuildDelegationResult =
  | { ok: true; item: BuildDelegationItem }
  | { ok: false; error: "not_found" | "invalid_transition" };

function canResolveTransition(
  from: BuildDelegationStatus,
  to: Exclude<BuildDelegationStatus, "pending">,
): boolean {
  if (from === "pending") {
    return to === "approved" || to === "rejected" || to === "completed";
  }
  if (from === "approved" && to === "completed") return true;
  return false;
}

export async function resolveBuildDelegationStatus(
  id: string,
  status: Exclude<BuildDelegationStatus, "pending">,
): Promise<ResolveBuildDelegationResult> {
  const items = await readFileItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, error: "not_found" };
  const current = items[idx]!;
  if (!canResolveTransition(current.status, status)) {
    return { ok: false, error: "invalid_transition" };
  }

  const now = new Date().toISOString();
  const next: BuildDelegationItem = {
    ...current,
    status,
    updatedAt: now,
    resolvedAt: now,
  };
  items[idx] = next;
  await writeFileItems(items);
  return { ok: true, item: next };
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
