import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SwarmGridCell } from "./swarm-fleet";
import type { SwarmWorkloadItem, SwarmWorkloadSource } from "./swarm-workload-types";

export type { SwarmWorkloadItem, SwarmWorkloadSource, SwarmWorkloadStatus } from "./swarm-workload-types";
export { SWARM_SOURCE_LABELS } from "./swarm-workload-types";

function queuePath(): string {
  const base = process.env.CURXOR_DEV_QA_DIR ?? path.join(process.cwd(), "scripts", "dev-qa");
  return path.join(base, "swarm-workload-queue.json");
}

async function readQueue(): Promise<SwarmWorkloadItem[]> {
  try {
    const raw = await readFile(queuePath(), "utf8");
    const parsed = JSON.parse(raw) as { items?: SwarmWorkloadItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: SwarmWorkloadItem[]): Promise<void> {
  const filePath = queuePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ items: items.slice(0, 100) }, null, 2)}\n`, "utf8");
}

export async function listSwarmWorkloads(limit = 25): Promise<SwarmWorkloadItem[]> {
  return (await readQueue()).slice(0, limit);
}

export async function enqueueSwarmWorkload(input: {
  source: SwarmWorkloadSource;
  title: string;
  detail?: string;
  targetCell?: SwarmGridCell;
  priority?: SwarmWorkloadItem["priority"];
}): Promise<SwarmWorkloadItem> {
  const items = await readQueue();
  const row: SwarmWorkloadItem = {
    id: `WL-${String(items.length + 1).padStart(4, "0")}`,
    source: input.source,
    title: input.title.trim(),
    detail: input.detail?.trim() ?? "",
    targetCell: input.targetCell ?? "B3",
    priority: input.priority ?? "normal",
    status: "pending",
    assignedUnitId: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  items.unshift(row);
  await writeQueue(items);
  return row;
}

export async function assignSwarmWorkload(
  workloadId: string,
  unitId: string,
): Promise<SwarmWorkloadItem | null> {
  const items = await readQueue();
  const idx = items.findIndex((w) => w.id === workloadId);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], status: "assigned", assignedUnitId: unitId };
  await writeQueue(items);
  return items[idx];
}

export async function completeSwarmWorkload(workloadId: string): Promise<SwarmWorkloadItem | null> {
  const items = await readQueue();
  const idx = items.findIndex((w) => w.id === workloadId);
  if (idx < 0) return null;
  items[idx] = {
    ...items[idx],
    status: "done",
    completedAt: new Date().toISOString(),
  };
  await writeQueue(items);
  return items[idx];
}

export async function seedSwarmDemoWorkloads(): Promise<SwarmWorkloadItem[]> {
  const existing = await readQueue();
  if (existing.some((w) => w.source === "my-capital")) return existing.slice(0, 5);

  const seeded = await Promise.all([
    enqueueSwarmWorkload({
      source: "my-capital",
      title: "Paper rule rebalance sweep",
      detail: "Capital Claw armed rule hit — route monitor Claw to grid C2",
      targetCell: "C2",
      priority: "high",
    }),
    enqueueSwarmWorkload({
      source: "my-work",
      title: "Outreach sequence batch",
      detail: "Work Claw handoff — 12 follow-ups queued for dispatch",
      targetCell: "B2",
      priority: "normal",
    }),
    enqueueSwarmWorkload({
      source: "my-content-creator",
      title: "Publish window fan-out",
      detail: "Creator Claw — stagger posts across channels",
      targetCell: "D3",
      priority: "normal",
    }),
  ]);

  return seeded;
}
