import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OotbAppId } from "../ootb-apps";

import { readWorkspace } from "./workspace-store";
import {
  DEFAULT_SCHEDULER_STATE,
  type HeartbeatLine,
  type SchedulerJob,
  type SchedulerState,
} from "./scheduler-types";

function schedulerPath(): string {
  return process.env.CURXOR_SCHEDULER_PATH ?? "/etc/curxor/scheduler/jobs.json";
}

async function readState(): Promise<SchedulerState> {
  try {
    const raw = await readFile(schedulerPath(), "utf8");
    const parsed = JSON.parse(raw) as SchedulerState;
    if (parsed.version !== 1 || !Array.isArray(parsed.jobs)) throw new Error("invalid");
    return parsed;
  } catch {
    return { ...DEFAULT_SCHEDULER_STATE, updatedAt: new Date().toISOString() };
  }
}

async function writeState(state: SchedulerState): Promise<void> {
  const filePath = schedulerPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o640 });
}

export async function getSchedulerState(): Promise<SchedulerState> {
  return readState();
}

export async function upsertSchedulerJob(job: Omit<SchedulerJob, "createdAt" | "lastRunAt" | "lastStatus" | "lastError"> & Partial<Pick<SchedulerJob, "lastRunAt" | "lastStatus" | "lastError">>): Promise<SchedulerState> {
  const state = await readState();
  const idx = state.jobs.findIndex((j) => j.id === job.id);
  const now = new Date().toISOString();
  const full: SchedulerJob = {
    lastRunAt: job.lastRunAt ?? null,
    lastStatus: job.lastStatus ?? null,
    lastError: job.lastError ?? null,
    createdAt: idx >= 0 ? state.jobs[idx]!.createdAt : now,
    ...job,
  };
  if (idx >= 0) state.jobs[idx] = full;
  else state.jobs.push(full);
  await writeState(state);
  return state;
}

export async function removeSchedulerJob(id: string): Promise<SchedulerState> {
  const state = await readState();
  state.jobs = state.jobs.filter((j) => j.id !== id);
  await writeState(state);
  return state;
}

export async function markJobRun(id: string, status: SchedulerJob["lastStatus"], error?: string): Promise<void> {
  const state = await readState();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  job.lastRunAt = new Date().toISOString();
  job.lastStatus = status;
  job.lastError = error ?? null;
  await writeState(state);
}

/** Parse HEARTBEAT.md sections into scheduler lines. */
export function parseHeartbeatMd(content: string): HeartbeatLine[] {
  const lines: HeartbeatLine[] = [];
  let currentSchedule = "0 */30 * * *";

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();
      if (/every\s+(\d+)\s+min/i.test(heading)) {
        const m = heading.match(/every\s+(\d+)\s+min/i);
        currentSchedule = `@every_${m![1]!}m`;
      } else if (/daily\s+at\s+(\d{1,2}):(\d{2})/i.test(heading)) {
        const m = heading.match(/daily\s+at\s+(\d{1,2}):(\d{2})/i);
        currentSchedule = `${m![2]} ${m![1]} * * *`;
      } else if (/hourly/i.test(heading)) {
        currentSchedule = "0 * * * *";
      }
      continue;
    }
    if (!line.startsWith("-")) continue;
    const item = line.slice(1).trim();
    if (item.startsWith("skill:")) {
      lines.push({
        schedule: currentSchedule,
        action: { kind: "skill", skillId: item.slice("skill:".length).trim() },
      });
    } else if (item.startsWith("message:")) {
      lines.push({
        schedule: currentSchedule,
        action: { kind: "message", text: item.slice("message:".length).trim() },
      });
    }
  }
  return lines;
}

export async function syncHeartbeatToJobs(appId: OotbAppId): Promise<SchedulerState> {
  const ws = await readWorkspace(appId);
  const parsed = parseHeartbeatMd(ws.app["HEARTBEAT.md"]);
  const state = await readState();

  for (const entry of parsed) {
    const id = `hb-${appId}-${entry.action.kind === "skill" ? entry.action.skillId : "msg"}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    const existing = state.jobs.find((j) => j.id === id);
    if (existing) {
      existing.schedule = entry.schedule;
      existing.enabled = true;
      if (entry.action.kind === "skill") {
        existing.kind = "skill";
        existing.skillId = entry.action.skillId;
        existing.message = undefined;
      } else {
        existing.kind = "message";
        existing.message = entry.action.text;
        existing.skillId = undefined;
      }
    } else {
      state.jobs.push({
        id,
        appId,
        kind: entry.action.kind === "skill" ? "skill" : "message",
        skillId: entry.action.kind === "skill" ? entry.action.skillId : undefined,
        message: entry.action.kind === "message" ? entry.action.text : undefined,
        schedule: entry.schedule,
        enabled: true,
        lastRunAt: null,
        lastStatus: null,
        lastError: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await writeState(state);
  return state;
}

/** Returns true if job is due now (within poll window). */
export function isJobDue(job: SchedulerJob, now: Date, pollSeconds: number): boolean {
  if (!job.enabled) return false;
  if (job.schedule.startsWith("@every_")) {
    const mins = Number.parseInt(job.schedule.replace("@every_", "").replace("m", ""), 10);
    if (!job.lastRunAt) return true;
    const last = new Date(job.lastRunAt).getTime();
    return now.getTime() - last >= mins * 60_000 - pollSeconds * 1000;
  }
  const parts = job.schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  const match =
    cronField(min, now.getMinutes()) &&
    cronField(hour, now.getHours()) &&
    cronField(dom, now.getDate()) &&
    cronField(mon, now.getMonth() + 1) &&
    cronField(dow, now.getDay());
  if (!match) return false;
  if (!job.lastRunAt) return true;
  const last = new Date(job.lastRunAt);
  return now.getTime() - last.getTime() > pollSeconds * 1000;
}

function cronField(expr: string, value: number): boolean {
  if (expr === "*") return true;
  if (expr.startsWith("*/")) {
    const step = Number.parseInt(expr.slice(2), 10);
    return value % step === 0;
  }
  return Number.parseInt(expr, 10) === value;
}

export async function listDueJobs(now = new Date()): Promise<SchedulerJob[]> {
  const state = await readState();
  return state.jobs.filter((j) => isJobDue(j, now, state.pollIntervalSeconds));
}
