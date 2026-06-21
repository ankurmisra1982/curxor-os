import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { appendAuditEntry } from "./content-audit-store";

export interface ContentOpsState {
  version: 1;
  publishingPaused: boolean;
  autoSchedulePaused: boolean;
  autoRepliesPaused: boolean;
  metricsRulesPaused: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  pausedBy: string | null;
  lastDigestAt: string | null;
  updatedAt: string;
}

const DEFAULT: ContentOpsState = {
  version: 1,
  publishingPaused: false,
  autoSchedulePaused: false,
  autoRepliesPaused: false,
  metricsRulesPaused: false,
  pauseReason: null,
  pausedAt: null,
  pausedBy: null,
  lastDigestAt: null,
  updatedAt: new Date(0).toISOString(),
};

function storePath(): string {
  return process.env.CURXOR_CONTENT_OPS_PATH ?? "/etc/curxor/content-ops.json";
}

export async function readContentOpsState(): Promise<ContentOpsState> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ContentOpsState>;
    return { ...DEFAULT, ...parsed, version: 1 };
  } catch {
    return { ...DEFAULT, updatedAt: new Date().toISOString() };
  }
}

async function writeContentOpsState(state: ContentOpsState): Promise<ContentOpsState> {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
  return state;
}

export async function isPublishingPaused(): Promise<boolean> {
  return (await readContentOpsState()).publishingPaused;
}

export async function pauseAllPublishing(
  reason: string,
  actor = "operator",
): Promise<ContentOpsState> {
  const state = await readContentOpsState();
  const next: ContentOpsState = {
    ...state,
    publishingPaused: true,
    autoSchedulePaused: true,
    autoRepliesPaused: true,
    metricsRulesPaused: true,
    pauseReason: reason.trim() || "Crisis pause",
    pausedAt: new Date().toISOString(),
    pausedBy: actor,
  };
  await writeContentOpsState(next);
  await appendAuditEntry({
    action: "ops_pause",
    targetType: "ops",
    targetId: "global",
    actor,
    detail: next.pauseReason ?? "Publishing paused",
  });
  return next;
}

export async function resumeAllPublishing(actor = "operator"): Promise<ContentOpsState> {
  const state = await readContentOpsState();
  const next: ContentOpsState = {
    ...state,
    publishingPaused: false,
    autoSchedulePaused: false,
    autoRepliesPaused: false,
    metricsRulesPaused: false,
    pauseReason: null,
    pausedAt: null,
    pausedBy: null,
  };
  await writeContentOpsState(next);
  await appendAuditEntry({
    action: "ops_resume",
    targetType: "ops",
    targetId: "global",
    actor,
    detail: "Publishing resumed",
  });
  return next;
}

export async function markDigestSent(): Promise<void> {
  const state = await readContentOpsState();
  await writeContentOpsState({ ...state, lastDigestAt: new Date().toISOString() });
}
