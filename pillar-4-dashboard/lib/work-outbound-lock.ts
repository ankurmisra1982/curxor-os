import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface OutboundWorkerLockRecord {
  pid: number;
  claimedAt: string;
  hostname: string;
}

const STALE_LOCK_MS = 5 * 60 * 1000;

export function outboundLockPath(): string {
  const explicit = process.env.CURXOR_WORK_OUTBOUND_LOCK?.trim();
  if (explicit) return explicit;
  const queuePath = process.env.CURXOR_WORK_QUEUE_PATH ?? "/etc/curxor/work-queue.json";
  return path.join(path.dirname(queuePath), "work-outbound.lock");
}

export async function readOutboundWorkerLock(): Promise<OutboundWorkerLockRecord | null> {
  try {
    const raw = await readFile(outboundLockPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<OutboundWorkerLockRecord>;
    if (typeof parsed.pid !== "number" || typeof parsed.claimedAt !== "string") return null;
    return {
      pid: parsed.pid,
      claimedAt: parsed.claimedAt,
      hostname: typeof parsed.hostname === "string" ? parsed.hostname : "unknown",
    };
  } catch {
    return null;
  }
}

function isLockStale(record: OutboundWorkerLockRecord): boolean {
  const age = Date.now() - Date.parse(record.claimedAt);
  return !Number.isFinite(age) || age > STALE_LOCK_MS;
}

export async function isOutboundWorkerLockHeld(): Promise<boolean> {
  const record = await readOutboundWorkerLock();
  if (!record) return false;
  if (isLockStale(record)) {
    await releaseOutboundWorkerLock().catch(() => undefined);
    return false;
  }
  return true;
}

export async function claimOutboundWorkerLock(
  pid = process.pid,
): Promise<{ ok: boolean; pid?: number; error?: string }> {
  const held = await readOutboundWorkerLock();
  if (held && !isLockStale(held) && held.pid !== pid) {
    return { ok: false, error: `Outbound worker lock held by pid ${held.pid}` };
  }
  const filePath = outboundLockPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const record: OutboundWorkerLockRecord = {
    pid,
    claimedAt: new Date().toISOString(),
    hostname: os.hostname(),
  };
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o640 });
  return { ok: true, pid };
}

export async function releaseOutboundWorkerLock(pid = process.pid): Promise<void> {
  const held = await readOutboundWorkerLock();
  if (!held) return;
  if (held.pid !== pid) return;
  await unlink(outboundLockPath()).catch(() => undefined);
}

export async function verifyOutboundWorkerCaller(workerPid: number): Promise<boolean> {
  const held = await readOutboundWorkerLock();
  if (!held || isLockStale(held)) return false;
  return held.pid === workerPid;
}

export async function touchOutboundWorkerLock(pid = process.pid): Promise<void> {
  const held = await readOutboundWorkerLock();
  if (!held || held.pid !== pid) return;
  await claimOutboundWorkerLock(pid);
}
